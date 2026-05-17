<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiChip from '@/components/ui/UiChip.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import { gerarExercicios, gerarPerguntasDiarias } from '@/services/flowise.ts'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import {
    fetchBooks,
    fetchModulesByBook,
    fetchModules,
    updateModuleApproval,
    updateBookApproval,
} from '@/services/books'
import {
    createDailyExercise,
    createExercise,
    deleteDailyExercise,
    deleteExercise,
    fetchExercisesByModule,
    fetchDailyExercisesByBook,
    fetchExercisesCreatedTodayByUser,
} from '@/services/exercises'
import { getAssetUrl } from '@/services/client'
import type { Book, DailyExercise, Exercise, Module } from '@/types'
import ModuleGrid from '@/components/exercise-generator/ModuleGrid.vue'
import BookMockup from '@/components/ui/BookMockup.vue'
import ApprovedExercisesList from '@/components/exercise-generator/ApprovedExercisesList.vue'
import GeneratedExercisesList from '@/components/exercise-generator/GeneratedExercisesList.vue'
import GeneratorConfigPanel from '@/components/exercise-generator/GeneratorConfigPanel.vue'
import GeneratorLoadingOverlay from '@/components/exercise-generator/GeneratorLoadingOverlay.vue'
import ExerciseQuotaPanel from '@/components/exercise-generator/ExerciseQuotaPanel.vue'
import {
    normalizeExerciseList,
    normalizeModuleResults,
    getQuestionText,
    buildContent,
    resolveExerciseType,
    resolveModuleId,
    resolveModuleTitle,
    type ExerciseType
} from '@/utils/exerciseParser'
import { useToast } from '@/composables/useToast'


type GeneratedExercise = {
    localId: string
    questionText: string
    content: Record<string, unknown>
    exerciseType: ExerciseType
    moduleId?: number | null
    moduleTitle?: string | null
}

type Section = {
    moduleId: number | null
    moduleTitle: string
    types: Array<{ type: ExerciseType; items: GeneratedExercise[] }>
}

const APPROVAL_THRESHOLD = 5
const MAX_TOTAL_QUESTIONS = 40
const MAX_SELECTED_MODULES = 4
const MAX_MODULE_EXERCISES = 15
const MAX_DAILY_EXERCISES = 20
const DAILY_GENERATION_LIMIT = 50
let exerciseSeed = 0

const loggedUserId = localStorage.getItem('gb_user_id') ?? ''

const quotaUsed = ref(0)
const quotaLoading = ref(false)
const remainingQuota = computed(() => Math.max(0, DAILY_GENERATION_LIMIT - quotaUsed.value))

const refreshQuota = async () => {
    if (!loggedUserId) return
    quotaLoading.value = true
    try {
        quotaUsed.value = await fetchExercisesCreatedTodayByUser(loggedUserId)
    } catch {
        // quota display degrades silently
    } finally {
        quotaLoading.value = false
    }
}

const generationMode = ref<'module' | 'daily'>('module')
const route = useRoute()
const books = ref<Book[]>([])
const modules = ref<Module[]>([])
const selectedBookId = ref<number | null>(null)
const selectedModuleId = ref<number | null>(null)
const selectedModuleIds = ref<number[]>([])
const countPerModule = ref(5)
const approvedExercisesByModule = ref<Record<number, Exercise[]>>({})
const approvedDailyExercises = ref<DailyExercise[]>([])
const generatedExercises = ref<GeneratedExercise[]>([])
const rawFlowiseResponse = ref('')
const rawFlowiseRequest = ref('')

const toast = useToast()
const isLoadingData = ref(false)
const isGenerating = ref(false)
const elapsedSeconds = ref(0)
let elapsedTimer: number | null = null
const progressLabel = ref('')
const approvingMap = ref<Record<string, boolean>>({})
const expandedModules = ref<Record<number, boolean>>({})
const statusFilter = ref<'all' | 'approved' | 'unapproved'>('all')
const publisherFilter = ref<string>('all')

const questionsLabel = computed(() =>
    generationMode.value === 'module'
        ? 'Perguntas por Módulo'
        : 'Total de Perguntas Diárias',
)

