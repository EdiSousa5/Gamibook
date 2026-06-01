<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiChip from '@/components/ui/UiChip.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import { gerarExercicios } from '@/services/flowise.ts'
import { useAuthStore } from '@/stores/auth'
import {
    ChevronDownIcon,
    ClipboardDocumentIcon,
    ClipboardDocumentCheckIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    GlobeAltIcon,
    EyeSlashIcon,
    ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import {
    fetchBooks,
    fetchModulesByBook,
    fetchModules,
    updateModuleApproval,
    updateBookApproval,
    updateBookMinimumContent,
} from '@/services/books'
import UiModal from '@/components/ui/UiModal.vue'
import UiSearch from '@/components/ui/UiSearch.vue'
import {
    createExercise,
    deleteExercise,
    fetchExercisesByModule,
} from '@/services/exercises'
import { getAssetUrl } from '@/services/client'
import type { Book, Exercise, Module } from '@/types'
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
let exerciseSeed = 0

const authStore = useAuthStore()

const loggedUserId = localStorage.getItem('gb_user_id') ?? ''



const books = ref<Book[]>([])
const modules = ref<Module[]>([])
const selectedBookId = ref<number | null>(null)
const selectedModuleId = ref<number | null>(null)
const selectedModuleIds = ref<number[]>([])
const countPerModule = ref(5)
const approvedExercisesByModule = ref<Record<number, Exercise[]>>({})
const generatedExercises = ref<GeneratedExercise[]>([])
const rawFlowiseResponse = ref('')
const rawFlowiseRequest = ref('')
const copiedResponse = ref(false)
const copiedRequest = ref(false)

const copyToClipboard = async (text: string, which: 'response' | 'request') => {
    await navigator.clipboard.writeText(text)
    if (which === 'response') {
        copiedResponse.value = true
        window.setTimeout(() => { copiedResponse.value = false }, 2000)
    } else {
        copiedRequest.value = true
        window.setTimeout(() => { copiedRequest.value = false }, 2000)
    }
}

const toast = useToast()
const isLoadingData = ref(false)
const isGenerating = ref(false)
const elapsedSeconds = ref(0)
let elapsedTimer: number | null = null
const progressLabel = ref('')
const generationHalfTime = ref(20)
const approvingMap = ref<Record<string, boolean>>({})
const expandedModules = ref<Record<number, boolean>>({})
const statusFilter = ref<'all' | 'published' | 'ready' | 'incomplete'>('all')
const publisherFilter = ref<string>('all')
const bookSearch = ref('')
const showApprovalModal = ref(false)
const isApprovingBook = ref(false)

// Progresso simulado: curva exponencial que satura em ~95% enquanto aguarda resposta
const generationProgress = computed(() => {
    if (!isGenerating.value) return 0
    const t = elapsedSeconds.value
    const h = generationHalfTime.value
    return Math.min(95, Math.round(95 * (1 - Math.exp(-t / h))))
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
    { label: 'Publicados no site', value: 'published' },
    { label: 'Prontos a publicar', value: 'ready' },
    { label: 'Em desenvolvimento', value: 'incomplete' },
]

const filteredBooks = computed(() => {
    let list = books.value

    const q = bookSearch.value.toLowerCase().trim()
    if (q) list = list.filter(b => b.title?.toLowerCase().includes(q))

    if (statusFilter.value === 'published') {
        list = list.filter(b => b.is_approved)
    } else if (statusFilter.value === 'ready') {
        list = list.filter(b => b.has_minimum_content && !b.is_approved)
    } else if (statusFilter.value === 'incomplete') {
        list = list.filter(b => !b.has_minimum_content)
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
        const moduleTitle = moduleId
            ? moduleTitleById.get(moduleId) || `Módulo ${moduleId}`
            : 'Módulo desconhecido'
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

const setLocalModuleApproval = (moduleId: number, isApproved: boolean) => {
    modules.value = modules.value.map((moduleItem) =>
        moduleItem.modules_id === moduleId
            ? { ...moduleItem, minimum_exercises: isApproved }
            : moduleItem,
    )
}

const setLocalBookMinimumContent = (bookId: number, hasMinimumContent: boolean) => {
    books.value = books.value.map((book) =>
        book.book_id === bookId ? { ...book, has_minimum_content: hasMinimumContent } : book,
    )
}

const setLocalBookApproval = (bookId: number, isApproved: boolean) => {
    books.value = books.value.map((book) =>
        book.book_id === bookId ? { ...book, is_approved: isApproved } : book,
    )
}

const syncModuleApproval = async (moduleId: number, approvedCount: number) => {
    const isApproved = approvedCount >= APPROVAL_THRESHOLD
    try {
        await updateModuleApproval(moduleId, isApproved)
        setLocalModuleApproval(moduleId, isApproved)
        const moduleItem = modules.value.find((item) => item.modules_id === moduleId)
        if (moduleItem?.id_book) {
            await syncBookMinimumContent(moduleItem.id_book)
        }
    } catch (err) {
        console.error(err)
    }
}

const syncBookMinimumContent = async (bookId: number) => {
    try {
        const moduleList = await fetchModulesByBook(bookId)
        const hasModules = moduleList.length > 0
        const hasMinContent = hasModules && moduleList.every((item) => item.minimum_exercises === true)
        await updateBookMinimumContent(bookId, hasMinContent)
        setLocalBookMinimumContent(bookId, hasMinContent)
    } catch (err) {
        console.error(err)
    }
}

const handlePublishBook = () => {
    showApprovalModal.value = true
}

const handleConfirmPublish = async () => {
    if (!selectedBookId.value) return
    isApprovingBook.value = true
    try {
        await updateBookApproval(selectedBookId.value, true)
        setLocalBookApproval(selectedBookId.value, true)
        showApprovalModal.value = false
        toast.info('Livro publicado com sucesso.')
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível publicar o livro.')
    } finally {
        isApprovingBook.value = false
    }
}

const toggleModuleSelection = (moduleId: number) => {
    const isSelected = selectedModuleIds.value.includes(moduleId)
    if (isSelected) {
        selectedModuleIds.value = selectedModuleIds.value.filter((id) => id !== moduleId)
        if (selectedModuleId.value === moduleId) {
            selectedModuleId.value = selectedModuleIds.value[0] ?? null
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

const generateForModules = async (count: number, modulesToUse = selectedModules.value) => {
    const modulePayload = modulesToUse.map((moduleItem) => {
        return {
            id: moduleItem.modules_id,
            titulo: moduleItem.module_title || `Módulo ${moduleItem.modules_id}`,
            descricao: moduleItem.additional_description || '',
        }
    })

    const perguntasJaCriadas = modulesToUse.flatMap((moduleItem) => {
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

const handleGenerate = async () => {
    if (!selectedModules.value.length) {
        toast.error('Seleciona pelo menos um módulo primeiro.')
        return
    }
    if (countPerModule.value <= 0) {
        toast.error('Define uma quantidade maior que zero.')
        return
    }
    if (isOverMaxTotal.value) {
        toast.error(`O total pedido (${totalQuestions.value}) excede o máximo permitido (${MAX_TOTAL_QUESTIONS}).`)
        return
    }

    const fullModules = selectedModules.value.filter(
        (m) => (approvedExercisesByModule.value[m.modules_id] ?? []).length >= MAX_MODULE_EXERCISES,
    )
    const generatableModules = selectedModules.value.filter(
        (m) => (approvedExercisesByModule.value[m.modules_id] ?? []).length < MAX_MODULE_EXERCISES,
    )

    if (generatableModules.length === 0) {
        toast.error(`Todos os módulos selecionados já atingiram o limite de ${MAX_MODULE_EXERCISES} exercícios.`)
        return
    }

    if (fullModules.length > 0) {
        const names = fullModules.map((m) => m.module_title || `Módulo ${m.modules_id}`).join(', ')
        toast.warning(`Os seguintes módulos já estão no limite e serão ignorados: ${names}.`)
    }

    isGenerating.value = true
    elapsedSeconds.value = 0
    // halfTime: tempo (em segundos) para atingir 50% do progresso simulado
    generationHalfTime.value = Math.max(15, generatableModules.length * Math.min(countPerModule.value, maxPerModule.value) * 1.8)
    if (elapsedTimer) window.clearInterval(elapsedTimer)
    elapsedTimer = window.setInterval(() => {
        elapsedSeconds.value += 1
    }, 1000)
    progressLabel.value = ''
    rawFlowiseResponse.value = ''
    rawFlowiseRequest.value = ''

    try {
        progressLabel.value = `A gerar exercícios para ${generatableModules.length} módulo${generatableModules.length !== 1 ? 's' : ''}`
        const result = await generateForModules(Math.min(countPerModule.value, maxPerModule.value), generatableModules)
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
        toast.info('Exercício aprovado e guardado com sucesso.')
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível aprovar o exercício.')
    } finally {
        setApproving(exercise.localId, false)
    }
}

const handleReject = async (exercise: GeneratedExercise) => {
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

const handleRemoveApproved = async (exercise: Exercise) => {
    if (!exercise.exercise_id) return
    try {
        await deleteExercise(exercise.exercise_id)
        if (exercise.id_module) {
            const list = await refreshApprovedExercisesForModule(exercise.id_module)
            await syncModuleApproval(exercise.id_module, list.length)
        } else {
            await refreshApprovedExercises()
        }
        toast.info('Exercício removido com sucesso.')
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível remover o exercício.')
    }
}

const toggleModuleExpanded = (moduleId: number) => {
    expandedModules.value[moduleId] = !expandedModules.value[moduleId]
}

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
    rawFlowiseResponse.value = ''
    rawFlowiseRequest.value = ''
})

onMounted(async () => {
    await loadInitialData()
})
</script>

<template>
    <div class="exercise-generator-page">
        <header class="hero">
            <div class="hero-content">
                <h1 class="hero-title">Gerar Exercícios</h1>
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
                <UiCard class="workspace-panel step1-panel">
                    <div class="panel-header">
                        <div class="step-indicator">1</div>
                        <div class="header-text">
                            <h2>Escolhe um Livro</h2>
                            <p v-if="!selectedBookId" class="meta">Seleciona o livro onde queres trabalhar.</p>
                            <div v-else class="sbp-inline">
                                <div class="sbp-cover">
                                    <img v-if="selectedBook?.cover_img"
                                        :src="getAssetUrl(selectedBook.cover_img)"
                                        :alt="selectedBook?.title || ''" />
                                    <span v-else class="sbp-cover-placeholder">
                                        {{ selectedBook?.title?.[0]?.toUpperCase() || '?' }}
                                    </span>
                                </div>
                                <div class="sbp-text">
                                    <span class="sbp-name">{{ selectedBook?.title }}</span>
                                    <span class="sbp-meta">{{ selectedBook?.editora?.nome_editora || 'Sem editora' }}</span>
                                </div>
                                <button class="alterar-btn" @click="selectedBookId = null">Alterar</button>
                            </div>
                        </div>
                    </div>

                    <div v-if="!selectedBookId" class="panel-body">
                        <div class="book-list-filters">
                            <div class="filter-search">
                                <UiSearch :model-value="bookSearch" placeholder="Pesquisar livro..."
                                    @update="bookSearch = $event" />
                            </div>
                            <UiSelect :model-value="statusFilter" :options="statusOptions"
                                @update="statusFilter = $event as any" />
                            <UiSelect :model-value="publisherFilter" :options="publisherOptions"
                                @update="publisherFilter = $event as any" />
                        </div>

                        <div class="book-grid-wrapper">
                                <div class="book-cards-grid">
                                    <button v-for="book in filteredBooks" :key="book.book_id"
                                        class="book-card" type="button"
                                        @click="selectedBookId = book.book_id">
                                        <div class="book-card-cover">
                                            <img v-if="book.cover_img"
                                                :src="getAssetUrl(book.cover_img)"
                                                :alt="book.title || ''" />
                                            <span v-else class="book-card-cover-placeholder">
                                                {{ book.title?.[0]?.toUpperCase() || '?' }}
                                            </span>
                                        </div>
                                        <div class="book-card-info">
                                            <span class="book-card-title">{{ book.title }}</span>
                                            <span class="book-card-publisher">
                                                {{ book.editora?.nome_editora || 'Sem editora' }}
                                            </span>
                                            <div class="book-card-chips">
                                                <UiChip
                                                    :label="book.has_minimum_content ? 'Conteúdo completo' : 'Conteúdo em falta'"
                                                    :variant="book.has_minimum_content ? 'filled' : 'outline'" />
                                                <UiChip
                                                    :label="book.is_approved ? 'Publicado no site' : 'Não publicado'"
                                                    :variant="book.is_approved ? 'filled' : 'outline'" />
                                            </div>
                                        </div>
                                    </button>
                                    <p v-if="!filteredBooks.length" class="book-cards-empty">
                                        Nenhum livro encontrado com os filtros atuais.
                                    </p>
                                </div>

                                <div class="book-grid-legend">
                                    <p class="bgl-title">Etiquetas</p>
                                    <div class="bgl-row">
                                        <UiChip label="Conteúdo completo" variant="filled" />
                                        <span class="bgl-sep">/</span>
                                        <UiChip label="Conteúdo em falta" variant="outline" />
                                        <span class="bgl-desc">— todos os módulos têm exercícios suficientes ou não</span>
                                    </div>
                                    <div class="bgl-row">
                                        <UiChip label="Publicado no site" variant="filled" />
                                        <span class="bgl-sep">/</span>
                                        <UiChip label="Não publicado" variant="outline" />
                                        <span class="bgl-desc">— livro visível ou não para os utilizadores</span>
                                    </div>
                                </div>
                        </div>
                    </div>
                </UiCard>

                <Transition name="fade-slide">
                    <UiCard v-if="selectedBookId" class="workspace-panel">
                        <div class="panel-header">
                            <div class="step-indicator">2</div>
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

                <section v-if="approvedSummaries.length" class="approved-section">
                    <div class="workspace-section-header">
                        <h2>Exercícios Aprovados</h2>
                        <p class="meta">Lista de exercícios já aprovados em cada módulo selecionado.</p>
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

                <UiModal v-if="authStore.isAdmin" :visible="showApprovalModal" :close-on-overlay="true" @close="showApprovalModal = false">
                    <div class="approval-modal-card">
                        <div class="approval-modal-header">
                            <ExclamationTriangleIcon class="modal-warning-icon" aria-hidden="true" />
                            <h3>Publicar livro</h3>
                        </div>
                        <div class="approval-modal-body">
                            <p>Ao confirmar, <strong>{{ selectedBook?.title }}</strong> ficará imediatamente visível para todos os utilizadores na plataforma.</p>
                            <p class="modal-note">Esta ação pode ser revertida manualmente no Directus.</p>
                        </div>
                        <div class="approval-modal-actions">
                            <button class="modal-btn modal-btn--cancel" @click="showApprovalModal = false">
                                Cancelar
                            </button>
                            <button class="modal-btn modal-btn--confirm" :disabled="isApprovingBook" @click="handleConfirmPublish">
                                {{ isApprovingBook ? 'A publicar...' : 'Confirmar publicação' }}
                            </button>
                        </div>
                    </div>
                </UiModal>

                <div v-if="groupedSections.length" class="generated-section">
                    <div class="workspace-section-header">
                        <h2>Exercícios Gerados pela IA</h2>
                        <p class="meta">Revê, edita (se necessário) e aprova as melhores questões geradas.</p>
                    </div>
                    <GeneratedExercisesList :sections="groupedSections" :type-labels="typeLabels"
                        :approving-map="approvingMap" @approve="handleApprove" @reject="handleReject" />
                </div>

                <UiCard v-if="rawFlowiseResponse" class="raw-panel">
                    <div class="raw-panel-header">
                        <h3>Resposta Raw Flowise</h3>
                        <button class="copy-btn" @click="copyToClipboard(rawFlowiseResponse, 'response')">
                            <ClipboardDocumentCheckIcon v-if="copiedResponse" class="copy-icon" aria-hidden="true" />
                            <ClipboardDocumentIcon v-else class="copy-icon" aria-hidden="true" />
                            {{ copiedResponse ? 'Copiado!' : 'Copiar' }}
                        </button>
                    </div>
                    <pre class="raw-output">{{ rawFlowiseResponse }}</pre>
                </UiCard>

                <UiCard v-if="rawFlowiseRequest" class="raw-panel">
                    <div class="raw-panel-header">
                        <h3>Pedido Raw Flowise (Enviado)</h3>
                        <button class="copy-btn" @click="copyToClipboard(rawFlowiseRequest, 'request')">
                            <ClipboardDocumentCheckIcon v-if="copiedRequest" class="copy-icon" aria-hidden="true" />
                            <ClipboardDocumentIcon v-else class="copy-icon" aria-hidden="true" />
                            {{ copiedRequest ? 'Copiado!' : 'Copiar' }}
                        </button>
                    </div>
                    <pre class="raw-output">{{ rawFlowiseRequest }}</pre>
                </UiCard>
            </div>

            <div class="sidebar-column">
                <GeneratorConfigPanel :max-per-module="maxPerModule" :count-per-module="countPerModule"
                    :total-questions="totalQuestions" :is-over-max-total="isOverMaxTotal"
                    :selected-module-ids-length="selectedModuleIds.length"
                    :has-selected-book="!!selectedBookId" :is-generating="isGenerating"
                    :max-total-questions="MAX_TOTAL_QUESTIONS"
                    @update:count-per-module="countPerModule = Math.max(1, Number($event) || 1)"
                    @generate="handleGenerate" />

                <Transition name="fade-slide">
                    <div v-if="selectedBookId" class="status-sidebar">
                        <UiCard class="status-card">
                            <h4 class="status-card-title">Publicação do Livro</h4>
                            <div class="sc-row">
                                <div class="sc-row-info">
                                    <CheckCircleIcon v-if="selectedBook?.has_minimum_content"
                                        class="sc-icon sc-icon--ok" aria-hidden="true" />
                                    <ExclamationCircleIcon v-else
                                        class="sc-icon sc-icon--warn" aria-hidden="true" />
                                    <span class="sc-label">Conteúdo mínimo</span>
                                </div>
                                <UiChip
                                    :label="selectedBook?.has_minimum_content ? 'Completo' : 'Incompleto'"
                                    :variant="selectedBook?.has_minimum_content ? 'filled' : 'outline'" size="sm" />
                            </div>
                            <div class="sc-row">
                                <div class="sc-row-info">
                                    <GlobeAltIcon v-if="selectedBook?.is_approved"
                                        class="sc-icon sc-icon--ok" aria-hidden="true" />
                                    <EyeSlashIcon v-else
                                        class="sc-icon sc-icon--neutral" aria-hidden="true" />
                                    <span class="sc-label">No site</span>
                                </div>
                                <UiChip
                                    :label="selectedBook?.is_approved ? 'Publicado' : 'Não publicado'"
                                    :variant="selectedBook?.is_approved ? 'filled' : 'outline'" size="sm" />
                            </div>
                            <button
                                v-if="authStore.isAdmin && !selectedBook?.is_approved"
                                class="publish-btn publish-btn--full"
                                :class="{ 'is-disabled': !selectedBook?.has_minimum_content }"
                                :disabled="!selectedBook?.has_minimum_content"
                                @click="handlePublishBook">
                                Publicar livro
                            </button>
                        </UiCard>

                        <Transition name="fade-slide">
                            <UiCard v-if="approvedSummaries.length" class="status-card">
                                <h4 class="status-card-title">Módulos Selecionados</h4>
                                <div v-for="summary in approvedSummaries" :key="summary.moduleItem.modules_id"
                                    class="sc-module-item" :class="{ 'is-approved': summary.isApproved }">
                                    <div class="sc-module-name">
                                        {{ summary.moduleItem.module_title || 'Módulo' }}
                                    </div>
                                    <div class="sc-module-meta">
                                        <UiChip
                                            :label="summary.isApproved ? 'Aprovado' : 'Por aprovar'"
                                            :variant="summary.isApproved ? 'filled' : 'outline'" size="sm" />
                                        <span class="sc-module-count"
                                            :class="{ 'is-full': summary.approvedCount >= MAX_MODULE_EXERCISES }">
                                            {{ summary.approvedCount }}/{{ MAX_MODULE_EXERCISES }}
                                        </span>
                                    </div>
                                </div>
                            </UiCard>
                        </Transition>
                    </div>
                </Transition>
            </div>
        </div>

        <GeneratorLoadingOverlay :is-generating="isGenerating" :progress-label="progressLabel"
            :progress="generationProgress" />
    </div>
</template>

<style scoped>
.exercise-generator-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-500);
    color: var(--color-mirage-900);
}

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

.loading-banner {
    padding: var(--space-300) var(--space-400);
    border-radius: var(--radius-200);
    border: 2px solid var(--color-mirage-900);
    font-weight: 600;
    box-shadow: 3px 3px 0 var(--color-shadow);
    background: var(--color-wild-200);
}

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

.filters-bar {
    display: flex;
    gap: var(--space-300);
    margin-bottom: var(--space-400);
    flex-wrap: wrap;
}

.filter-item {
    min-width: 200px;
}

/* Livro selecionado inline no header */
.sbp-inline {
    display: flex;
    align-items: center;
    gap: var(--space-300);
    margin-top: 4px;
}

.sbp-cover {
    width: 32px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 2px 4px 4px 2px;
    overflow: hidden;
    border: 1.5px solid var(--color-mirage-800);
    background: var(--color-wild-300);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: -2px 0 4px rgba(0,0,0,0.08) inset, 2px 2px 5px rgba(0,0,0,0.12);
}

.sbp-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.sbp-cover-placeholder {
    font-size: 13px;
    font-weight: 800;
    color: var(--color-mirage-600);
}

.sbp-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.sbp-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-mirage-900);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sbp-meta {
    font-size: 12px;
    color: var(--color-mirage-500);
}

.alterar-btn {
    flex-shrink: 0;
    padding: var(--space-150) var(--space-300);
    border-radius: var(--radius-200);
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-200);
    color: var(--color-mirage-800);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 2px 2px 0 var(--color-shadow);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.alterar-btn:hover {
    transform: translateY(-1px);
    box-shadow: 3px 3px 0 var(--color-shadow);
}

.alterar-btn:active {
    transform: translate(2px, 2px);
    box-shadow: 0 0 0 var(--color-shadow);
}

/* Lista de livros */
.book-list-filters {
    display: flex;
    gap: var(--space-300);
    margin-bottom: var(--space-300);
    flex-wrap: wrap;
    align-items: flex-start;
}

.filter-search {
    flex: 1;
    min-width: 180px;
}

/* Grid de livros */
.book-grid-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-400);
}

.book-cards-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-300);
}

.book-card {
    display: flex;
    gap: var(--space-300);
    align-items: center;
    padding: var(--space-300);
    background: var(--color-wild-100);
    border: 2px solid var(--color-mirage-800);
    border-radius: 14px;
    box-shadow: 4px 4px 0 var(--color-shadow);
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.book-card:hover {
    transform: translateY(-2px);
    box-shadow: 4px 6px 0 var(--color-shadow);
    background: var(--color-wild-200);
}

.book-card:active {
    transform: translate(4px, 4px);
    box-shadow: 0 0 0 var(--color-shadow);
    background: var(--color-deep-100);
    border-color: var(--color-deep-600);
}

.book-card-cover {
    width: 52px;
    height: 72px;
    flex-shrink: 0;
    border-radius: 3px 6px 6px 3px;
    overflow: hidden;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-300);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: -4px 0 8px rgba(0,0,0,0.12) inset, 2px 2px 6px rgba(0,0,0,0.15);
    align-self: center;
}

.book-card-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.book-card-cover-placeholder {
    font-size: 20px;
    font-weight: 800;
    color: var(--color-mirage-600);
}

.book-card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-100);
}

.book-card-title {
    font-size: 13px;
    font-weight: 800;
    color: var(--color-mirage-900);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.book-card-publisher {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-mirage-500);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.book-card-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-100);
    margin-top: var(--space-100);
}

