<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'
import UiChip from '@/components/ui/UiChip.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { gerarExercicios } from '@/services/flowise'
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
let exerciseSeed = 0

const books = ref<Book[]>([])
const modules = ref<Module[]>([])
const selectedBookId = ref<number | null>(null)
const selectedModuleId = ref<number | null>(null)
const selectedModuleIds = ref<number[]>([])
const countPerModule = ref(5)
const approvedExercisesByModule = ref<Record<number, Exercise[]>>({})
const generatedExercises = ref<GeneratedExercise[]>([])

const isLoadingData = ref(false)
const isGenerating = ref(false)
const error = ref('')
const info = ref('')
const warning = ref('')
const progressLabel = ref('')
const approvingMap = ref<Record<string, boolean>>({})

const typeLabels: Record<ExerciseType, string> = {
    'multiple-choice': 'Escolha multipla',
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
        modules.value.map((moduleItem) => [moduleItem.modules_id, moduleItem.module_title || 'Modulo']),
    )

    const order = selectedModuleIds.value.length
        ? selectedModuleIds.value
        : Array.from(grouped.keys()).filter((id): id is number => id !== null)

    const sections = Array.from(grouped.entries()).map(([moduleId, typeMap]) => {
        const moduleTitle = moduleId
            ? moduleTitleById.get(moduleId) || `Modulo ${moduleId}`
            : 'Modulo desconhecido'
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
        error.value = 'Nao foi possivel carregar os modulos.'
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
        error.value = 'Nao foi possivel carregar os exercicios aprovados.'
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
        error.value = 'Nao foi possivel carregar os exercicios aprovados.'
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
    if (list.length && types.length && types[0]) {  // ← adiciona && types[0]
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
    } else {
        selectedModuleIds.value = [...selectedModuleIds.value, moduleId]
        selectedModuleId.value = moduleId
    }
}

const selectAllModules = () => {
    selectedModuleIds.value = filteredModules.value.map((item) => item.modules_id)
    selectedModuleId.value = selectedModuleIds.value[0] ?? null
}

const clearSelectedModules = () => {
    selectedModuleIds.value = []
    selectedModuleId.value = null
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
                titulo: moduleItem.module_title || `Modulo ${moduleItem.modules_id}`,
                descricao: moduleItem.additional_description || '',
                exemplos: formatExamples(exemplos),
            }
        }),
    )

    const response = await gerarExercicios({
        tituloLivro: selectedBook.value?.title || 'Sem titulo',
        modulos: modulePayload,
        numeroPerguntas: count,
        tipoExercicio: 'multiple-choice, true-false',
    })

    const lookupByTitle = new Map(
        modulePayload.map((item) => [item.titulo.trim().toLowerCase(), Number(item.id)]),
    )
    const lookupById = new Map(
        modulePayload.map((item) => [Number(item.id), item.titulo]),
    )

    const results = normalizeModuleResults(response)
    const fallbackList = normalizeExerciseList(response)
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

    return { items, receivedCount: items.length }
}

const handleGenerate = async () => {
    if (!selectedModules.value.length) {
        error.value = 'Seleciona pelo menos um modulo primeiro.'
        return
    }
    if (countPerModule.value <= 0) {
        error.value = 'Define uma quantidade maior que zero.'
        return
    }
    isGenerating.value = true
    error.value = ''
    info.value = ''
    warning.value = ''
    progressLabel.value = ''

    try {
        progressLabel.value = `A gerar exercicios para ${selectedModules.value.length} modulos`
        const result = await generateForModules(Math.min(countPerModule.value, maxPerModule.value))
        if (!result.items.length) {
            error.value = 'O Flowise nao devolveu exercicios. Tenta novamente.'
            return
        }
        generatedExercises.value = [...generatedExercises.value, ...result.items]
        info.value = 'Exercicios gerados. Reve e aprova os melhores.'
    } catch (err) {
        console.error(err)
        error.value = 'Erro ao gerar exercicios.'
    } finally {
        isGenerating.value = false
        progressLabel.value = ''
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
        info.value = 'Exercicio aprovado e guardado no Directus.'
    } catch (err) {
        console.error(err)
        error.value = 'Nao foi possivel aprovar o exercicio.'
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
        info.value = 'Exercicio rejeitado e guardado como unapproved.'
    } catch (err) {
        console.error(err)
        error.value = 'Nao foi possivel guardar o exercicio rejeitado.'
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
        info.value = 'Exercicio removido com sucesso.'
    } catch (err) {
        console.error(err)
        error.value = 'Nao foi possivel remover o exercicio.'
    }
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
})

onMounted(async () => {
    await loadInitialData()
})
</script>