const elapsedLabel = computed(() => {
    const minutes = Math.floor(elapsedSeconds.value / 60)
    const seconds = elapsedSeconds.value % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const typeLabels: Record<ExerciseType, string> = {
    'multiple-choice': 'Escolha múltipla',
    'true-false': 'Verdadeiro / Falso',
}

const uniquePublishers = computed(() => {
    const pubs = new Set<string>()
    books.value.forEach((b: any) => {
        if (b.editora?.nome_editora) pubs.add(b.editora.nome_editora)
    })
    return Array.from(pubs).sort()
})

const publisherOptions = computed(() => {
    const opts = [{ label: 'Todas as editoras', value: 'all' }]
    uniquePublishers.value.forEach(pub => {
        opts.push({ label: pub, value: pub })
    })
    return opts
})

const statusOptions = [
    { label: 'Todos os estados', value: 'all' },
    { label: 'Aprovados', value: 'approved' },
    { label: 'Por aprovar', value: 'unapproved' }
]

const filteredBooks = computed(() => {
    let list = books.value

    const searchParams = (route.query.q || route.query.search || '').toString().toLowerCase()
    if (searchParams) {
        list = list.filter(b => b.title?.toLowerCase().includes(searchParams))
    }

    if (statusFilter.value === 'approved') {
        list = list.filter(b => b.is_approved)
    } else if (statusFilter.value === 'unapproved') {
        list = list.filter(b => !b.is_approved)
    }

    if (publisherFilter.value !== 'all') {
        list = list.filter((b: any) => b.editora?.nome_editora === publisherFilter.value)
    }

    return list
})

const selectedModule = computed(() =>
    modules.value.find((moduleItem) => moduleItem.modules_id === selectedModuleId.value),
)

const selectedModules = computed(() =>
    filteredModules.value.filter((moduleItem) =>
        selectedModuleIds.value.includes(moduleItem.modules_id),
    ),
)

const selectedBook = computed(() => {
    if (!selectedBookId.value) return null
    return books.value.find((book) => book.book_id === selectedBookId.value) || null
})

const filteredModules = computed(() => {
    if (!selectedBookId.value) return modules.value
    return modules.value.filter((moduleItem) => moduleItem.id_book === selectedBookId.value)
})

const maxPerModule = computed(() => {
    const total = Math.max(1, selectedModuleIds.value.length)
    return Math.max(1, Math.floor(MAX_TOTAL_QUESTIONS / total))
})

const totalQuestions = computed(() => countPerModule.value * selectedModuleIds.value.length)
const isOverMaxTotal = computed(() => totalQuestions.value > MAX_TOTAL_QUESTIONS)

const approvedSummaries = computed(() =>
    selectedModules.value.map((moduleItem) => {
        const approved = approvedExercisesByModule.value[moduleItem.modules_id] || []
        const required = APPROVAL_THRESHOLD
        return {
            moduleItem,
            approved,
            approvedCount: approved.length,
            required,
            isApproved: approved.length >= required,
        }
    }),
)

const groupedSections = computed<Section[]>(() => {
    const grouped = new Map<number | null, Record<ExerciseType, GeneratedExercise[]>>()
    const typeOrder: ExerciseType[] = ['multiple-choice', 'true-false']

    generatedExercises.value.forEach((exercise) => {
        if (!exercise.exerciseType) return
        const moduleId = exercise.moduleId ?? null
        if (!grouped.has(moduleId)) {
            grouped.set(moduleId, {
                'multiple-choice': [],
                'true-false': [],
            })
        }
        grouped.get(moduleId)?.[exercise.exerciseType].push(exercise)
    })

    const moduleTitleById = new Map(
        modules.value.map((moduleItem) => [moduleItem.modules_id, moduleItem.module_title || 'Módulo']),
    )

    const order = selectedModuleIds.value.length
        ? selectedModuleIds.value
        : Array.from(grouped.keys()).filter((id): id is number => id !== null)

    const sections = Array.from(grouped.entries()).map(([moduleId, typeMap]) => {
        let moduleTitle = ''
        if (generationMode.value === 'daily') {
            moduleTitle = ''
        } else {
            moduleTitle = moduleId
                ? moduleTitleById.get(moduleId) || `Módulo ${moduleId}`
                : 'Módulo desconhecido'
        }
        const types = typeOrder
            .map((type) => ({ type, items: typeMap[type] }))
            .filter((entry) => entry.items.length > 0)
        return { moduleId, moduleTitle, types }
    })

    return sections
        .sort((a, b) => {
            const aIndex = a.moduleId ? order.indexOf(a.moduleId) : Number.MAX_SAFE_INTEGER
            const bIndex = b.moduleId ? order.indexOf(b.moduleId) : Number.MAX_SAFE_INTEGER
            return aIndex - bIndex
        })
        .filter((entry) => entry.types.length > 0)
})

const loadInitialData = async () => {
    isLoadingData.value = true
    try {
        const [moduleList, bookList] = await Promise.all([fetchModules(), fetchBooks()])
        modules.value = moduleList
        books.value = bookList
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível carregar os módulos.')
    } finally {
        isLoadingData.value = false
    }
}

const refreshApprovedExercises = async () => {
    if (!selectedModuleIds.value.length) {
        approvedExercisesByModule.value = {}
        return
    }

    try {
        const entries = await Promise.all(
            selectedModuleIds.value.map(async (moduleId) => [
                moduleId,
                await fetchExercisesByModule(moduleId),
            ] as const),
        )
        const nextMap: Record<number, Exercise[]> = {}
        entries.forEach(([moduleId, list]) => {
            nextMap[moduleId] = list
        })
        approvedExercisesByModule.value = nextMap
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível carregar os exercícios aprovados.')
    }
}

const refreshAllApprovedExercisesForBook = async () => {
    if (!filteredModules.value.length) return
    try {
        const entries = await Promise.all(
            filteredModules.value.map(async (m) => [
                m.modules_id,
                await fetchExercisesByModule(m.modules_id)
            ] as const)
        )
        const nextMap: Record<number, Exercise[]> = {}
        entries.forEach(([moduleId, list]) => {
            nextMap[moduleId] = list
        })
        approvedExercisesByModule.value = nextMap
    } catch (err) {
        console.error(err)
    }
}

const refreshApprovedExercisesForModule = async (moduleId: number) => {
    try {
        const list = await fetchExercisesByModule(moduleId)
        approvedExercisesByModule.value = {
            ...approvedExercisesByModule.value,
            [moduleId]: list,
        }
        return list
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível carregar os exercícios aprovados.')
        return []
    }
}

const refreshDailyExercises = async () => {
    if (!selectedBookId.value) return
    try {
        const list = await fetchDailyExercisesByBook(selectedBookId.value)
        approvedDailyExercises.value = list
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível carregar os exercícios diários.')
    }
}

const setLocalModuleApproval = (moduleId: number, isApproved: boolean) => {
    modules.value = modules.value.map((moduleItem) =>
        moduleItem.modules_id === moduleId
            ? { ...moduleItem, minimum_exercises: isApproved }
            : moduleItem,
    )
}

const syncModuleApproval = async (moduleId: number, approvedCount: number) => {
    const isApproved = approvedCount >= APPROVAL_THRESHOLD
    try {
        await updateModuleApproval(moduleId, isApproved)
        setLocalModuleApproval(moduleId, isApproved)
        const moduleItem = modules.value.find((item) => item.modules_id === moduleId)
        if (moduleItem?.id_book) {
            await syncBookApproval(moduleItem.id_book)
        }
    } catch (err) {
        console.error(err)
    }
}

const syncBookApproval = async (bookId: number) => {
    try {
        const moduleList = await fetchModulesByBook(bookId)
        const hasModules = moduleList.length > 0
        const isApproved = hasModules && moduleList.every((item) => item.minimum_exercises === true)
        await updateBookApproval(bookId, isApproved)
    } catch (err) {
        console.error(err)
    }
}

const toggleModuleSelection = (moduleId: number) => {
    const isSelected = selectedModuleIds.value.includes(moduleId)
    if (isSelected) {
        selectedModuleIds.value = selectedModuleIds.value.filter((id) => id !== moduleId)
        if (selectedModuleId.value === moduleId) {
            selectedModuleId.value = selectedModuleIds.value[0] ?? null
        }
        if (selectedModuleIds.value.length <= MAX_SELECTED_MODULES) {
        }
    } else {
        if (selectedModuleIds.value.length >= MAX_SELECTED_MODULES) {
            toast.warning(`Só podes selecionar até ${MAX_SELECTED_MODULES} módulos de cada vez.`)
            return
        }
        selectedModuleIds.value = [...selectedModuleIds.value, moduleId]
        selectedModuleId.value = moduleId
    }
}

const generateForModules = async (count: number) => {
    // Mantemos este array internamente apenas para gerar os Map lookups do response da IA
    const modulePayload = selectedModules.value.map((moduleItem) => {
        return {
            id: moduleItem.modules_id,
            titulo: moduleItem.module_title || `Módulo ${moduleItem.modules_id}`,
            descricao: moduleItem.additional_description || '',
        }
    })

    const perguntasJaCriadas = selectedModules.value.flatMap((moduleItem) => {
        const list = approvedExercisesByModule.value[moduleItem.modules_id] || []
        return list.map((item) => getQuestionText(item.content || item))
    }).join('\n')

    const requestPayload = {
        titulo_livro: selectedBook.value?.title || 'Ciências da Vida',
        numero_perguntas: count,
        perguntas_existentes: perguntasJaCriadas || 'Nenhuma pergunta existente.',
        modulos: modulePayload,
    }

    rawFlowiseRequest.value = JSON.stringify(requestPayload, null, 2)

    const response = await gerarExercicios(requestPayload)

    const rawResponse = response.raw
    const parsedResponse = response.parsed

    const lookupByTitle = new Map(
        modulePayload.map((item) => [item.titulo.trim().toLowerCase(), Number(item.id)]),
    )
    const lookupById = new Map(
        modulePayload.map((item) => [Number(item.id), item.titulo]),
    )

    const results = normalizeModuleResults(parsedResponse)
    const fallbackList = normalizeExerciseList(parsedResponse)
    const defaultModuleId = selectedModuleIds.value[0] ?? null
    const items: GeneratedExercise[] = []

    if (results.length) {
        results.forEach((result: any) => {
            const list = Array.isArray(result?.exercicios)
                ? result.exercicios
                : Array.isArray(result?.quiz)
                    ? result.quiz
                    : []
            list.forEach((item: any) => {
                const exerciseType = resolveExerciseType(item?.tipo || item?.type || result?.tipo)
                const questionText = getQuestionText(item)
                const moduleId = resolveModuleId(result, item, lookupByTitle) ?? defaultModuleId
                items.push({
                    localId: `gen-${Date.now()}-${exerciseSeed++}`,
                    questionText,
                    content: buildContent(item, exerciseType, questionText),
                    exerciseType,
                    moduleId,
                    moduleTitle: resolveModuleTitle(moduleId, lookupById),
                })
            })
        })
    } else {
        fallbackList.forEach((item: any) => {
            const exerciseType = resolveExerciseType(item?.tipo || item?.type)
            const questionText = getQuestionText(item)
            const moduleId = resolveModuleId({}, item, lookupByTitle) ?? defaultModuleId
            items.push({
                localId: `gen-${Date.now()}-${exerciseSeed++}`,
                questionText,
                content: buildContent(item, exerciseType, questionText),
                exerciseType,
                moduleId,
                moduleTitle: resolveModuleTitle(moduleId, lookupById),
            })
        })
    }

    return { items, receivedCount: items.length, rawResponse }
}

const generateForDaily = async (count: number) => {
    // 1. Modulos listados numa unica string separados por quebra de linha (\n)
    const modulosEmExtenso = filteredModules.value
        .map(m => m.module_title || `Módulo ${m.modules_id}`)
        .join('\n')

    // 2. Obtem APENAS os exercicios diarios (user_daily_exercise via approvedDailyExercises)
    const perguntasJaCriadas = approvedDailyExercises.value.map((item) =>
        getQuestionText((item.content ?? item) as Record<string, unknown>),
    ).join('\n')

    const requestPayload = {
        titulo_livro: selectedBook.value?.title || 'Livro',
        descricao_livro: selectedBook.value?.description || '',
        modulos_livro: modulosEmExtenso,
        numero_perguntas: count,
        perguntas_existentes: perguntasJaCriadas || 'Nenhuma pergunta existente. Podes começar do zero.',
    }

    rawFlowiseRequest.value = JSON.stringify(requestPayload, null, 2)

    const response = await gerarPerguntasDiarias(requestPayload)
    const rawResponse = response.raw
    const parsedResponse = response.parsed

    const results = normalizeModuleResults(parsedResponse)
    const fallbackList = normalizeExerciseList(parsedResponse)
    const items: GeneratedExercise[] = []

    if (results.length) {
        results.forEach((result: any) => {
            const list = Array.isArray(result?.exercicios) ? result.exercicios : (Array.isArray(result?.quiz) ? result.quiz : [])
            list.forEach((item: any) => {
                const exerciseType = resolveExerciseType(item?.tipo || item?.type || result?.tipo)
                const questionText = getQuestionText(item)
                items.push({
                    localId: `gen-${Date.now()}-${exerciseSeed++}`,
                    questionText,
                    content: buildContent(item, exerciseType, questionText),
                    exerciseType,
                    moduleId: null,
                    moduleTitle: '',
                })
            })
        })
    } else {
        fallbackList.forEach((item: any) => {
            const exerciseType = resolveExerciseType(item?.tipo || item?.type)
            const questionText = getQuestionText(item)
            items.push({
                localId: `gen-${Date.now()}-${exerciseSeed++}`,
                questionText,
                content: buildContent(item, exerciseType, questionText),
                exerciseType,
                moduleId: null,
                moduleTitle: '',
            })
        })
    }

    return { items, receivedCount: items.length, rawResponse }
}

const handleGenerate = async () => {
    if (generationMode.value === 'module' && !selectedModules.value.length) {
        toast.error('Seleciona pelo menos um módulo primeiro.')
        return
    }
    if (generationMode.value === 'daily' && !selectedBookId.value) {
        toast.error('Seleciona um livro primeiro.')
        return
    }
    if (countPerModule.value <= 0) {
        toast.error('Define uma quantidade maior que zero.')
        return
    }
    if (generationMode.value === 'module' && isOverMaxTotal.value) {
        toast.error(`O total pedido (${totalQuestions.value}) excede o máximo permitido (${MAX_TOTAL_QUESTIONS}).`)
        return
    }
    if (remainingQuota.value <= 0) {
        toast.error(`Atingiste o limite diário de ${DAILY_GENERATION_LIMIT} perguntas geradas. Tenta amanhã.`)
        return
    }
    isGenerating.value = true
    elapsedSeconds.value = 0
    if (elapsedTimer) window.clearInterval(elapsedTimer)
    elapsedTimer = window.setInterval(() => {
        elapsedSeconds.value += 1
    }, 1000)
    progressLabel.value = ''
    rawFlowiseResponse.value = ''
    rawFlowiseRequest.value = ''

    try {
        progressLabel.value = generationMode.value === 'module'
            ? `A gerar exercícios para ${selectedModules.value.length} módulos`
            : `A gerar perguntas diárias`
        const result = generationMode.value === 'module'
            ? await generateForModules(Math.min(countPerModule.value, maxPerModule.value))
            : await generateForDaily(Math.min(countPerModule.value, 15))
        rawFlowiseResponse.value = JSON.stringify(result.rawResponse ?? null, null, 2)
        if (!result.items.length) {
            toast.error('A IA não devolveu exercícios. Tenta novamente.')
            return
        }
        generatedExercises.value = [...generatedExercises.value, ...result.items]
        toast.info('Exercícios gerados. Revê e aprova os melhores.')
    } catch (err) {
        console.error(err)
        toast.error('Erro ao gerar exercícios.')
    } finally {
        isGenerating.value = false
        progressLabel.value = ''
        if (elapsedTimer) {
            window.clearInterval(elapsedTimer)
            elapsedTimer = null
        }
    }
}

const removeGenerated = (localId: string) => {
    generatedExercises.value = generatedExercises.value.filter((item) => item.localId !== localId)
}

const setApproving = (localId: string, value: boolean) => {
    approvingMap.value = { ...approvingMap.value, [localId]: value }
}

const handleApprove = async (exercise: GeneratedExercise) => {
    setApproving(exercise.localId, true)

    try {
        if (generationMode.value === 'module') {
            const targetModuleId = exercise.moduleId || selectedModule.value?.modules_id
            if (!targetModuleId) return
            const currentCount = (approvedExercisesByModule.value[targetModuleId] || []).length
            if (currentCount >= MAX_MODULE_EXERCISES) {
                toast.error(`Este módulo já atingiu o limite de ${MAX_MODULE_EXERCISES} exercícios.`)
                return
            }
            await createExercise({
                id_module: targetModuleId,
                type: exercise.exerciseType,
                content: exercise.content,
                created_by: loggedUserId || undefined,
            })
            removeGenerated(exercise.localId)
            const list = await refreshApprovedExercisesForModule(targetModuleId)
            await syncModuleApproval(targetModuleId, list.length)
        } else {
            if (!selectedBookId.value) return
            if (approvedDailyExercises.value.length >= MAX_DAILY_EXERCISES) {
                toast.error(`Este livro já atingiu o limite de ${MAX_DAILY_EXERCISES} perguntas diárias.`)
                return
            }
            await createDailyExercise({
                book_id: selectedBookId.value,
                type: exercise.exerciseType,
                content: exercise.content,
                created_by: loggedUserId || undefined,
            })
            removeGenerated(exercise.localId)
            await refreshDailyExercises()
        }
        await refreshQuota()
        toast.info('Exercício aprovado e guardado com sucesso.')
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível aprovar o exercício.')
    } finally {
        setApproving(exercise.localId, false)
    }
}

const handleReject = async (exercise: GeneratedExercise) => {
    const targetModuleId = exercise.moduleId || selectedModule.value?.modules_id
    if (!targetModuleId) return
    setApproving(exercise.localId, true)

    try {
        removeGenerated(exercise.localId)
        toast.info('Exercício rejeitado e removido da lista.')
    } catch (err) {
        console.error(err)
        toast.error('Ocorreu um erro ao rejeitar o exercício.')
    } finally {
        setApproving(exercise.localId, false)
    }
}

const handleRemoveApproved = async (exercise: Exercise | DailyExercise) => {
    const ex = exercise as Exercise
    if (!ex.exercise_id) return
    try {
        await deleteExercise(ex.exercise_id)
        if (ex.id_module) {
            const list = await refreshApprovedExercisesForModule(ex.id_module)
            await syncModuleApproval(ex.id_module, list.length)
        } else {
            await refreshApprovedExercises()
        }
        toast.info('Exercício removido com sucesso.')
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível remover o exercício.')
    }
}

const handleRemoveDaily = async (exercise: Exercise | DailyExercise) => {
    const id = (exercise as DailyExercise).daily_exercise_id
    if (!id) return
    try {
        await deleteDailyExercise(id)
        await refreshDailyExercises()
        toast.info('Exercício diário removido com sucesso.')
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível remover o exercício diário.')
    }
}

const toggleModuleExpanded = (moduleId: number) => {
    expandedModules.value[moduleId] = !expandedModules.value[moduleId]
}

watch(generationMode, () => {
    generatedExercises.value = []
    if (generationMode.value === 'daily' && selectedBookId.value) {
        refreshDailyExercises()
        refreshAllApprovedExercisesForBook()
    }
})

watch(selectedModuleId, async () => {
    generatedExercises.value = []
})

watch([selectedModuleIds, maxPerModule], async () => {
    if (countPerModule.value > maxPerModule.value) {
        countPerModule.value = maxPerModule.value
    }
    if (countPerModule.value < 1) countPerModule.value = 1
    await refreshApprovedExercises()
})

watch(selectedBookId, () => {
    selectedModuleId.value = null
    selectedModuleIds.value = []
    generatedExercises.value = []
    approvedExercisesByModule.value = {}
    approvedDailyExercises.value = []
    rawFlowiseResponse.value = ''
    rawFlowiseRequest.value = ''
    if (generationMode.value === 'daily') {
        refreshDailyExercises()
        refreshAllApprovedExercisesForBook()
    }
})

onMounted(async () => {
    await Promise.all([loadInitialData(), refreshQuota()])
})
</script>

<template>
    <div class="exercise-generator-page">
        <header class="hero">
            <div class="hero-content">
                <h1 class="hero-title">Gerar Exercícios </h1>
                <p class="hero-subtitle">
                    Acelera a criação de conteúdos. Escolhe um livro, seleciona os módulos e gera múltiplas questões
                    estruturadas de uma só vez. São necessários {{ APPROVAL_THRESHOLD }} exercícios aprovados por
                    módulo.
                </p>
            </div>
        </header>

        <div v-if="isLoadingData" class="loading-banner">A carregar os dados da plataforma...</div>

        <div class="workspace">
            <div class="main-column">
                <UiCard class="workspace-panel" :class="{ 'is-completed': selectedBookId }">
                    <div class="panel-header">
                        <div class="step-indicator">1</div>
                        <div class="header-text">
                            <h2>Escolhe um Livro</h2>
                            <p v-if="selectedBookId" class="meta-selected">
                                Livro selecionado: <strong>{{ selectedBook?.title }}</strong>
                                <button class="text-button" @click="selectedBookId = null">Alterar</button>
                            </p>
                            <p v-else class="meta">Começa por selecionar o livro onde queres trabalhar.</p>
                        </div>
                    </div>
                    <div class="panel-body" v-show="!selectedBookId">
                        <div class="filters-bar">
                            <div class="filter-item">
                                <UiSelect :model-value="statusFilter" :options="statusOptions"
                                    @update="statusFilter = $event as any" />
                            </div>
                            <div class="filter-item">
                                <UiSelect :model-value="publisherFilter" :options="publisherOptions"
                                    @update="publisherFilter = $event as any" />
                            </div>
                        </div>
                        <div class="books-grid">
                            <div v-for="book in filteredBooks" :key="book.book_id" class="book-item"
                                :class="{ 'is-selected': selectedBookId === book.book_id }"
                                @click="selectedBookId = book.book_id" tabindex="0" role="button">
                                <BookMockup :cover-url="book.cover_img ? getAssetUrl(book.cover_img) : null"
                                    :title="book.title || 'Livro'" size="sm" />
                                <div class="book-info">
                                    <h4 class="book-title">{{ book.title }}</h4>
                                    <UiChip :label="book.is_approved ? 'Aprovado' : 'Por aprovar'"
                                        :variant="book.is_approved ? 'filled' : 'outline'" size="sm" />
                                </div>
                            </div>
                            <p v-if="!filteredBooks.length" class="meta">Nenhum livro encontrado com os filtros atuais.
                            </p>
                        </div>
                    </div>
                </UiCard>

                <Transition name="fade-slide">
                    <UiCard v-if="selectedBookId" class="workspace-panel is-completed">
                        <div class="panel-header" style="margin-bottom: 0; border-bottom: none; padding-bottom: 0;">
                            <div class="step-indicator">2</div>
                            <div class="header-text mode-header-flex">
                                <div>
                                    <h2>Modo de Geração</h2>
                                    <p class="meta">Escolhe o tipo de exercícios que pretendes criar.</p>
                                </div>
                                <div class="mode-buttons">
                                    <UiButton :variant="generationMode === 'module' ? 'primary' : 'outline'"
                                        @click="generationMode = 'module'">Por Módulo</UiButton>
                                    <UiButton :variant="generationMode === 'daily' ? 'primary' : 'outline'"
                                        @click="generationMode = 'daily'">Perguntas Diárias</UiButton>
                                </div>
                            </div>
                        </div>
                    </UiCard>
                </Transition>

                <Transition name="fade-slide">
                    <UiCard v-if="selectedBookId && generationMode === 'module'" class="workspace-panel">
                        <div class="panel-header">
                            <div class="step-indicator">3</div>
                            <div class="header-text">
                                <h2>Seleciona os Módulos</h2>
                                <p class="meta">Marca até {{ MAX_SELECTED_MODULES }} módulos que precisam de novos
                                    exercícios.</p>
                            </div>
                        </div>
                        <div class="panel-body">
                            <ModuleGrid :modules="filteredModules" :selected-module-ids="selectedModuleIds"
                                :active-module-id="selectedModuleId" @toggle="toggleModuleSelection"
                                @active="selectedModuleId = $event" />
                        </div>
                    </UiCard>
                </Transition>

                <section v-if="generationMode === 'module' && approvedSummaries.length" class="approved-section">
                    <div class="workspace-section-header">
                        <h2>Estado das Aprovações</h2>
                        <p class="meta">Acompanha o progresso de cada módulo selecionado.</p>
                    </div>
                    <div class="approved-grid">
                        <UiCard v-for="summary in approvedSummaries" :key="summary.moduleItem.modules_id"
                            class="approved-module-card" :class="{ 'is-approved': summary.isApproved }">
                            <div class="card-summary" :role="summary.approvedCount > 0 ? 'button' : undefined"
                                :tabindex="summary.approvedCount > 0 ? '0' : undefined"
                                @click="summary.approvedCount > 0 && toggleModuleExpanded(summary.moduleItem.modules_id)">
                                <div class="module-info">
                                    <h4>{{ summary.moduleItem.module_title || 'Módulo' }}</h4>
                                    <UiChip :label="summary.isApproved ? 'Aprovado' : 'Por aprovar'"
                                        :variant="summary.isApproved ? 'filled' : 'outline'" />
                                    <UiChip
                                        :label="summary.approvedCount >= MAX_MODULE_EXERCISES ? 'Limite atingido' : `${summary.approvedCount}/${MAX_MODULE_EXERCISES} exercícios`"
                                        :variant="summary.approvedCount >= MAX_MODULE_EXERCISES ? 'filled' : 'outline'"
                                        size="sm" />
                                </div>
                                <div class="module-progress">
                                    <ChevronDownIcon v-if="summary.approvedCount > 0" class="accordion-icon"
                                        :class="{ 'is-rotated': expandedModules[summary.moduleItem.modules_id] }"
                                        aria-hidden="true" />
                                    <div v-else class="accordion-icon-placeholder"></div>
                                </div>
                            </div>
                            <div class="accordion-wrapper"
                                :class="{ 'is-open': expandedModules[summary.moduleItem.modules_id] }">
                                <div class="accordion-content">
                                    <div class="approved-list-container">
                                        <ApprovedExercisesList v-if="summary.approved.length"
                                            :exercises="summary.approved" :type-labels="typeLabels"
                                            :max-count="MAX_MODULE_EXERCISES"
                                            :min-required="APPROVAL_THRESHOLD"
                                            @remove="handleRemoveApproved" />
                                    </div>
                                </div>
                            </div>
                        </UiCard>
                    </div>
                </section>

                <section v-if="generationMode === 'daily' && selectedBookId" class="approved-section">
                    <div class="workspace-section-header">
                        <h2>Exercícios Diários Guardados</h2>
                        <p class="meta">Acompanha as perguntas diárias associadas ao livro selecionado.</p>
                    </div>
                    <div class="approved-grid">
                        <UiCard class="approved-module-card is-approved">
                            <div class="card-summary" :role="approvedDailyExercises.length > 0 ? 'button' : undefined"
                                :tabindex="approvedDailyExercises.length > 0 ? '0' : undefined"
                                @click="approvedDailyExercises.length > 0 && toggleModuleExpanded(-1)">
                                <div class="module-info">
                                    <h4>Perguntas Diárias</h4>
                                    <UiChip :label="approvedDailyExercises.length + ' Guardadas'" variant="filled" />
                                    <UiChip
                                        :label="approvedDailyExercises.length >= MAX_DAILY_EXERCISES ? 'Limite atingido' : `${approvedDailyExercises.length}/${MAX_DAILY_EXERCISES} perguntas`"
                                        :variant="approvedDailyExercises.length >= MAX_DAILY_EXERCISES ? 'filled' : 'outline'"
                                        size="sm" />
                                </div>
                                <div class="module-progress module-progress--icon-only">
                                    <ChevronDownIcon v-if="approvedDailyExercises.length > 0" class="accordion-icon"
                                        :class="{ 'is-rotated': expandedModules[-1] }" aria-hidden="true" />
                                    <div v-else class="accordion-icon-placeholder"></div>
                                </div>
                            </div>
                            <div class="accordion-wrapper" :class="{ 'is-open': expandedModules[-1] }">
                                <div class="accordion-content">
                                    <div class="approved-list-container">
                                        <ApprovedExercisesList v-if="approvedDailyExercises.length"
                                            :exercises="approvedDailyExercises" :type-labels="typeLabels"
                                            :max-count="MAX_DAILY_EXERCISES"
                                            @remove="handleRemoveDaily" />
                                    </div>
                                </div>
                            </div>
                        </UiCard>
                    </div>
                </section>

                <div v-if="groupedSections.length" class="generated-section">
                    <div class="workspace-section-header">
                        <h2>Exercícios Gerados pela IA</h2>
                        <p class="meta">Revê, edita (se necessário) e aprova as melhores questões geradas.</p>
                    </div>
                    <GeneratedExercisesList :sections="groupedSections" :type-labels="typeLabels"
                        :approving-map="approvingMap" @approve="handleApprove" @reject="handleReject" />
                </div>

                <UiCard v-if="rawFlowiseResponse" class="raw-panel">
                    <h3>Resposta Raw Flowise</h3>
                    <pre class="raw-output">{{ rawFlowiseResponse }}</pre>
                </UiCard>

                <UiCard v-if="rawFlowiseRequest" class="raw-panel">
                    <h3>Pedido Raw Flowise (Enviado)</h3>
                    <pre class="raw-output">{{ rawFlowiseRequest }}</pre>
                </UiCard>
            </div>

            <div class="sidebar-column">
                <GeneratorConfigPanel :generation-mode="generationMode" :questions-label="questionsLabel"
                    :max-per-module="maxPerModule" :count-per-module="countPerModule" :total-questions="totalQuestions"
                    :is-over-max-total="isOverMaxTotal" :selected-module-ids-length="selectedModuleIds.length"
                    :has-selected-book="!!selectedBookId" :is-generating="isGenerating"
                    :max-total-questions="MAX_TOTAL_QUESTIONS"
                    @update:count-per-module="countPerModule = Math.max(1, Number($event) || 1)"
                    @generate="handleGenerate" />
                <ExerciseQuotaPanel :used="quotaUsed" :limit="DAILY_GENERATION_LIMIT" :is-loading="quotaLoading" />
            </div>
        </div>

        <GeneratorLoadingOverlay :is-generating="isGenerating" :progress-label="progressLabel"
            :elapsed-label="elapsedLabel" />
    </div>
</template>

<style scoped>
.exercise-generator-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-500);
    color: var(--color-mirage-900);
}

