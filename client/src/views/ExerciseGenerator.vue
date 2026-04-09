<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { gerarExercicios } from '@/services/flowise'
import {
    createExercise,
    deleteExercise,
    fetchApprovedExercisesByModule,
    fetchExerciseExamplesByModule,
    fetchBooks,
    fetchModules,
    updateModuleApproval,
    type ExerciseExample,
    type Book,
    type Exercise,
    type Module,
} from '@/services/directus'
import BookGrid from '@/components/exercise-generator/BookGrid.vue'
import ModuleGrid from '@/components/exercise-generator/ModuleGrid.vue'
import ApprovedExercisesList from '@/components/exercise-generator/ApprovedExercisesList.vue'
import GeneratedExercisesList from '@/components/exercise-generator/GeneratedExercisesList.vue'

type ExerciseType = 'multiple-choice' | 'true-false'

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
            <div>
                <p class="kicker">Laboratorio de exercicios</p>
                <h1>Gerar exercicios para cada modulo</h1>
                <p class="subtitle">
                    Um modulo fica aprovado quando tem pelo menos {{ APPROVAL_THRESHOLD }} exercicios aprovados.
                </p>
            </div>
        </header>

        <p v-if="isLoadingData" class="state">A carregar livros e modulos...</p>
        <p v-else-if="error" class="state error">{{ error }}</p>
        <p v-else-if="warning" class="state warning">{{ warning }}</p>
        <p v-else-if="info" class="state info">{{ info }}</p>

        <BookGrid :books="books" :selected-book-id="selectedBookId" @select="selectedBookId = $event" />

        <ModuleGrid v-if="selectedBookId" :modules="filteredModules" :selected-module-ids="selectedModuleIds"
            :active-module-id="selectedModuleId" @toggle="toggleModuleSelection" @active="selectedModuleId = $event" />

        <section v-if="selectedBookId" class="panel">
            <div class="panel-header">
                <div>
                    <h2>Geracao em lote</h2>
                    <p class="meta">
                        {{ selectedModuleIds.length }} modulos selecionados
                    </p>
                </div>
            </div>
            <div class="selection-actions">
                <button class="ghost" type="button" :disabled="!filteredModules.length" @click="selectAllModules">
                    Selecionar todos
                </button>
                <button class="ghost" type="button" :disabled="!selectedModuleIds.length" @click="clearSelectedModules">
                    Limpar selecao
                </button>
            </div>
            <div class="form-row">
                <label>
                    Perguntas por modulo
                    <span class="hint">Maximo: {{ maxPerModule }}</span>
                </label>
                <input type="number" min="1" :max="maxPerModule" v-model.number="countPerModule" />
            </div>
            <div class="form-row">
                <label>Tipos de exercicio</label>
                <p class="hint">Escolha multipla + Verdadeiro/Falso</p>
            </div>
            <button class="primary" type="button" :disabled="!selectedModuleIds.length || isGenerating"
                @click="handleGenerate">
                Gerar exercicios (1 chamada)
            </button>
        </section>

        <section v-if="approvedSummaries.length" class="module-panels">
            <div v-for="summary in approvedSummaries" :key="summary.moduleItem.modules_id" class="panel">
                <div class="panel-header">
                    <div>
                        <h2>{{ summary.moduleItem.module_title || 'Modulo' }}</h2>
                        <p class="meta">
                            Estado: {{ summary.isApproved ? 'Aprovado' : 'Por aprovar' }}
                        </p>
                    </div>
                    <span class="status-pill" :class="{ approved: summary.isApproved }">
                        {{ summary.isApproved ? 'Aprovado' : 'Por aprovar' }}
                    </span>
                </div>
                <label class="status-check">
                    <input type="checkbox" :checked="summary.isApproved" disabled />
                    <div>
                        <strong>{{ summary.approvedCount }} / {{ summary.required }} aprovados</strong>
                        <p>Minimo necessario para aprovar o modulo</p>
                    </div>
                </label>
                <ApprovedExercisesList :exercises="summary.approved" :type-labels="typeLabels"
                    @remove="handleRemoveApproved" />
            </div>
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
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Space+Grotesk:wght@400;600;700&display=swap');