<template>
    <section class="generator">
        <header class="hero">
            <div class="hero-text">
                <UiChip label="Laboratorio de exercicios" variant="outline" />
                <h1>Gerar exercicios com foco</h1>
                <p class="subtitle">
                    Escolhe um livro, define os modulos e gera questoes em lote. Um modulo fica aprovado com
                    {{ APPROVAL_THRESHOLD }} exercicios aprovados.
                </p>
                <div class="hero-meta">
                    <div class="meta-card">
                        <span>Modulos selecionados</span>
                        <strong>{{ selectedModuleIds.length }}</strong>
                    </div>
                    <div class="meta-card">
                        <span>Maximo por modulo</span>
                        <strong>{{ maxPerModule }}</strong>
                    </div>
                </div>
            </div>
            <div class="hero-steps">
                <div class="step">
                    <span>01</span>
                    <p>Seleciona um livro</p>
                </div>
                <div class="step">
                    <span>02</span>
                    <p>Marca os modulos certos</p>
                </div>
                <div class="step">
                    <span>03</span>
                    <p>Gera e aprova exercicios</p>
                </div>
            </div>
        </header>

        <div class="state-stack">
            <p v-if="isLoadingData" class="state">A carregar livros e modulos...</p>
            <p v-else-if="error" class="state error">{{ error }}</p>
            <p v-else-if="warning" class="state warning">{{ warning }}</p>
            <p v-else-if="info" class="state info">{{ info }}</p>
        </div>

        <div class="layout">
            <div class="column">
                <UiCard class="panel">
                    <div class="panel-header">
                        <div>
                            <h2>1. Escolhe o livro</h2>
                            <p class="meta">Seleciona o livro que queres trabalhar.</p>
                        </div>
                    </div>
                    <BookGrid :books="books" :selected-book-id="selectedBookId" @select="selectedBookId = $event" />
                </UiCard>

                <UiCard v-if="selectedBookId" class="panel">
                    <div class="panel-header">
                        <div>
                            <h2>2. Escolhe os modulos</h2>
                            <p class="meta">Marca os modulos que vao receber novos exercicios.</p>
                        </div>
                    </div>
                    <ModuleGrid :modules="filteredModules" :selected-module-ids="selectedModuleIds"
                        :active-module-id="selectedModuleId" @toggle="toggleModuleSelection"
                        @active="selectedModuleId = $event" />
                </UiCard>
            </div>

            <div class="column aside">
                <UiCard v-if="selectedBookId" class="panel sticky">
                    <div class="panel-header">
                        <div>
                            <h2>3. Geracao em lote</h2>
                            <p class="meta">{{ selectedModuleIds.length }} modulos selecionados</p>
                        </div>
                    </div>
                    <div class="selection-actions">
                        <UiButton variant="outline" type="button" :disabled="!filteredModules.length"
                            @click="selectAllModules">
                            Selecionar todos
                        </UiButton>
                        <UiButton variant="ghost" type="button" :disabled="!selectedModuleIds.length"
                            @click="clearSelectedModules">
                            Limpar selecao
                        </UiButton>
                    </div>
                    <div class="form-row">
                        <div class="label">
                            <span>Perguntas por modulo</span>
                            <span class="hint">Maximo: {{ maxPerModule }}</span>
                        </div>
                        <UiInput type="number" :min="1" :max="maxPerModule" :model-value="countPerModule"
                            @update="countPerModule = Math.max(1, Number($event) || 1)" />
                    </div>
                    <div class="form-row">
                        <label>Tipos de exercicio</label>
                        <p class="hint">Escolha multipla + Verdadeiro/Falso</p>
                    </div>
                    <UiButton variant="primary" type="button" :disabled="!selectedModuleIds.length || isGenerating"
                        @click="handleGenerate">
                        Gerar exercicios (1 chamada)
                    </UiButton>
                </UiCard>
            </div>
        </div>

        <section v-if="approvedSummaries.length" class="module-panels">
            <UiCard v-for="summary in approvedSummaries" :key="summary.moduleItem.modules_id" class="panel">
                <div class="panel-header">
                    <div>
                        <h2>{{ summary.moduleItem.module_title || 'Modulo' }}</h2>
                        <p class="meta">Estado: {{ summary.isApproved ? 'Aprovado' : 'Por aprovar' }}</p>
                    </div>
                    <UiChip :label="summary.isApproved ? 'Aprovado' : 'Por aprovar'"
                        :variant="summary.isApproved ? 'filled' : 'outline'" />
                </div>
                <div class="status-check">
                    <UiCheckbox :model-value="summary.isApproved" disabled />
                    <div>
                        <strong>{{ summary.approvedCount }} / {{ summary.required }} aprovados</strong>
                        <p>Minimo necessario para aprovar o modulo</p>
                    </div>
                </div>
                <ApprovedExercisesList :exercises="summary.approved" :type-labels="typeLabels"
                    @remove="handleRemoveApproved" />
            </UiCard>
        </section>

        <GeneratedExercisesList :sections="groupedSections" :type-labels="typeLabels" :approving-map="approvingMap"
            @approve="handleApprove" @reject="handleReject" />

        <div v-if="isGenerating" class="loading-overlay" role="status" aria-live="polite">
            <div class="loading-card">
                <h3>A gerar exercicios</h3>
                <p v-if="progressLabel" class="loading-progress">{{ progressLabel }}</p>
                <div class="loading-spinner" aria-hidden="true"></div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.generator {
    display: grid;
    gap: var(--space-600);
    color: var(--color-mirage-800);
}