/* Hero Section */
.hero {
    display: flex;
    align-items: center;
    gap: var(--space-600);
    padding: var(--space-600);
    border-radius: var(--radius-400);
    background: var(--color-wild-100);
    color: var(--color-mirage-900);
    border: 2px solid var(--color-mirage-900);
    box-shadow: 6px 6px 0 var(--color-shadow);
}

.hero-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-300);
    max-width: 800px;
}

.hero-title {
    font-size: 36px;
    margin: 0;
    line-height: 1.1;
    color: var(--color-mirage-900);
    font-family: var(--font-display);
}

.hero-subtitle {
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
    color: var(--color-mirage-600);
}

/* Loading banner */
.loading-banner {
    padding: var(--space-300) var(--space-400);
    border-radius: var(--radius-200);
    border: 2px solid var(--color-mirage-900);
    font-weight: 600;
    box-shadow: 3px 3px 0 var(--color-shadow);
    background: var(--color-wild-200);
}

/* Workspace */
.workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: var(--space-500);
    align-items: start;
}

.sidebar-column {
    display: flex;
    flex-direction: column;
    gap: var(--space-500);
}

.main-column {
    display: flex;
    flex-direction: column;
    gap: var(--space-500);
}

.workspace-panel {
    display: flex;
    flex-direction: column;
}

