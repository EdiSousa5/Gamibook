<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiChip from '@/components/ui/UiChip.vue'
import {
    fetchApprovedExerciseCountsByModule,
    fetchBook,
    fetchExercisesByModule,
    fetchModule,
    getAssetUrl,
    type Book,
    type Exercise,
    type Module,
} from '../services/directus'

const route = useRoute()
const bookId = computed(() => Number(route.params.bookId || 1))
const moduleId = computed(() => Number(route.params.moduleId || 1))

const book = ref<Book | null>(null)
const moduleData = ref<Module | null>(null)
const exercises = ref<Exercise[]>([])
const error = ref('')
const isLoading = ref(false)
const APPROVAL_THRESHOLD = 5
const approvedCount = ref(0)
const requiredCount = ref(APPROVAL_THRESHOLD)

const moduleApproved = computed(() => approvedCount.value >= requiredCount.value)

const toArray = (value: any) => {
    if (Array.isArray(value)) return value
    if (!value) return []
    return String(value)
        .split(/\n|;/)
        .map((item) => item.trim())
        .filter(Boolean)
}

const getQuestion = (exercise: Exercise) => {
    const content = exercise.content || {}
    const question =
        (exercise as any).question_text ||
        content.pergunta ||
        content.question ||
        content.enunciado ||
        content.frase ||
        content.afirmacao ||
        ''
    return question ? String(question) : 'Pergunta indisponivel'
}

watch(
    [bookId, moduleId],
    async ([currentBookId, currentModuleId]) => {
        error.value = ''
        isLoading.value = true
        try {
            const [bookInfo, moduleInfo, exerciseList] = await Promise.all([
                fetchBook(currentBookId),
                fetchModule(currentModuleId),
                fetchExercisesByModule(currentModuleId),
            ])
            book.value = bookInfo
            moduleData.value = moduleInfo
            exercises.value = exerciseList

            approvedCount.value = await fetchApprovedExerciseCountsByModule(currentModuleId)
            requiredCount.value = APPROVAL_THRESHOLD
        } catch {
            error.value = 'Nao foi possivel carregar o modulo.'
            book.value = null
            moduleData.value = null
            exercises.value = []
            approvedCount.value = 0
            requiredCount.value = APPROVAL_THRESHOLD
        } finally {
            isLoading.value = false
        }
    },
    { immediate: true }
)
</script>

<template>
    <section class="module">
        <header class="hero">
            <div class="cover">
                <img v-if="book?.cover_img" :src="getAssetUrl(book.cover_img)" alt="" />
                <span v-else>Livro</span>
            </div>
            <div class="hero-info">
                <UiChip label="Exercicios" variant="outline" />
                <h1>{{ moduleData?.module_title || `Modulo ${moduleId}` }}</h1>
                <p class="meta">{{ book?.title || `Livro ${bookId}` }}</p>
                <p class="description">{{ moduleData?.additional_description || 'Sem descricao.' }}</p>
            </div>
        </header>

        <UiCard class="panel">
            <div class="panel-header">
                <h2>Exercicios do modulo</h2>
                <UiChip :label="`${approvedCount} / ${requiredCount} aprovados`" />
            </div>

            <p v-if="isLoading" class="state">A carregar exercicios...</p>
            <p v-else-if="error" class="state error">{{ error }}</p>
            <p v-else-if="!moduleApproved" class="state warning">
                Este modulo ainda nao tem exercicios aprovados suficientes para ficar disponivel.
            </p>
            <div v-else-if="exercises.length" class="exercise-grid">
                <UiCard v-for="exercise in exercises" :key="exercise.exercise_id" class="exercise-card">
                    <div class="exercise-top">
                        <UiBadge :label="exercise.type || 'exercicio'" />
                        <UiChip :label="`${exercise.points || 0} XP`" variant="outline" />
                    </div>
                    <h3>{{ getQuestion(exercise) }}</h3>
                    <div class="content">
                        <template v-if="exercise.type === 'multiple-choice'">
                            <ul>
                                <li v-for="option in toArray(exercise.content?.opcoes || exercise.content?.options)"
                                    :key="option">
                                    {{ option }}
                                </li>
                            </ul>
                        </template>
                        <template v-else-if="exercise.type === 'true-false'">
                            <p>Escolhe: Verdadeiro ou Falso.</p>
                        </template>
                        <template v-else-if="exercise.type === 'fill-blanks'">
                            <p>Completa a frase com a resposta certa.</p>
                        </template>
                        <template v-else-if="exercise.type === 'ordering'">
                            <ol>
                                <li v-for="item in toArray(exercise.content?.itens_desordenados || exercise.content?.items)"
                                    :key="item">
                                    {{ item }}
                                </li>
                            </ol>
                        </template>
                    </div>
                </UiCard>
            </div>
            <p v-else class="state">Sem exercicios aprovados para este modulo.</p>
        </UiCard>
    </section>
</template>

<style scoped>
.module {
    display: grid;
    gap: 22px;
}

.hero {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 18px;
    padding: 20px;
    border-radius: 20px;
    background: linear-gradient(140deg, #fff6e6 0%, #f3fff4 55%, #f0f6ff 100%);
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.08);
}

.hero-info {
    display: grid;
    gap: 6px;
}


.cover {
    width: 110px;
    height: 150px;
    border-radius: 16px;
    background: linear-gradient(160deg, #0c7a5a, #6bd3b0);
    color: #fff;
    font-weight: 800;
    display: grid;
    place-items: center;
    overflow: hidden;
}

.cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.meta {
    color: #6f6f6f;
}

.description {
    color: #4a4a4a;
}

.panel {
    display: grid;
    gap: 18px;
}

.panel-header {
    display: grid;
    gap: 6px;
}

.exercise-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
}

.exercise-card {
    display: grid;
    gap: 10px;
}

.exercise-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}


.content ul,
.content ol {
    margin: 0;
    padding-left: 18px;
    color: #4a4a4a;
}

.state {
    font-weight: 600;
    color: #6f6f6f;
}

.state.warning {
    color: #8a5a00;
    background: #fff4dc;
    border: 1px solid #f2d6a3;
}

.error {
    color: #b13b3b;
}
</style>
