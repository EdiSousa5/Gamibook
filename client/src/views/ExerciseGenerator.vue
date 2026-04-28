<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'
import UiChip from '@/components/ui/UiChip.vue'
import UiInput from '@/components/ui/UiInput.vue'
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
    fetchApprovedExercisesByModule,
    fetchDailyExercisesByBook,
    fetchExerciseExamplesByModule,
} from '@/services/exercises'
import type { Book, DailyExercise, Exercise, ExerciseExample, Module } from '@/types'
import BookGrid from '@/components/exercise-generator/BookGrid.vue'
import ModuleGrid from '@/components/exercise-generator/ModuleGrid.vue'
import ApprovedExercisesList from '@/components/exercise-generator/ApprovedExercisesList.vue'
import GeneratedExercisesList from '@/components/exercise-generator/GeneratedExercisesList.vue'
import GeneratorConfigPanel from '@/components/exercise-generator/GeneratorConfigPanel.vue'
import GeneratorLoadingOverlay from '@/components/exercise-generator/GeneratorLoadingOverlay.vue'
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


type GeneratedExercise = {
    localId: string
    questionText: string
    content: Record<string, any>
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
let exerciseSeed = 0

const generationMode = ref<'module' | 'daily'>('module')
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

const isLoadingData = ref(false)
const isGenerating = ref(false)
const elapsedSeconds = ref(0)
let elapsedTimer: number | null = null
const error = ref('')
const info = ref('')
const warning = ref('')
const progressLabel = ref('')
const approvingMap = ref<Record<string, boolean>>({})
const expandedModules = ref<Record<number, boolean>>({})

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
    'fill-blanks': 'Preencher lacunas',
    'ordering': 'Ordenar',
}

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
                'fill-blanks': [],
                'ordering': [],
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
    error.value = ''
    try {
        const [moduleList, bookList] = await Promise.all([fetchModules(), fetchBooks()])
        modules.value = moduleList
        books.value = bookList
    } catch (err) {
        console.error(err)
        error.value = 'Não foi possível carregar os módulos.'
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
                await fetchApprovedExercisesByModule(moduleId),
            ] as const),
        )
        const nextMap: Record<number, Exercise[]> = {}
        entries.forEach(([moduleId, list]) => {
            nextMap[moduleId] = list
        })
        approvedExercisesByModule.value = nextMap
    } catch (err) {
        console.error(err)
        error.value = 'Não foi possível carregar os exercícios aprovados.'
    }
}