.workspace-panel.is-completed {
    border-color: var(--color-deep-400);
}

.panel-header {
    display: flex;
    align-items: center;
    gap: var(--space-300);
    padding-bottom: var(--space-300);
    border-bottom: 2px dashed var(--color-mirage-200);
    margin-bottom: var(--space-400);
}

.workspace-panel.is-completed .panel-header {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.step-indicator {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: var(--color-deep-600);
    color: var(--color-wild-100);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 18px;
    border: 2px solid var(--color-mirage-900);
    box-shadow: 2px 2px 0 var(--color-shadow);
    flex-shrink: 0;
}

.mode-header-flex {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    flex-wrap: wrap;
    gap: var(--space-300);
}

.mode-buttons {
    display: flex;
    gap: var(--space-200);
}

/* Book Grid & Filters */
.filters-bar {
    display: flex;
    gap: var(--space-300);
    margin-bottom: var(--space-400);
    flex-wrap: wrap;
}

.filter-item {
    min-width: 200px;
}

.books-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: var(--space-500);
    max-height: 480px;
    overflow-y: auto;
    padding: var(--space-200);
    scrollbar-width: thin;
}

.book-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-300);
    padding: var(--space-300);
    border-radius: 16px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
    text-align: center;
}

.book-item:hover {
    background: var(--color-wild-200);
    transform: translateY(-6px);
}

