<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'
import UiChip from '@/components/ui/UiChip.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { gerarExercicios } from '@/services/flowise'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import {
    createExercise,
    deleteExercise,
    fetchApprovedExercisesByModule,
    fetchExerciseExamplesByModule,
    fetchBooks,
    fetchModulesByBook,
    fetchModules,
    updateModuleApproval,
    updateBookApproval,
    type ExerciseExample,
    type Book,
    type Exercise,
    type Module,
} from '@/services/directus'
import BookGrid from '@/components/exercise-generator/BookGrid.vue'
import ModuleGrid from '@/components/exercise-generator/ModuleGrid.vue'
import ApprovedExercisesList from '@/components/exercise-generator/ApprovedExercisesList.vue'
import GeneratedExercisesList from '@/components/exercise-generator/GeneratedExercisesList.vue'

type ExerciseType = 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'

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
const MAX_EXAMPLES_TOTAL = 12
const MAX_SELECTED_MODULES = 4
let exerciseSeed = 0

const books = ref<Book[]>([])
const modules = ref<Module[]>([])
const selectedBookId = ref<number | null>(null)
const selectedModuleId = ref<number | null>(null)
const selectedModuleIds = ref<number[]>([])
const countPerModule = ref(5)
const approvedExercisesByModule = ref<Record<number, Exercise[]>>({})
const generatedExercises = ref<GeneratedExercise[]>([])
const rawFlowiseResponse = ref('')

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

const normalizeExerciseList = (payload: any) => {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.exercicios)) return payload.exercicios
    if (Array.isArray(payload?.quiz)) return payload.quiz
    if (Array.isArray(payload?.data?.exercicios)) return payload.data.exercicios
    if (Array.isArray(payload?.resultados)) {
        return payload.resultados.flatMap((item: any) =>
            Array.isArray(item?.exercicios) ? item.exercicios : [],
        )
    }
    return []
}

const normalizeModuleResults = (payload: any) => {
    if (Array.isArray(payload?.resultados)) return payload.resultados
    if (Array.isArray(payload?.modulos)) return payload.modulos
    if (Array.isArray(payload?.data?.resultados)) return payload.data.resultados
    return []
}

const normalizeResultsByType = (payload: any, types: ExerciseType[]) => {
    const results: Record<string, any[]> = {}

    if (Array.isArray(payload?.resultados)) {
        payload.resultados.forEach((item: any) => {
            if (item?.tipo && Array.isArray(item?.exercicios)) {
                results[String(item.tipo)] = item.exercicios
            }
        })
    }

    if (Object.keys(results).length) return results

    const list = normalizeExerciseList(payload)
    if (list.length && types.length && types[0]) {
        results[types[0]] = list
    }

    return results
}

const getQuestionText = (item: Record<string, any>) =>
    String(
        item.question_text ||
        item.pergunta ||
        item.question ||
        item.afirmacao ||
        item.frase ||
        item.instrucao ||
        item.enunciado ||
        'Sem pergunta',
    )

const toArray = (value: any) => {
    if (Array.isArray(value)) return value
    if (!value) return []
    return String(value)
        .split(/\n|;/)
        .map((item) => item.trim())
        .filter(Boolean)
}

const toBoolean = (value: any) => {
    if (typeof value === 'boolean') return value
    const normalized = String(value || '')
        .trim()
        .toLowerCase()
    if (!normalized) return false
    if (['true', 'verdadeiro', 'v', 'sim', 'yes'].includes(normalized)) return true
    if (['false', 'falso', 'f', 'nao', 'no'].includes(normalized)) return false
    return false
}

const toNumberArray = (value: any) => {
    if (Array.isArray(value)) {
        return value.map((item) => Number(item)).filter((item) => !Number.isNaN(item))
    }
    if (!value) return []
    const matches = String(value).match(/\d+/g) || []
    return matches.map((item) => Number(item)).filter((item) => !Number.isNaN(item))
}

