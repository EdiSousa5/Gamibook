<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiChip from '@/components/ui/UiChip.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import {
  fetchApprovedBooks,
  fetchBooks,
  fetchExercisesByModule,
  fetchModulesByBook,
  fetchUserById,
  fetchUserBooks,
  getAssetUrl,
  isAdminUser,
  updateUser,
  type Book,
  type Exercise,
  type Module,
  type User,
  type UserBook,
} from '../services/directus'

const userBooks = ref<UserBook[]>([])
const allBooks = ref<Book[]>([])
const user = ref<User | null>(null)
const error = ref('')
const isLoading = ref(false)
const selectedBookId = ref<number | null>(null)
const modules = ref<Module[]>([])
const selectedModuleId = ref<number | null>(null)
const exercises = ref<Exercise[]>([])
const completedExerciseIds = ref<number[]>([])
const isLoadingModules = ref(false)
const isLoadingExercises = ref(false)
const pointsByExercise = 10

const isAdmin = computed(() => isAdminUser(user.value))

const ownedBooks = computed(() => {
  const list = userBooks.value
    .map((entry) => entry.book_id)
    .filter((book): book is Book => !!book)
  if (isAdmin.value) return list
  return list.filter((book) => book.is_approved)
})

const ownedBookIds = computed(() =>
  new Set(ownedBooks.value.map((book) => book.book_id)),
)

const missingBooks = computed(() =>
  allBooks.value.filter((book) => !ownedBookIds.value.has(book.book_id)),
)

const selectedBook = computed(() =>
  ownedBooks.value.find((book) => book.book_id === selectedBookId.value) || null,
)

const featuredBook = computed(() => selectedBook.value || ownedBooks.value[0] || null)
const otherOwnedBooks = computed(() =>
  featuredBook.value
    ? ownedBooks.value.filter((book) => book.book_id !== featuredBook.value?.book_id)
    : ownedBooks.value,
)

const moduleOptions = computed(() =>
  modules.value.map((moduleItem) => ({
    label: moduleItem.module_title || `Modulo ${moduleItem.modules_id}`,
    value: moduleItem.modules_id,
  })),
)


onMounted(async () => {
  const storedId = localStorage.getItem('gb_user_id')
  if (!storedId) return
  error.value = ''
  isLoading.value = true
  try {
    const [booksList, me] = await Promise.all([
      fetchUserBooks(storedId),
      fetchUserById(storedId),
    ])
    userBooks.value = booksList
    user.value = me
    allBooks.value = isAdminUser(me) ? await fetchBooks() : await fetchApprovedBooks()
    selectedBookId.value = ownedBooks.value[0]?.book_id ?? null
  } catch {
    error.value = 'Nao foi possivel carregar a tua colecao.'
  } finally {
    isLoading.value = false
  }
})

const loadModulesForBook = async (bookId: number | null) => {
  if (!bookId) {
    modules.value = []
    selectedModuleId.value = null
    return
  }
  isLoadingModules.value = true
  try {
    modules.value = await fetchModulesByBook(bookId)
    selectedModuleId.value = modules.value[0]?.modules_id ?? null
  } catch {
    error.value = 'Nao foi possivel carregar os modulos do livro.'
  } finally {
    isLoadingModules.value = false
  }
}

const loadExercisesForModule = async (moduleId: number | null) => {
  if (!moduleId) {
    exercises.value = []
    return
  }
  isLoadingExercises.value = true
  try {
    exercises.value = await fetchExercisesByModule(moduleId)
  } catch {
    error.value = 'Nao foi possivel carregar os exercicios.'
  } finally {
    isLoadingExercises.value = false
  }
}

const completeExercise = async (exercise: Exercise) => {
  if (!exercise.exercise_id || !user.value?.id) return
  if (completedExerciseIds.value.includes(exercise.exercise_id)) return
  const nextPoints = (user.value.points ?? 0) + pointsByExercise
  try {
    const updated = await updateUser(user.value.id, { points: nextPoints })
    user.value = updated
    completedExerciseIds.value = [...completedExerciseIds.value, exercise.exercise_id]
    window.dispatchEvent(new Event('gb-auth-changed'))
  } catch {
    error.value = 'Nao foi possivel atualizar os pontos.'
  }
}

watch(selectedBookId, (value) => {
  loadModulesForBook(value)
})