.book-item.is-selected {
    background: var(--color-wild-200);
    border-color: var(--color-deep-600);
    box-shadow: 4px 4px 0 var(--color-shadow);
    transform: translateY(-4px);
}

.book-info {
    display: grid;
    gap: 6px;
    place-items: center;
}

.book-title {
    margin: 0;
    font-size: 13px;
    font-weight: 800;
    color: var(--color-mirage-800);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.3;
}

.header-text h2 {
    margin: 0;
    font-size: 22px;
}

.header-text .meta {
    margin: 4px 0 0;
    color: var(--color-mirage-500);
    font-size: 14px;
}

.header-text .meta-selected {
    margin: 4px 0 0;
    font-size: 15px;
    color: var(--color-deep-700);
}

.text-button {
    background: none;
    border: none;
    color: var(--color-amber-600);
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;
    padding: 0 0 0 8px;
    font-size: 14px;
}

.header-actions {
    margin-left: auto;
    display: flex;
    gap: var(--space-200);
}

/* Sections */
.workspace-section-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-100);
    margin-bottom: var(--space-400);
    margin-top: var(--space-200);
}

.workspace-section-header h2 {
    margin: 0;
    font-size: 22px;
    color: var(--color-mirage-900);
}

.workspace-section-header .meta {
    margin: 0;
    color: var(--color-mirage-600);
    font-size: 14px;
}