const buildContent = (item: Record<string, any>, exerciseType: ExerciseType, questionText: string) => {
    const source = item?.content || item
    if (exerciseType === 'multiple-choice') {
        return {
            pergunta: questionText,
            opcoes: toArray(source.opcoes || source.options || source.alternativas),
            resposta_correta: source.resposta_correta ?? source.correta ?? '',
            justificacao: source.justificacao || source.justificativa || '',
        }
    }

    if (exerciseType === 'true-false') {
        return {
            pergunta: questionText,
            resposta_correta: toBoolean(source.resposta_correta ?? source.correta ?? source.resposta ?? source.verdadeiro),
            justificacao: source.justificacao || source.justificativa || '',
        }
    }

    return {
        pergunta: questionText,
        resposta_correta: '',
        justificacao: source.justificacao || source.justificativa || '',
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

const formatExamples = (examples: ExerciseExample[]) => {
    if (!examples.length) return 'Sem exemplos anteriores.'
    return examples
        .map((example) => {
            const statusLabel = example.status === 'approved' ? 'APROVADO' : 'REJEITADO'
            const typeLabel = example.type || 'desconhecido'
            const questionText =
                example.content?.pergunta ||
                example.content?.question ||
                example.content?.enunciado ||
                example.content?.frase ||
                'Sem pergunta'
            return `[${statusLabel}] Tipo: ${typeLabel} | Pergunta: ${questionText}`
        })
        .join('\n')
}

const mapExercises = (list: any[], exerciseType: ExerciseType, limit: number) =>
    list.slice(0, limit).map((item) => {
        const questionText = getQuestionText(item)
        return {
            localId: `gen-${Date.now()}-${exerciseSeed++}`,
            questionText,
            content: buildContent(item, exerciseType, questionText),
            exerciseType,
        }
    })

const resolveExerciseType = (value: any, fallback?: ExerciseType) => {
    const normalized = String(value || '')
        .trim()
        .toLowerCase()
    if (normalized.includes('true')) return 'true-false'
    if (normalized.includes('false')) return 'true-false'
    if (normalized.includes('multiple')) return 'multiple-choice'
    if (normalized.includes('choice')) return 'multiple-choice'
    return fallback || 'multiple-choice'
}

const resolveModuleId = (
    result: Record<string, any>,
    item: Record<string, any>,
    lookupByTitle: Map<string, number>,
) => {
    const rawId =
        item?.modulo_id ??
        item?.module_id ??
        result?.modulo_id ??
        result?.module_id ??
        result?.id ??
        result?.modules_id
    const parsed = Number(rawId)
    if (Number.isFinite(parsed)) return parsed

    const rawTitle =
        item?.modulo_titulo ||
        item?.module_title ||
        result?.modulo_titulo ||
        result?.module_title
    if (rawTitle) {
        const matched = lookupByTitle.get(String(rawTitle).trim().toLowerCase())
        if (matched) return matched
    }

    return null
}

const resolveModuleTitle = (moduleId: number | null, lookupById: Map<number, string>) => {
    if (!moduleId) return null
    return lookupById.get(moduleId) || null
}

const generateForModules = async (count: number) => {
    const perModuleLimit = Math.max(2, Math.floor(MAX_EXAMPLES_TOTAL / selectedModules.value.length))
    const modulePayload = await Promise.all(
        selectedModules.value.map(async (moduleItem) => {
            const exemplos = await fetchExerciseExamplesByModule(moduleItem.modules_id, perModuleLimit)
            return {
                id: moduleItem.modules_id,
                titulo: moduleItem.module_title || `Módulo ${moduleItem.modules_id}`,
                descricao: moduleItem.additional_description || '',
                exemplos: formatExamples(exemplos),
            }
        }),
    )

    const response = await gerarExercicios({
        tituloLivro: selectedBook.value?.title || 'Sem título',
        modulos: modulePayload,
        numeroPerguntas: count,
    })

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

const handleGenerate = async () => {
    if (!selectedModules.value.length) {
        error.value = 'Seleciona pelo menos um módulo primeiro.'
        return
    }
    if (countPerModule.value <= 0) {
        error.value = 'Define uma quantidade maior que zero.'
        return
    }
    if (isOverMaxTotal.value) {
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

    try {
        progressLabel.value = `A gerar exercícios para ${selectedModules.value.length} módulos`
        const result = await generateForModules(Math.min(countPerModule.value, maxPerModule.value))
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
    const targetModuleId = exercise.moduleId || selectedModule.value?.modules_id
    if (!targetModuleId) return
    setApproving(exercise.localId, true)
    error.value = ''
    info.value = ''

    try {
        await createExercise({
            id_module: targetModuleId,
            status: 'approved',
            type: exercise.exerciseType,
            content: exercise.content,
        })

        removeGenerated(exercise.localId)
        const list = await refreshApprovedExercisesForModule(targetModuleId)
        await syncModuleApproval(targetModuleId, list.length)
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
        await createExercise({
            id_module: targetModuleId,
            status: 'unapproved',
            type: exercise.exerciseType,
            content: exercise.content,
        })

        removeGenerated(exercise.localId)
        const list = await refreshApprovedExercisesForModule(targetModuleId)
        await syncModuleApproval(targetModuleId, list.length)
        info.value = 'Exercício rejeitado (marcado como não aprovado).'
    } catch (err) {
        console.error(err)
        error.value = 'Não foi possível guardar o exercício rejeitado.'
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
    warning.value = ''
})

onMounted(async () => {
    await loadInitialData()
})
</script>

<template>
    <div class="exercise-generator-page">
        <!-- Hero Section -->
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

        <!-- Status Stack -->
        <div class="status-stack" v-if="isLoadingData || error || warning || info">
            <div v-if="isLoadingData" class="alert alert-loading">A carregar os dados da plataforma...</div>
            <div v-if="error" class="alert alert-error">{{ error }}</div>
            <div v-if="warning" class="alert alert-warning">{{ warning }}</div>
            <div v-if="info" class="alert alert-info">{{ info }}</div>
        </div>

        <div class="workspace">
            <!-- Left Column: Main flow (Books, Modules, Lists) -->
            <div class="main-column">
                <!-- Step 1: Book Selection -->
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

                <!-- Step 2: Module Selection -->
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

                <!-- Approved Modules Summary -->
                <section v-if="approvedSummaries.length" class="approved-section">
                    <div class="section-title">
                        <div class="title-with-icon">
                            <h3>Estado das Aprovações</h3>
                        </div>
                        <p>Acompanha o progresso de cada módulo selecionado.</p>
                    </div>
                    <div class="approved-grid">
                        <div v-for="summary in approvedSummaries" :key="summary.moduleItem.modules_id"
                            class="approved-module-block" :class="{ 'is-approved': summary.isApproved }">
                            <div class="block-header" role="button" tabindex="0"
                                @click="toggleModuleExpanded(summary.moduleItem.modules_id)">
                                <div class="block-title">
                                    <h4>{{ summary.moduleItem.module_title || 'Módulo' }}</h4>
                                    <UiChip :label="summary.isApproved ? 'Aprovado' : 'Por aprovar'"
                                        :variant="summary.isApproved ? 'filled' : 'outline'" />
                                </div>
                                <div class="progress-area">
                                    <div class="progress-bar-bg">
                                        <div class="progress-bar-fill"
                                            :style="{ width: Math.min(100, (summary.approvedCount / summary.required) * 100) + '%' }">
                                        </div>
                                    </div>
                                    <p class="progress-text">
                                        <strong>{{ summary.approvedCount }} / {{ summary.required }}</strong>
                                    </p>
                                    <ChevronDownIcon class="accordion-icon" :class="{ 'is-rotated': expandedModules[summary.moduleItem.modules_id] }" aria-hidden="true" />
                                </div>
                            </div>
                            <div class="accordion-wrapper" :class="{ 'is-open': expandedModules[summary.moduleItem.modules_id] }">
                                <div class="accordion-content">
                                    <div class="approved-list-container">
                                        <ApprovedExercisesList v-if="summary.approved.length" 
                                            :exercises="summary.approved" :type-labels="typeLabels" @remove="handleRemoveApproved" />
                                        <p v-else class="empty-approved">Sem exercícios aprovados neste módulo ainda.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Generated Exercises -->
                <div v-if="groupedSections.length" class="generated-section">
                    <div class="section-title">
                        <div class="title-with-icon">
                            <h3>Exercícios Gerados pela IA</h3>
                        </div>
                        <p>Revê, edita (se necessário) e aprova as melhores questões geradas.</p>
                    </div>
                    <GeneratedExercisesList :sections="groupedSections" :type-labels="typeLabels"
                        :approving-map="approvingMap" @approve="handleApprove" @reject="handleReject" />
                </div>

                <!-- Raw Response -->
                <UiCard v-if="rawFlowiseResponse" class="raw-panel">
                    <h3>Resposta Raw Flowise</h3>
                    <pre class="raw-output">{{ rawFlowiseResponse }}</pre>
                </UiCard>
            </div>

            <!-- Right Column: Generation Settings -->
            <div class="sidebar-column">
                <UiCard class="config-panel sticky">
                    <div class="config-header">
                        <div class="step-indicator">3</div>
                        <h2>Configuração</h2>
                    </div>

                    <div class="config-body" :class="{ 'is-disabled': !selectedModuleIds.length }">
                        <div class="config-group">
                            <div class="group-header">
                                <label>Perguntas por Módulo</label>
                                <span class="badge">Máx {{ maxPerModule }}</span>
                            </div>
                            <UiInput type="number" :min="1" :max="maxPerModule" :model-value="countPerModule"
                                @update="countPerModule = Math.max(1, Number($event) || 1)" />
                            <p class="config-math" :class="{ 'is-warning': isOverMaxTotal }">
                                Total: {{ totalQuestions }} = {{ countPerModule }} × {{ selectedModuleIds.length }}
                                (limite {{ MAX_TOTAL_QUESTIONS }})
                            </p>
                        </div>

                        <div class="config-group">
                            <div class="group-header">
                                <label>Tipos Suportados</label>
                            </div>
                            <div class="types-list">
                                <div class="type-tag">Escolha Múltipla</div>
                                <div class="type-tag">Verdadeiro / Falso</div>
                            </div>
                        </div>

                        <div class="config-action">
                            <UiButton variant="primary" size="md" class="generate-btn"
                                :disabled="!selectedModuleIds.length || isGenerating || isOverMaxTotal"
                                @click="handleGenerate">
                                <span v-if="!isGenerating">Gerar Exercícios</span>
                                <span v-else>A Gerar...</span>
                            </UiButton>
                            <p class="action-hint" v-if="!selectedModuleIds.length">Seleciona módulos para começar.</p>
                            <p class="action-hint" v-else-if="isOverMaxTotal">Reduz o total para não ultrapassar o
                                limite.</p>
                        </div>
                    </div>
                </UiCard>
            </div>
        </div>

        <!-- Loading Overlay -->
        <Transition name="fade">
            <div v-if="isGenerating" class="loading-overlay">
                <div class="loading-modal">
                    <div class="spinner-container">
                        <div class="fancy-spinner"></div>
                    </div>
                    <h3>Processamento IA em curso...</h3>
                    <p class="progress-label" v-if="progressLabel">{{ progressLabel }}</p>
                    <div class="timer">{{ elapsedLabel }}</div>
                    <p class="loading-hint">Isto pode demorar alguns minutos. Por favor aguarda.</p>
                </div>
            </div>
        </Transition>
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

/* Sidebar Column */
.sidebar-column .sticky {
    position: sticky;
    top: calc(var(--space-400));
}

.config-panel {
    background: var(--color-wild-100);
    border: 2px solid var(--color-mirage-900);
    border-radius: var(--radius-400);
}

.config-header {
    display: flex;
    align-items: center;
    gap: var(--space-300);
    padding-bottom: var(--space-400);
    border-bottom: 2px dashed var(--color-mirage-200);
    margin-bottom: var(--space-400);
}

.config-header h2 {
    margin: 0;
    font-size: 22px;
}

.config-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-400);
    transition: opacity 0.3s ease;
}

.config-body.is-disabled {
    opacity: 0.5;
    pointer-events: none;
}

.config-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-200);
}

.group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.group-header label {
    font-weight: 700;
    color: var(--color-mirage-800);
}

.badge {
    background: var(--color-mirage-100);
    color: var(--color-mirage-600);
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--radius-full);
}