watch(selectedModuleId, (value) => {
  loadExercisesForModule(value)
})
</script>

<template>
  <section class="collection">
    <div class="header">
      <div>
        <h1>Catalogo de Livros</h1>
        <p class="meta">O teu livro principal, os livros que tens e os que ainda nao tens.</p>
      </div>
    </div>

    <p v-if="isLoading" class="state">A carregar livros...</p>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <div v-else-if="ownedBooks.length || missingBooks.length" class="shelves">
      <section class="featured-shelf">
        <div class="featured-card">
          <div class="featured-info">
            <p class="eyebrow">Livro selecionado</p>
            <h2>{{ featuredBook?.title || 'Sem titulo' }}</h2>
            <p class="meta">{{ featuredBook?.publisher || 'Sem editora' }}</p>
            <UiButton size="sm" variant="outline">Fazer exercicios</UiButton>
          </div>
          <div class="featured-cover" :class="{ empty: !featuredBook?.cover_img }">
            <img v-if="featuredBook?.cover_img" :src="getAssetUrl(featuredBook.cover_img)" alt="" />
            <span v-else>Livro</span>
          </div>
        </div>
        <div class="shelf-base"></div>
      </section>

      <section v-if="otherOwnedBooks.length" class="shelf-row">
        <h3>Livros do utilizador</h3>
        <div class="shelf-books">
          <button v-for="book in otherOwnedBooks" :key="book.book_id" class="shelf-book" type="button"
            :class="{ selected: book.book_id === selectedBookId }" @click="selectedBookId = book.book_id">
            <div class="shelf-cover" :class="{ empty: !book.cover_img }">
              <img v-if="book.cover_img" :src="getAssetUrl(book.cover_img)" alt="" />
              <span v-else>Livro</span>
            </div>
            <p class="shelf-title">{{ book.title || 'Sem titulo' }}</p>
          </button>
        </div>
        <div class="shelf-base"></div>
      </section>

      <section v-if="missingBooks.length" class="shelf-row">
        <h3>Livros que nao tens</h3>
        <div class="shelf-books">
          <div v-for="book in missingBooks" :key="book.book_id" class="shelf-book is-locked" aria-disabled="true">
            <div class="shelf-cover" :class="{ empty: !book.cover_img }">
              <img v-if="book.cover_img" :src="getAssetUrl(book.cover_img)" alt="" />
              <span v-else>Livro</span>
            </div>
            <p class="shelf-title">{{ book.title || 'Sem titulo' }}</p>
          </div>
        </div>
        <div class="shelf-base"></div>
      </section>
    </div>
    <p v-else class="state">Sem livros associados.</p>

    <section class="module-exercises">
      <h2>Exercicios do modulo</h2>
      <p class="meta">Escolhe um modulo e completa exercicios para ganhar pontos.</p>
      <div class="picker">
        <UiSelect label="Modulo" :options="moduleOptions" :model-value="selectedModuleId"
          :disabled="!selectedBookId || isLoadingModules" @update="selectedModuleId = $event ? Number($event) : null" />
        <span class="meta" v-if="selectedBook">Livro: {{ selectedBook.title }}</span>
      </div>

      <p v-if="isLoadingModules" class="state">A carregar modulos...</p>
      <p v-else-if="isLoadingExercises" class="state">A carregar exercicios...</p>

      <div v-else-if="exercises.length" class="exercise-grid">
        <UiCard v-for="exercise in exercises" :key="exercise.exercise_id" class="exercise-card">
          <div class="exercise-top">
            <UiBadge :label="exercise.type || 'exercicio'" />
            <UiChip :label="`+${pointsByExercise} XP`" variant="outline" />
          </div>
          <p class="question">
            {{ (exercise.content as any)?.pergunta || (exercise.content as any)?.question || 'Pergunta indisponivel' }}
          </p>
          <UiButton variant="ghost" type="button" :disabled="completedExerciseIds.includes(exercise.exercise_id || 0)"
            @click="completeExercise(exercise)">
            {{ completedExerciseIds.includes(exercise.exercise_id || 0) ? 'Concluido' : 'Concluir' }}
          </UiButton>
        </UiCard>
      </div>
      <p v-else class="state">Sem exercicios disponiveis.</p>
    </section>
  </section>
</template>

<style scoped>
.collection {
  display: grid;
  gap: var(--space-400);
}