.book-card-chips :deep(.ui-chip) {
    font-size: 10px;
    padding: 1px var(--space-200);
    box-shadow: 2px 2px 0 var(--color-shadow);
}

.book-cards-empty {
    grid-column: 1 / -1;
    padding: var(--space-500);
    text-align: center;
    color: var(--color-mirage-400);
    font-size: 14px;
    margin: 0;
}

/* Legenda */
.book-grid-legend {
    display: flex;
    flex-direction: column;
    gap: var(--space-200);
    padding: var(--space-300) var(--space-400);
    border-radius: 12px;
    border: 2px solid var(--color-mirage-900);
    background: var(--color-wild-200);
    box-shadow: 3px 3px 0 var(--color-shadow);
}

.bgl-title {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-mirage-500);
}

.bgl-row {
    display: flex;
    align-items: center;
    gap: var(--space-200);
    flex-wrap: wrap;
}

.bgl-sep {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-mirage-400);
}

.bgl-desc {
    font-size: 12px;
    color: var(--color-mirage-600);
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

.text-button {
    background: none;
    border: none;
    color: var(--color-amber-600);
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    font-size: 14px;
}

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

/* Sidebar de estado */
.status-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-400);
}

.status-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-300);
}

.status-card-title {
    margin: 0 0 var(--space-100);
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-mirage-500);
}

