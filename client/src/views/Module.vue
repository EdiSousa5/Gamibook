<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchBook, fetchExercisesByModule, fetchModule, getAssetUrl, type Book, type Exercise, type Module } from '../services/directus'

const route = useRoute()
const bookId = computed(() => Number(route.params.bookId || 1))
const moduleId = computed(() => Number(route.params.moduleId || 1))

const book = ref<Book | null>(null)
const moduleData = ref<Module | null>(null)
const exercises = ref<Exercise[]>([])
const error = ref('')
const isLoading = ref(false)

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
        } catch {
            error.value = 'Nao foi possivel carregar o modulo.'
            book.value = null
            moduleData.value = null
            exercises.value = []
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
                <p class="kicker">Exercicios</p>
                <h1>{{ moduleData?.module_title || `Modulo ${moduleId}` }}</h1>
                <p class="meta">{{ book?.title || `Livro ${bookId}` }}</p>
                <p class="description">{{ moduleData?.additional_description || 'Sem descricao.' }}</p>
            </div>
        </header>

        <section class="panel">
            <div class="panel-header">
                <h2>Exercicios do modulo</h2>
                <p>{{ exercises.length }} exercicios aprovados</p>
            </div>

            <p v-if="isLoading" class="state">A carregar exercicios...</p>
            <p v-else-if="error" class="state error">{{ error }}</p>
            <div v-else-if="exercises.length" class="exercise-grid">
                <article v-for="exercise in exercises" :key="exercise.exercise_id" class="exercise-card">
                    <div class="exercise-top">
                        <span class="badge">{{ exercise.type || 'exercicio' }}</span>
                        <span class="points">{{ exercise.points || 0 }} XP</span>
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
                    <div class="meta-row">
                        <span class="tag">{{ exercise.difficulty || 'medium' }}</span>
                    </div>
                </article>
            </div>
            <p v-else class="state">Sem exercicios aprovados para este modulo.</p>
        </section>
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

.kicker {
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #0c7a5a;
    font-weight: 700;
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
    background: #ffffff;
    padding: 22px;
    border-radius: 18px;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
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
    background: #ffffff;
    border-radius: 18px;
    padding: 16px;
    border: 1px solid #e7e7e7;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06);
    display: grid;
    gap: 10px;
}

.exercise-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.badge {
    font-size: 12px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 999px;
    background: #ffe6be;
    color: #8a4c00;
}

.points {
    font-weight: 700;
    color: #0c7a5a;
}

.content ul,
.content ol {
    margin: 0;
    padding-left: 18px;
    color: #4a4a4a;
}

.meta-row {
    display: flex;
    justify-content: flex-start;
}

.tag {
    font-size: 12px;
    font-weight: 700;
    color: #1c1c1c;
    background: #eef6ff;
    padding: 4px 10px;
    border-radius: 999px;
}

.state {
    font-weight: 600;
    color: #6f6f6f;
}

.error {
    color: #b13b3b;
}
</style>