.meta {
  color: var(--color-mirage-500);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-300);
}

.shelves {
  display: grid;
  gap: var(--space-600);
  padding: var(--space-500);
  border-radius: 24px;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 8px 8px 0 var(--color-shadow);
}

.featured-shelf {
  display: grid;
  gap: var(--space-300);
  position: relative;
}

.featured-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-500);
  align-items: center;
  padding: var(--space-500);
  border-radius: 20px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 6px 6px 0 var(--color-shadow);
  position: relative;
  overflow: hidden;
  animation: shelfFadeUp 0.5s ease both;
}

.featured-card::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 14px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(2, 29, 32, 0.08));
  pointer-events: none;
}

.featured-info {
  display: grid;
  gap: var(--space-200);
}

.featured-info h2 {
  margin: 0;
}

.eyebrow {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
}

.featured-cover {
  width: 220px;
  height: 280px;
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  display: grid;
  place-items: center;
  overflow: hidden;
  font-weight: 700;
  box-shadow: 10px 12px 0 rgba(2, 29, 32, 0.18);
  transform: translateY(-10px);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  animation: bookFloat 5s ease-in-out infinite;
}

.featured-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.featured-cover:hover {
  transform: translateY(-14px);
  box-shadow: 12px 14px 0 rgba(2, 29, 32, 0.2);
}

.shelf-row {
  display: grid;
  gap: var(--space-300);
  animation: shelfFadeUp 0.55s ease both;
  animation-delay: 0.05s;
  position: relative;
}

.shelf-row h3 {
  margin: 0;
}

.shelf-books {
  display: flex;
  gap: var(--space-300);
  flex-wrap: wrap;
  align-items: flex-end;
  padding: 0 var(--space-300);
}

.shelf-book {
  display: grid;
  gap: var(--space-150);
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transform: translateY(0);
  transition: transform 0.2s ease;
  animation: bookPop 0.5s ease both;
}

.shelf-book:hover {
  transform: translateY(-6px);
}

.shelf-book.is-locked {
  cursor: not-allowed;
  filter: grayscale(1);
  opacity: 0.55;
  transform: none;
}

.shelf-book.is-locked:hover {
  transform: none;
}

.shelf-book.is-locked .shelf-cover {
  box-shadow: none;
  background: var(--color-wild-400);
  border-color: var(--color-mirage-400);
}

.shelf-book.is-locked .shelf-title {
  color: var(--color-mirage-500);
}

.shelf-cover {
  width: 110px;
  height: 150px;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  display: grid;
  place-items: center;
  overflow: hidden;
  box-shadow: 6px 6px 0 rgba(2, 29, 32, 0.18);
  position: relative;
}

.shelf-cover::before {
  content: '';
  position: absolute;
  inset: 6px 6px auto 6px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.45);
  pointer-events: none;
}

.shelf-cover::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(2, 29, 32, 0.12));
  pointer-events: none;
}

.shelf-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shelf-book.selected .shelf-cover {
  border-color: var(--color-deep-600);
  background: #eef7f2;
}

.shelf-title {
  max-width: 120px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-700);
}

.shelf-base {
  height: 22px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, var(--color-pumpkin-200) 0%, var(--color-pumpkin-400) 55%, var(--color-pumpkin-600) 100%);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 8px 8px 0 rgba(2, 29, 32, 0.18);
  position: relative;
  overflow: hidden;
}

.shelf-base::before {
  content: '';
  position: absolute;
  inset: 4px 16px auto 16px;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
}

.shelf-base::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 6px;
  background: rgba(2, 29, 32, 0.2);
}

.state {
  font-weight: 600;
  color: var(--color-mirage-500);
}

.error {
  color: var(--color-amber-700);
}

.module-exercises {
  display: grid;
  gap: var(--space-300);
}

.picker {
  display: grid;
  gap: 10px;
}

.exercise-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.exercise-card {
  display: grid;
  gap: 10px;
}

.exercise-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.question {
  font-weight: 600;
}

@keyframes shelfFadeUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bookFloat {

  0%,
  100% {
    transform: translateY(-10px);
  }

  50% {
    transform: translateY(-16px);
  }
}

@keyframes bookPop {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .featured-card {
    grid-template-columns: 1fr;
  }

  .featured-cover {
    width: 100%;
    height: 220px;
  }
}
</style>