.config-math {
    margin: 0;
    font-size: 12px;
    color: var(--color-mirage-600);
    font-weight: 600;
}

.config-math.is-warning {
    color: #8a5a00;
}

.types-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-200);
}

.type-tag {
    background: var(--color-teal-100);
    color: var(--color-teal-800);
    border: 1px solid var(--color-teal-300);
    padding: var(--space-150) var(--space-200);
    border-radius: var(--radius-100);
    font-size: 13px;
    font-weight: 600;
}

.config-action {
    margin-top: var(--space-200);
    display: flex;
    flex-direction: column;
    gap: var(--space-200);
}

.generate-btn {
    width: 100%;
    height: 48px;
    font-size: 15px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.action-hint {
    margin: 0;
    text-align: center;
    font-size: 13px;
    color: var(--color-mirage-500);
}

/* Sections */
.section-title {
    margin-bottom: var(--space-400);
    display: flex;
    flex-direction: column;
    gap: var(--space-100);
}

.title-with-icon {
    display: flex;
    align-items: center;
    gap: var(--space-200);
}

.title-with-icon .icon {
    font-size: 24px;
}

.section-title h3 {
    margin: 0;
    font-size: 24px;
    font-family: var(--font-display);
}

.section-title p {
    margin: 0;
    color: var(--color-mirage-600);
    font-size: 15px;
}

.approved-grid {
    display: grid;
    gap: var(--space-500);
}

.approved-module-block {
    background: var(--color-wild-50);
    border: 2px solid var(--color-mirage-200);
    border-radius: var(--radius-400);
    overflow: hidden;
    transition: border-color 0.3s ease;
}

.approved-module-block.is-approved {
    border-color: var(--color-teal-500);
}

.block-header {
    padding: var(--space-400);
    display: flex;
    flex-direction: column;
    gap: var(--space-300);
    background: var(--color-wild-100);
    border-bottom: 1px solid var(--color-mirage-100);
    cursor: pointer;
    transition: background 0.2s ease;
}

.block-header:hover {
    background: var(--color-wild-200);
}

.approved-module-block.is-approved .block-header {
    background: #f0faf4;
    border-bottom-color: var(--color-teal-200);
}

.approved-module-block.is-approved .block-header:hover {
    background: #e6f5eb;
}

.block-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.block-title h4 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--color-mirage-900);
}