.sc-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-200);
}

.sc-row-info {
    display: flex;
    align-items: center;
    gap: var(--space-200);
}

.sc-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

.sc-icon--ok { color: var(--color-teal-600); }
.sc-icon--warn { color: var(--color-amber-500); }
.sc-icon--neutral { color: var(--color-mirage-400); }

.sc-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-mirage-800);
}

.sc-module-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-100);
    padding: var(--space-200) var(--space-300);
    border-radius: var(--radius-200);
    border: 1.5px solid var(--color-mirage-200);
    background: var(--color-wild-100);
}

.sc-module-item.is-approved {
    border-color: var(--color-teal-400);
    background: #f0faf4;
}

.sc-module-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-mirage-900);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sc-module-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-200);
}

.sc-module-count {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-mirage-500);
    flex-shrink: 0;
}

.sc-module-count.is-full {
    color: var(--color-teal-600);
}

.publish-btn--full {
    width: 100%;
    margin-top: var(--space-100);
    justify-content: center;
}

.publish-btn {
    padding: var(--space-200) var(--space-400);
    border-radius: var(--radius-200);
    border: 2px solid var(--color-mirage-900);
    background: var(--color-deep-600);
    color: var(--color-wild-100);
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 3px 3px 0 var(--color-shadow);
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    white-space: nowrap;
}

