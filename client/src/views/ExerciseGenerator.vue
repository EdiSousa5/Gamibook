<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { gerarExercicios } from '@/services/flowise'
import {
    createExercise,
    deleteExercise,
    fetchApprovedExercisesByModule,
    fetchBooks,
    fetchModules,
    type Book,
    type Exercise,
    type Module,
} from '@/services/directus'
import BookGrid from '@/components/exercise-generator/BookGrid.vue'
import ModuleGrid from '@/components/exercise-generator/ModuleGrid.vue'
import GeneratorModal from '@/components/exercise-generator/GeneratorModal.vue'
import ApprovedExercisesList from '@/components/exercise-generator/ApprovedExercisesList.vue'
import GeneratedExercisesList from '@/components/exercise-generator/GeneratedExercisesList.vue'

type Difficulty = 'easy' | 'medium' | 'hard'

type ExerciseType = 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'

type GeneratedExercise = {
    localId: string
    questionText: string
    content: Record<string, any>
    exerciseType: ExerciseType
    difficulty: Difficulty
}

type Section = {
    difficulty: Difficulty
    types: Array<{ type: ExerciseType; items: GeneratedExercise[] }>
}

const MIN_APPROVED = 5
let exerciseSeed = 0

const books = ref<Book[]>([])
const modules = ref<Module[]>([])
const selectedBookId = ref<number | null>(null)
const selectedModuleId = ref<number | null>(null)
const approvedExercises = ref<Exercise[]>([])
const generatedExercises = ref<GeneratedExercise[]>([])

const isLoadingData = ref(false)
const isGenerating = ref(false)
const error = ref('')
const info = ref('')
const approvingMap = ref<Record<string, boolean>>({})
const modalOpen = ref(false)

const typeLabels: Record<ExerciseType, string> = {
    'multiple-choice': 'Escolha multipla',
    'true-false': 'Verdadeiro / Falso',
    'fill-blanks': 'Completar espacos',
    ordering: 'Ordenar',
}

const difficultyLabels: Record<Difficulty, string> = {
    easy: 'Facil',
    medium: 'Medio',
    hard: 'Dificil',
}

const selectedModule = computed(() =>
    modules.value.find((moduleItem) => moduleItem.modules_id === selectedModuleId.value),
)

const selectedBook = computed(() => {
    if (!selectedBookId.value) return null
    return books.value.find((book) => book.book_id === selectedBookId.value) || null
})

const filteredModules = computed(() => {
    if (!selectedBookId.value) return modules.value
    return modules.value.filter((moduleItem) => moduleItem.id_book === selectedBookId.value)
})

const approvedCount = computed(() => approvedExercises.value.length)
const moduleApproved = computed(() => approvedCount.value >= MIN_APPROVED)
const moduleApprovalLabel = computed(() => (moduleApproved.value ? 'Aprovado' : 'Por aprovar'))