const refreshAllApprovedExercisesForBook = async () => {
    if (!filteredModules.value.length) return
    try {
        const entries = await Promise.all(
            filteredModules.value.map(async (m) => [
                m.modules_id,
                await fetchApprovedExercisesByModule(m.modules_id)
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
        const list = await fetchApprovedExercisesByModule(moduleId)
        approvedExercisesByModule.value = {
            ...approvedExercisesByModule.value,
            [moduleId]: list,
        }
        return list
    } catch (err) {
        console.error(err)
        error.value = 'Não foi possível carregar os exercícios aprovados.'
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
        error.value = 'Não foi possível carregar os exercícios diários.'
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
            warning.value = ''
        }
    } else {
        if (selectedModuleIds.value.length >= MAX_SELECTED_MODULES) {
            warning.value = `Só podes selecionar até ${MAX_SELECTED_MODULES} módulos de cada vez.`
            return
        }
        selectedModuleIds.value = [...selectedModuleIds.value, moduleId]
        selectedModuleId.value = moduleId
        warning.value = ''
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

    const rawResponse = (response as any)?.raw ?? response
    const parsedResponse = (response as any)?.parsed ?? response

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
    const perguntasJaCriadas = approvedDailyExercises.value.map((item: any) => {
        return getQuestionText(item.content || item)
    }).join('\n')

    const requestPayload = {
        titulo_livro: selectedBook.value?.title || 'Livro',
        descricao_livro: selectedBook.value?.description || '',
        modulos_livro: modulosEmExtenso,
        numero_perguntas: count,
        perguntas_existentes: perguntasJaCriadas || 'Nenhuma pergunta existente. Podes começar do zero.',
    }

    rawFlowiseRequest.value = JSON.stringify(requestPayload, null, 2)

    const response = await gerarPerguntasDiarias(requestPayload)
    const rawResponse = (response as any)?.raw ?? response
    const parsedResponse = (response as any)?.parsed ?? response

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
        error.value = 'Seleciona pelo menos um módulo primeiro.'
        return
    }
    if (generationMode.value === 'daily' && !selectedBookId.value) {
        error.value = 'Seleciona um livro primeiro.'
        return
    }
    if (countPerModule.value <= 0) {
        error.value = 'Define uma quantidade maior que zero.'
        return
    }
    if (generationMode.value === 'module' && isOverMaxTotal.value) {
        error.value = `O total pedido (${totalQuestions.value}) excede o máximo permitido (${MAX_TOTAL_QUESTIONS}).`
        return
    }
    isGenerating.value = true
    elapsedSeconds.value = 0
    if (elapsedTimer) window.clearInterval(elapsedTimer)
    elapsedTimer = window.setInterval(() => {
        elapsedSeconds.value += 1
    }, 1000)
    error.value = ''
    info.value = ''
    warning.value = ''
    progressLabel.value = ''
    rawFlowiseResponse.value = ''
    rawFlowiseRequest.value = ''

    try {
        let result: any
        if (generationMode.value === 'module') {
            progressLabel.value = `A gerar exercícios para ${selectedModules.value.length} módulos`
            result = await generateForModules(Math.min(countPerModule.value, maxPerModule.value))
        } else {
            progressLabel.value = `A gerar perguntas diárias`
            result = await generateForDaily(Math.min(countPerModule.value, 15))
        }
        rawFlowiseResponse.value = JSON.stringify(result.rawResponse ?? null, null, 2)
        if (!result.items.length) {
            error.value = 'A IA não devolveu exercícios. Tenta novamente.'
            return
        }
        generatedExercises.value = [...generatedExercises.value, ...result.items]
        info.value = 'Exercícios gerados. Revê e aprova os melhores.'
    } catch (err) {
        console.error(err)
        error.value = 'Erro ao gerar exercícios.'
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
    error.value = ''
    info.value = ''

    try {
        if (generationMode.value === 'module') {
            const targetModuleId = exercise.moduleId || selectedModule.value?.modules_id
            if (!targetModuleId) return
            await createExercise({
                id_module: targetModuleId,
                type: exercise.exerciseType,
                content: exercise.content,
            })
            removeGenerated(exercise.localId)
            const list = await refreshApprovedExercisesForModule(targetModuleId)
            await syncModuleApproval(targetModuleId, list.length)
        } else {
            if (!selectedBookId.value) return
            await createDailyExercise({
                book_id: selectedBookId.value,
                type: exercise.exerciseType,
                content: exercise.content,
            })
            removeGenerated(exercise.localId)
            await refreshDailyExercises()
        }
        info.value = 'Exercício aprovado e guardado com sucesso.'
    } catch (err) {
        console.error(err)
        error.value = 'Não foi possível aprovar o exercício.'
    } finally {
        setApproving(exercise.localId, false)
    }
}

const handleReject = async (exercise: GeneratedExercise) => {
    const targetModuleId = exercise.moduleId || selectedModule.value?.modules_id
    if (!targetModuleId) return
    setApproving(exercise.localId, true)
    error.value = ''
    info.value = ''

    try {
        removeGenerated(exercise.localId)
        info.value = 'Exercício rejeitado e removido da lista.'
    } catch (err) {
        console.error(err)
        error.value = 'Ocorreu um erro ao rejeitar o exercício.'
    } finally {
        setApproving(exercise.localId, false)
    }
}

const handleRemoveApproved = async (exercise: Exercise) => {
    if (!exercise.exercise_id) return
    error.value = ''
    info.value = ''
    try {
        await deleteExercise(exercise.exercise_id)
        if (exercise.id_module) {
            const list = await refreshApprovedExercisesForModule(exercise.id_module)
            await syncModuleApproval(exercise.id_module, list.length)
        } else {
            await refreshApprovedExercises()
        }
        info.value = 'Exercício removido com sucesso.'
    } catch (err) {
        console.error(err)
        error.value = 'Não foi possível remover o exercício.'
    }
}

const handleRemoveDaily = async (exercise: any) => {
    const id = exercise.daily_exercise_id || exercise.exercise_id
    if (!id) return
    error.value = ''
    info.value = ''
    try {
        await deleteDailyExercise(id)
        await refreshDailyExercises()
        info.value = 'Exercício diário removido com sucesso.'
    } catch (err) {
        console.error(err)
        error.value = 'Não foi possível remover o exercício diário.'
    }
}

const toggleModuleExpanded = (moduleId: number) => {
    expandedModules.value[moduleId] = !expandedModules.value[moduleId]
}

watch(generationMode, () => {
    generatedExercises.value = []
    error.value = ''
    info.value = ''
    warning.value = ''
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
    warning.value = ''
    if (generationMode.value === 'daily') {
        refreshDailyExercises()
        refreshAllApprovedExercisesForBook()
    }
})

onMounted(async () => {
    await loadInitialData()
})
</script>

<template>
    <div class="exercise-generator-page">
        <header class="hero">
            <div class="hero-content">
                <h1 class="hero-title">Gerador de Exercícios</h1>
                <p class="hero-subtitle">
                    Acelera a criação de conteúdos. Escolhe um livro, seleciona os módulos e gera múltiplas questões
                    estruturadas de uma só vez. São necessários {{ APPROVAL_THRESHOLD }} exercícios aprovados por
                    módulo.
                </p>
            </div>
        </header>

        <div class="status-stack" v-if="isLoadingData || error || warning || info">
            <div v-if="isLoadingData" class="alert alert-loading">A carregar os dados da plataforma...</div>
            <div v-if="error" class="alert alert-error">{{ error }}</div>
            <div v-if="warning" class="alert alert-warning">{{ warning }}</div>
            <div v-if="info" class="alert alert-info">{{ info }}</div>
        </div>

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
                        <BookGrid :books="books" :selected-book-id="selectedBookId" @select="selectedBookId = $event" />
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
                                </div>
                                <div class="module-progress">
                                    <div class="progress-bar-bg">
                                        <div class="progress-bar-fill"
                                            :style="{ width: Math.min(100, (summary.approvedCount / summary.required) * 100) + '%' }">
                                        </div>
                                    </div>
                                    <p class="progress-text">
                                        <strong>{{ summary.approvedCount }} / {{ summary.required }}</strong>
                                    </p>
                                    <ChevronDownIcon v-if="summary.approvedCount > 0" class="accordion-icon"
                                        :class="{ 'is-rotated': expandedModules[summary.moduleItem.modules_id] }" aria-hidden="true" />
                                    <div v-else class="accordion-icon-placeholder"></div>
                                </div>
                            </div>
                            <div class="accordion-wrapper"
                                :class="{ 'is-open': expandedModules[summary.moduleItem.modules_id] }">
                                <div class="accordion-content">
                                    <div class="approved-list-container">
                                        <ApprovedExercisesList v-if="summary.approved.length"
                                            :exercises="summary.approved" :type-labels="typeLabels"
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
                                </div>
                                <div class="module-progress">
                                    <ChevronDownIcon v-if="approvedDailyExercises.length > 0" class="accordion-icon"
                                        :class="{ 'is-rotated': expandedModules[-1] }" aria-hidden="true" />
                                    <div v-else class="accordion-icon-placeholder"></div>
                                </div>
                            </div>
                            <div class="accordion-wrapper" :class="{ 'is-open': expandedModules[-1] }">
                                <div class="accordion-content">
                                    <div class="approved-list-container">
                                        <ApprovedExercisesList v-if="approvedDailyExercises.length"
                                            :exercises="(approvedDailyExercises as any)" :type-labels="typeLabels"
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

/* Status Stack */
.status-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-200);
}

.alert {
    padding: var(--space-300) var(--space-400);
    border-radius: var(--radius-200);
    border: 2px solid var(--color-mirage-900);
    font-weight: 600;
    box-shadow: 3px 3px 0 var(--color-shadow);
}

.alert-loading {
    background: var(--color-wild-200);
}

.alert-error {
    background: #fee2e2;
    color: #991b1b;
}

.alert-warning {
    background: #fef3c7;
    color: #92400e;
}

.alert-info {
    background: var(--color-deep-100);
    color: var(--color-deep-800);
}

/* Workspace */
.workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: var(--space-500);
    align-items: start;
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

.progress-bar-bg {
    flex: 1;
    height: 8px;
    background: var(--color-mirage-100);
    border-radius: var(--radius-full);
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    background: var(--color-deep-500);
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.approved-module-card.is-approved .progress-bar-fill {
    background: var(--color-teal-500);
}

.progress-text {
    margin: 0;
    font-size: 14px;
    color: var(--color-mirage-700);
    min-width: 48px;
    text-align: right;
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