.publish-btn:hover:not(.is-disabled) {
    transform: translateY(-2px);
    box-shadow: 5px 5px 0 var(--color-shadow);
}

.publish-btn:active:not(.is-disabled) {
    transform: translate(3px, 3px);
    box-shadow: 0 0 0 var(--color-shadow);
}

.publish-btn.is-disabled {
    background: var(--color-mirage-300);
    border-color: var(--color-mirage-400);
    color: var(--color-mirage-500);
    cursor: not-allowed;
    box-shadow: none;
}

.approval-modal-card {
    background: var(--color-wild-100);
    border: 2px solid var(--color-mirage-900);
    border-radius: var(--radius-400);
    box-shadow: 6px 6px 0 var(--color-shadow);
    padding: var(--space-600);
    max-width: 480px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-500);
}

.approval-modal-header {
    display: flex;
    align-items: center;
    gap: var(--space-300);
}

.approval-modal-header h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    color: var(--color-mirage-900);
}

.modal-warning-icon {
    width: 32px;
    height: 32px;
    color: var(--color-amber-500);
    flex-shrink: 0;
}

.approval-modal-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-200);
}

.approval-modal-body p {
    margin: 0;
    font-size: 15px;
    color: var(--color-mirage-700);
    line-height: 1.5;
}