.generator {
    display: grid;
    gap: 24px;
    font-family: 'Space Grotesk', 'Trebuchet MS', sans-serif;
    color: #171717;
}

.hero {
    display: grid;
    gap: 10px;
    padding: 24px;
    border-radius: 22px;
    background: linear-gradient(130deg, #fff6e6 0%, #f3fff4 55%, #f0f6ff 100%);
    box-shadow: 0 20px 48px rgba(12, 122, 90, 0.1);
    animation: fadeUp 0.6s ease;
}

.hero h1 {
    margin: 6px 0 10px;
    font-family: 'Playfair Display', serif;
    font-size: 30px;
}

.kicker {
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #0c7a5a;
    font-weight: 700;
}

.subtitle {
    max-width: 520px;
    color: #505050;
}

.state.warning {
    color: #8a5a00;
    background: #fff4dc;
    border: 1px solid #f2d6a3;
}

.panel {
    background: #ffffff;
    padding: 22px;
    border-radius: 20px;
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.06);
    display: grid;
    gap: 18px;
}

.selection-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.form-row {
    display: grid;
    gap: 8px;
}

.form-row label {
    font-weight: 600;
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.form-row input {
    border-radius: 12px;
    border: 1px solid #d9d9d9;
    padding: 10px 12px;
    font-size: 14px;
}

.hint {
    font-size: 12px;
    color: #6c6c6c;
    font-weight: 500;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.loading-overlay {
    position: fixed;
    inset: 0;
    background: rgba(12, 24, 20, 0.55);
    display: grid;
    place-items: center;
    z-index: 40;
    backdrop-filter: blur(2px);
}

.loading-card {
    background: #ffffff;
    border-radius: 18px;
    padding: 28px 30px;
    display: grid;
    gap: 16px;
    text-align: center;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
}

.loading-card h3 {
    margin: 0;
    font-family: 'Playfair Display', serif;
    font-size: 22px;
}

.loading-progress {
    margin: 0;
    font-size: 13px;
    color: #5a5a5a;
}

.loading-spinner {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    border: 4px solid #e6efe9;
    border-top-color: #0c7a5a;
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

.panel-header h2 {
    margin: 0;
}

.panel-header .meta {
    margin: 4px 0 0;
    color: #555;
}

.status-pill {
    padding: 6px 12px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 12px;
    background: #ffe6be;
    color: #8a4c00;
}

.status-pill.approved {
    background: #d6f2e6;
    color: #0c7a5a;
}

.status-check {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 12px;
    padding: 14px;
    border-radius: 16px;
    background: #ffffff;
    border: 1px solid #ececec;
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.05);
    align-items: center;
}

.status-check input {
    width: 18px;
    height: 18px;
}

.status-check p {
    margin: 4px 0 0;
    color: #6f6f6f;
    font-size: 12px;
}

.primary {
    padding: 12px 16px;
    border-radius: 14px;
    border: none;
    background: #0c7a5a;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
}

.ghost {
    padding: 10px 14px;
    border-radius: 14px;
    border: 1px solid #d9d9d9;
    background: #fff;
    color: #333;
    font-weight: 600;
    cursor: pointer;
}

.ghost:disabled,
.primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.state {
    font-weight: 600;
    color: #666;
}

.state.error {
    color: #b13b3b;
}

.state.info {
    color: #0c7a5a;
}

@keyframes fadeUp {
    from {
        opacity: 0;
        transform: translateY(12px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 720px) {
    .hero {
        grid-template-columns: 1fr;
    }
}

.module-panels {
    display: grid;
    gap: 20px;
}
</style>