const groupedSections = computed<Section[]>(() => {
    const grouped: Record<Difficulty, Record<ExerciseType, GeneratedExercise[]>> = {
        easy: {
            'multiple-choice': [],
            'true-false': [],
            'fill-blanks': [],
            ordering: [],
        },
        medium: {
            'multiple-choice': [],
            'true-false': [],
            'fill-blanks': [],
            ordering: [],
        },
        hard: {
            'multiple-choice': [],
            'true-false': [],
            'fill-blanks': [],
            ordering: [],
        },
    }

    generatedExercises.value.forEach((exercise) => {
        grouped[exercise.difficulty][exercise.exerciseType].push(exercise)
    })

    const difficultyOrder: Difficulty[] = ['easy', 'medium', 'hard']
    const typeOrder: ExerciseType[] = ['multiple-choice', 'true-false', 'fill-blanks', 'ordering']

    return difficultyOrder
        .map((difficulty) => {
            const types = typeOrder
                .map((type) => ({ type, items: grouped[difficulty][type] }))
                .filter((entry) => entry.items.length > 0)
            return { difficulty, types }
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
    if (!selectedModuleId.value) {
        approvedExercises.value = []
        return
    }

    try {
        approvedExercises.value = await fetchApprovedExercisesByModule(selectedModuleId.value)
    } catch (err) {
        console.error(err)
        error.value = 'Nao foi possivel carregar os exercicios aprovados.'
    }
}

const normalizeExerciseList = (payload: any) => {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.exercicios)) return payload.exercicios
    if (Array.isArray(payload?.quiz)) return payload.quiz
    if (Array.isArray(payload?.data?.exercicios)) return payload.data.exercicios
    return []
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

    if (exerciseType === 'fill-blanks') {
        return {
            pergunta: questionText,
            resposta_correta: source.resposta_correta ?? source.resposta ?? source.solucao ?? '',
            justificacao: source.justificacao || source.justificativa || '',
        }
    }

    return {
        pergunta: questionText,
        itens_desordenados: toArray(source.itens_desordenados || source.items || source.passos),
        ordem_correta: toNumberArray(source.ordem_correta || source.ordem || source.resposta_correta),
        justificacao: source.justificacao || source.justificativa || '',
    }
}

const getPointsForDifficulty = (value: Difficulty) => {
    if (value === 'easy') return 10
    if (value === 'medium') return 20
    return 30
}

const mapExercises = (list: any[], exerciseType: ExerciseType, difficulty: Difficulty, limit: number) =>
    list.slice(0, limit).map((item) => {
        const questionText = getQuestionText(item)
        return {
            localId: `gen-${Date.now()}-${exerciseSeed++}`,
            questionText,
            content: buildContent(item, exerciseType, questionText),
            exerciseType,
            difficulty,
        }
    })

const generateForCombo = async (exerciseType: ExerciseType, difficulty: Difficulty, count: number) => {
    const items: GeneratedExercise[] = []
    let remaining = count
    let attempts = 0

    while (remaining > 0 && attempts < 3) {
        const response = await gerarExercicios(
            selectedBook.value?.title || 'Sem titulo',
            selectedModule.value?.module_title || 'Sem titulo',
            selectedModule.value?.additional_description || '',
            exerciseType,
            difficulty,
            count,
        )
        const list = normalizeExerciseList(response)
        const mapped = mapExercises(list, exerciseType, difficulty, remaining)
        items.push(...mapped)
        remaining = count - items.length
        attempts += 1
    }

    return items
}

const handleGenerate = async (payload: { difficulty: Difficulty; types: ExerciseType[]; count: number }) => {
    if (!selectedModule.value) {
        error.value = 'Seleciona um modulo primeiro.'
        return
    }
    if (payload.count <= 0) {
        error.value = 'Define uma quantidade maior que zero.'
        return
    }
    if (!payload.types.length) {
        error.value = 'Seleciona pelo menos um tipo de exercicio.'
        return
    }
    isGenerating.value = true
    error.value = ''
    info.value = ''

    try {
        const results = await Promise.all(
            payload.types.map((type) => generateForCombo(type, payload.difficulty, payload.count)),
        )
        const merged = results.flat()
        if (!merged.length) {
            error.value = 'O Flowise nao devolveu exercicios. Tenta novamente.'
            return
        }
        generatedExercises.value = [...generatedExercises.value, ...merged]
        info.value = 'Exercicios gerados. Reve e aprova os melhores.'
        modalOpen.value = false
    } catch (err) {
        console.error(err)
        error.value = 'Erro ao gerar exercicios.'
    } finally {
        isGenerating.value = false
    }
}

const removeGenerated = (localId: string) => {
    generatedExercises.value = generatedExercises.value.filter((item) => item.localId !== localId)
}

const setApproving = (localId: string, value: boolean) => {
    approvingMap.value = { ...approvingMap.value, [localId]: value }
}

const handleApprove = async (exercise: GeneratedExercise) => {
    if (!selectedModule.value) return
    setApproving(exercise.localId, true)
    error.value = ''
    info.value = ''

    try {
        await createExercise({
            id_module: selectedModule.value.modules_id,
            status: 'approved',
            type: exercise.exerciseType,
            difficulty: exercise.difficulty,
            content: exercise.content,
            points: getPointsForDifficulty(exercise.difficulty),
        })

        removeGenerated(exercise.localId)
        await refreshApprovedExercises()
        info.value = 'Exercicio aprovado e guardado no Directus.'
    } catch (err) {
        console.error(err)
        error.value = 'Nao foi possivel aprovar o exercicio.'
    } finally {
        setApproving(exercise.localId, false)
    }
}

const handleReject = async (exercise: GeneratedExercise) => {
    if (!selectedModule.value) return
    setApproving(exercise.localId, true)
    error.value = ''
    info.value = ''

    try {
        await createExercise({
            id_module: selectedModule.value.modules_id,
            status: 'unapproved',
            type: exercise.exerciseType,
            difficulty: exercise.difficulty,
            content: exercise.content,
            points: getPointsForDifficulty(exercise.difficulty),
        })

        removeGenerated(exercise.localId)
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
        await refreshApprovedExercises()
        info.value = 'Exercicio removido com sucesso.'
    } catch (err) {
        console.error(err)
        error.value = 'Nao foi possivel remover o exercicio.'
    }
}

watch(selectedModuleId, async () => {
    generatedExercises.value = []
    await refreshApprovedExercises()
})

watch(selectedBookId, () => {
    selectedModuleId.value = null
    generatedExercises.value = []
    approvedExercises.value = []
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
                    Um modulo fica aprovado quando tem pelo menos {{ MIN_APPROVED }} exercicios aprovados.
                </p>
            </div>
        </header>

        <p v-if="isLoadingData" class="state">A carregar livros e modulos...</p>
        <p v-else-if="error" class="state error">{{ error }}</p>
        <p v-else-if="info" class="state info">{{ info }}</p>

        <BookGrid :books="books" :selected-book-id="selectedBookId" @select="selectedBookId = $event" />

        <ModuleGrid v-if="selectedBookId" :modules="filteredModules" :selected-module-id="selectedModuleId"
            @select="selectedModuleId = $event" />

        <section v-if="selectedModuleId" class="panel">
            <div class="panel-header">
                <div>
                    <h2>{{ selectedModule?.module_title || 'Modulo' }}</h2>
                    <p class="meta">Estado: {{ moduleApprovalLabel }}</p>
                </div>
                <span class="status-pill" :class="{ approved: moduleApproved }">{{ moduleApprovalLabel }}</span>
            </div>
            <label class="status-check">
                <input type="checkbox" :checked="moduleApproved" disabled />
                <div>
                    <strong>{{ approvedCount }} / {{ MIN_APPROVED }} aprovados</strong>
                    <p>Minimo necessario para aprovar o modulo</p>
                </div>
            </label>
            <button class="primary" type="button" :disabled="!selectedModuleId" @click="modalOpen = true">
                Gerar exercicios
            </button>
        </section>

        <ApprovedExercisesList v-if="selectedModuleId" :exercises="approvedExercises" :type-labels="typeLabels"
            :difficulty-labels="difficultyLabels" @remove="handleRemoveApproved" />

        <GeneratedExercisesList :sections="groupedSections" :type-labels="typeLabels"
            :difficulty-labels="difficultyLabels" :approving-map="approvingMap" @approve="handleApprove"
            @reject="handleReject" />

        <GeneratorModal :open="modalOpen" :default-difficulty="'medium'" :default-types="['multiple-choice']"
            :default-count="5" :is-generating="isGenerating" @close="modalOpen = false" @generate="handleGenerate" />
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

.panel {
    background: #ffffff;
    padding: 22px;
    border-radius: 20px;
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.06);
    display: grid;
    gap: 18px;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
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
</style>