.progress-area {
    display: flex;
    align-items: center;
    gap: var(--space-300);
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

.approved-module-block.is-approved .progress-bar-fill {
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

.accordion-icon.is-rotated {
    transform: rotate(180deg);
}

.accordion-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
    background: var(--color-wild-50);
}

.empty-approved {
    margin: 0;
    color: var(--color-mirage-500);
    font-size: 14px;
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

/* Loading Overlay */
.loading-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 29, 32, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}

.loading-modal {
    background: var(--color-wild-100);
    padding: var(--space-600);
    border-radius: var(--radius-400);
    border: 2px solid var(--color-mirage-900);
    box-shadow: 8px 8px 0 var(--color-shadow);
    text-align: center;
    max-width: 400px;
    width: 90%;
}

.spinner-container {
    margin-bottom: var(--space-400);
}

.fancy-spinner {
    width: 50px;
    height: 50px;
    border: 5px solid var(--color-wild-300);
    border-top-color: var(--color-deep-600);
    border-radius: 50%;
    margin: 0 auto;
    animation: spin 1s linear infinite;
}

.loading-modal h3 {
    margin: 0 0 var(--space-200);
    font-size: 20px;
}

.progress-label {
    margin: 0 0 var(--space-300);
    color: var(--color-mirage-600);
    font-weight: 600;
}

.timer {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 700;
    color: var(--color-deep-600);
    margin-bottom: var(--space-300);
}

.loading-hint {
    margin: 0;
    font-size: 13px;
    color: var(--color-mirage-500);
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
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

/* Responsive */
@media (max-width: 1024px) {
    .workspace {
        grid-template-columns: 1fr;
    }

    .sidebar-column .sticky {
        position: static;
    }
}

@media (max-width: 768px) {
    .hero {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>