.hero {
    display: grid;
    gap: var(--space-400);
    padding: var(--space-500);
    border-radius: var(--radius-400);
    background: var(--color-wild-100);
    border: 2px solid var(--color-mirage-800);
    box-shadow: 4px 4px 0 var(--color-shadow);
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
}

.hero h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 30px;
}

.subtitle {
    max-width: 560px;
    color: var(--color-mirage-600);
    margin: 0;
}

.hero-text {
    display: grid;
    gap: var(--space-200);
}

.hero-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--space-200);
}

.meta-card {
    border: 2px solid var(--color-mirage-800);
    border-radius: 14px;
    padding: var(--space-200) var(--space-300);
    background: var(--color-wild-100);
    box-shadow: 3px 3px 0 var(--color-shadow);
    display: grid;
    gap: 4px;
}

.meta-card span {
    font-size: 12px;
    color: var(--color-mirage-500);
}

.meta-card strong {
    font-size: 18px;
}

.hero-steps {
    display: grid;
    gap: var(--space-200);
}

.step {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: var(--space-200);
    padding: var(--space-200) var(--space-300);
    border-radius: 14px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 3px 3px 0 var(--color-shadow);
    font-weight: 600;
}

.step span {
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--color-mirage-500);
}

.step p {
    margin: 0;
}

.state-stack {
    display: grid;
    gap: var(--space-200);
}

.layout {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: var(--space-500);
    align-items: start;
}

.column {
    display: grid;
    gap: var(--space-400);
}

.aside .sticky {
    position: sticky;
    top: calc(var(--topbar-height) + var(--space-400));
}

.state {
    padding: var(--space-200) var(--space-300);
    border-radius: 12px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 3px 3px 0 var(--color-shadow);
    font-weight: 600;
}

.state.error {
    color: #b13b3b;
    background: #fff2f2;
}

.state.info {
    color: var(--color-deep-700);
    background: var(--color-deep-100);
}

.state.warning {
    color: #8a5a00;
    background: #fff4dc;
}

.panel {
    display: grid;
    gap: var(--space-300);
}

.selection-actions {
    display: flex;
    gap: var(--space-200);
    flex-wrap: wrap;
}

.form-row {
    display: grid;
    gap: var(--space-150);
}

.form-row .label {
    font-weight: 700;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-200);
}

.hint {
    font-size: 12px;
    color: var(--color-mirage-500);
    font-weight: 600;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-200);
    flex-wrap: wrap;
}

.panel-header h2 {
    margin: 0;
    font-size: 20px;
}

.panel-header .meta {
    margin: 4px 0 0;
    color: var(--color-mirage-600);
}

.status-check {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-200);
    padding: var(--space-300);
    border-radius: var(--radius-400);
    align-items: center;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
}

.status-check p {
    margin: 4px 0 0;
    color: var(--color-mirage-600);
    font-size: 12px;
}

.loading-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 29, 32, 0.35);
    display: grid;
    place-items: center;
    z-index: 40;
    backdrop-filter: blur(2px);
}

.loading-card {
    background: var(--color-wild-100);
    border-radius: 16px;
    padding: var(--space-500);
    display: grid;
    gap: var(--space-300);
    text-align: center;
    border: 2px solid var(--color-mirage-800);
    box-shadow: 6px 6px 0 var(--color-shadow);
}

.loading-card h3 {
    margin: 0;
    font-size: 20px;
}

.loading-progress {
    margin: 0;
    font-size: 12px;
    color: var(--color-mirage-600);
}

.loading-spinner {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    border: 4px solid var(--color-wild-300);
    border-top-color: var(--color-deep-600);
    margin: 0 auto;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

.module-panels {
    display: grid;
    gap: var(--space-400);
}

@media (max-width: 720px) {
    .hero {
        padding: var(--space-400);
        grid-template-columns: 1fr;
    }

    .layout {
        grid-template-columns: 1fr;
    }

    .aside .sticky {
        position: static;
    }
}
</style>