.approved-grid {
    display: grid;
    gap: var(--space-500);
}

.approved-module-card {
    padding: 0 !important;
    overflow: hidden;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.approved-module-card.is-approved {
    border-color: var(--color-teal-500);
}

.card-summary {
    padding: var(--space-400);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-400);
    background: var(--color-wild-100);
    transition: background 0.2s ease;
}

.card-summary[role="button"] {
    cursor: pointer;
}

.card-summary[role="button"]:hover {
    background: var(--color-wild-200);
}

.approved-module-card.is-approved .card-summary {
    background: #f0faf4;
}

.approved-module-card.is-approved .card-summary[role="button"]:hover {
    background: #e6f5eb;
}

.module-info {
    display: flex;
    align-items: center;
    gap: var(--space-300);
}

.module-info h4 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--color-mirage-900);
}

.module-progress {
    display: flex;
    align-items: center;
    gap: var(--space-300);
    flex: 1;
    max-width: 250px;
    justify-content: flex-end;
}

.module-progress--icon-only {
    flex: unset;
    max-width: unset;
}

.accordion-icon {
    width: 20px;
    height: 20px;
    color: var(--color-mirage-500);
    flex-shrink: 0;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.accordion-icon-placeholder {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
}

.accordion-icon.is-rotated {
    transform: rotate(180deg);
}

.accordion-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--color-wild-100);
}

.accordion-wrapper.is-open {
    grid-template-rows: 1fr;
}

.accordion-content {
    overflow: hidden;
    min-height: 0;
}

.approved-list-container {
    padding: var(--space-400);
    border-top: 1px solid var(--color-mirage-200);
}

/* Raw Panel */
.raw-panel {
    background: var(--color-mirage-900);
    color: var(--color-wild-100);
}

.raw-panel h3 {
    margin: 0 0 var(--space-300);
    color: var(--color-wild-100);
}

.raw-output {
    margin: 0;
    font-family: monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 400px;
    overflow: auto;
    color: var(--color-teal-200);
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* Responsive */
@media (max-width: 1024px) {
    .workspace {
        grid-template-columns: 1fr;
    }

    .sidebar-column .sticky {
        position: static;
    }

    .card-summary {
        flex-direction: column;
        align-items: flex-start;
    }

    .module-progress {
        width: 100%;
        max-width: none;
    }
}

@media (max-width: 768px) {
    .hero {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>