.modal-note {
    font-size: 13px !important;
    color: var(--color-mirage-400) !important;
}

.approval-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-300);
}

.modal-btn {
    padding: var(--space-200) var(--space-500);
    border-radius: var(--radius-200);
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    border: 2px solid var(--color-mirage-900);
    box-shadow: 3px 3px 0 var(--color-shadow);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.modal-btn:hover {
    transform: translateY(-2px);
    box-shadow: 5px 5px 0 var(--color-shadow);
}

.modal-btn:active {
    transform: translate(3px, 3px);
    box-shadow: 0 0 0 var(--color-shadow);
}

.modal-btn--cancel {
    background: var(--color-wild-200);
    color: var(--color-mirage-800);
}

.modal-btn--confirm {
    background: var(--color-deep-600);
    color: var(--color-wild-100);
}

.modal-btn--confirm:disabled {
    background: var(--color-mirage-300);
    border-color: var(--color-mirage-400);
    color: var(--color-mirage-500);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

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

.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

@media (max-width: 1024px) {
    .workspace {
        grid-template-columns: 1fr;
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

.raw-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-300);
}

.raw-panel-header h3 {
    margin: 0;
    color: var(--color-wild-100);
}

.copy-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 8px;
    border: 2px solid var(--color-teal-400);
    background: transparent;
    color: var(--color-teal-300);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
}

.copy-btn:hover {
    background: var(--color-teal-400);
    color: var(--color-mirage-900);
}

.copy-icon {
    width: 16px;
    height: 16px;
    stroke-width: 2;
    flex-shrink: 0;
}
</style>
