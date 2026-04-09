<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  fetchExercisesByModule,
  fetchModulesByBook,
  fetchUserById,
  fetchUserBooks,
  getAssetUrl,
  getLevelProgressFromPoints,
  getUserAvatarId,
  updateUser,
  uploadUserAvatar,
  type Book,
  type Exercise,
  type Module,
  type UserBook,
  type User,
} from '../services/directus'

const user = ref<User | null>(null)
const name = ref('')
const error = ref('')
const isLoading = ref(false)
const avatarPreview = ref('')
const avatarFile = ref<File | null>(null)
const userBooks = ref<UserBook[]>([])
const selectedBookId = ref<number | null>(null)
const modules = ref<Module[]>([])
const selectedModuleId = ref<number | null>(null)
const exercises = ref<Exercise[]>([])
const completedExerciseIds = ref<number[]>([])
const isLoadingBooks = ref(false)
const isLoadingModules = ref(false)
const isLoadingExercises = ref(false)
const pointsByExercise = 10

const stats = computed(() => ({
  points: user.value?.points ?? null,
  level:
    user.value?.level ??
    (user.value?.points != null ? getLevelProgressFromPoints(user.value.points).level : null),
}))

const levelProgress = computed(() => {
  const points = user.value?.points ?? 0
  return getLevelProgressFromPoints(points)
})

const xpToNext = computed(() => levelProgress.value.nextLevelXp - levelProgress.value.progress)

const progressPercent = computed(() => {
  if (!levelProgress.value.nextLevelXp) return 0
  return Math.min(100, Math.round((levelProgress.value.progress / levelProgress.value.nextLevelXp) * 100))
})

const userBooksList = computed(() =>
  userBooks.value.map((entry) => entry.book_id).filter((book): book is Book => !!book),
)

const selectedBook = computed(() =>
  userBooksList.value.find((book) => book.book_id === selectedBookId.value) || null,
)

const selectedModule = computed(() =>
  modules.value.find((moduleItem) => moduleItem.modules_id === selectedModuleId.value) || null,
)

const userFields = computed(() => {
  if (!user.value) return []
  return Object.entries(user.value).map(([key, value]) => {
    if (value == null) return [key, '-'] as const
    if (typeof value === 'object') return [key, JSON.stringify(value)] as const
    return [key, String(value)] as const
  })
})

const avatar = computed(() => {
  if (avatarPreview.value) return avatarPreview.value
  return getAssetUrl(getUserAvatarId(user.value))
})

const onAvatarChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  avatarFile.value = file
  const reader = new FileReader()
  reader.onload = () => {
    avatarPreview.value = String(reader.result || '')
  }
  reader.readAsDataURL(file)
}

const loadProfile = async () => {
  const storedId = localStorage.getItem('gb_user_id')
  if (!storedId) {
    user.value = null
    return
  }

  error.value = ''
  isLoading.value = true
  try {
    const me = await fetchUserById(storedId)
    user.value = me
    name.value = [me.first_name, me.last_name].filter(Boolean).join(' ').trim() || ''
    await loadUserBooks(me.id ? String(me.id) : '')
  } catch {
    error.value = 'Nao foi possivel carregar o perfil.'
  } finally {
    isLoading.value = false
  }
}

const loadUserBooks = async (userId: string) => {
  if (!userId) return
  isLoadingBooks.value = true
  try {
    userBooks.value = await fetchUserBooks(userId)
    selectedBookId.value = userBooksList.value[0]?.book_id ?? null
  } catch {
    error.value = 'Nao foi possivel carregar os livros do utilizador.'
  } finally {
    isLoadingBooks.value = false
  }
}

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

const saveProfile = async () => {
  error.value = ''
  if (!user.value?.id) return
  const trimmedName = name.value.trim()
  const [firstName, ...rest] = trimmedName.split(' ').filter(Boolean)
  const lastName = rest.join(' ') || undefined
  try {
    user.value = await updateUser(user.value.id, {
      first_name: firstName || undefined,
      last_name: lastName,
    })
    if (avatarFile.value) {
      const avatarId = await uploadUserAvatar(String(user.value.id), avatarFile.value)
      user.value = { ...user.value, avatar: avatarId }
      avatarFile.value = null
      avatarPreview.value = ''
    }
    window.dispatchEvent(new Event('gb-auth-changed'))
  } catch {
    error.value = 'Nao foi possivel guardar o perfil.'
  }
}

onMounted(loadProfile)
</script>

<template>
  <section class="profile">
    <div class="card">
      <h1>Perfil</h1>
      <div class="form">
        <label>
          Nome
          <input v-model="name" type="text" />
        </label>
        <label>
          Avatar
          <input type="file" accept="image/*" @change="onAvatarChange" />
        </label>
        <div v-if="avatar" class="avatar">
          <img :src="avatar" alt="Avatar" />
        </div>
        <p v-if="isLoading" class="state">A carregar perfil...</p>
        <p v-else-if="error" class="state error">{{ error }}</p>
        <button class="btn" type="button" @click="saveProfile">Guardar</button>
      </div>
    </div>

    <div class="card">
      <h2>Progresso</h2>
      <div class="stats">
        <div>
          <span>Total pontos</span>
          <strong>{{ stats.points ?? '-' }}</strong>
        </div>
        <div>
          <span>Nivel</span>
          <strong>{{ stats.level ?? '-' }}</strong>
        </div>
        <div>
          <span>XP para o proximo nivel</span>
          <strong>{{ xpToNext }}</strong>
        </div>
      </div>
      <div class="progress">
        <div class="bar" :style="{ width: `${progressPercent}%` }"></div>
      </div>
      <p class="meta">{{ levelProgress.progress }} / {{ levelProgress.nextLevelXp }} XP</p>
    </div>

    <div class="card">
      <h2>Minha colecao</h2>
      <p class="meta">Livros associados ao teu perfil.</p>
      <p v-if="isLoadingBooks" class="state">A carregar livros...</p>
      <div v-else-if="userBooksList.length" class="book-grid">
        <button v-for="book in userBooksList" :key="book.book_id" class="book-card" type="button"
          :class="{ selected: book.book_id === selectedBookId }" @click="selectedBookId = book.book_id">
          <div class="cover">
            <img v-if="book.cover_img" :src="getAssetUrl(book.cover_img)" alt="" />
            <span v-else>Livro</span>
          </div>
          <div>
            <p class="title">{{ book.title || 'Sem titulo' }}</p>
            <p class="meta">{{ book.publisher || 'Sem editora' }}</p>
          </div>
        </button>
      </div>
      <p v-else class="state">Sem livros associados.</p>
    </div>

    <div class="card">
      <h2>Dados do utilizador</h2>
      <p class="meta">Campos do utilizador atual vindos do Directus.</p>
      <div v-if="userFields.length" class="field-grid">
        <div v-for="[key, value] in userFields" :key="key" class="field-row">
          <span class="field-key">{{ key }}</span>
          <span class="field-value">{{ value }}</span>
        </div>
      </div>
      <p v-else class="state">Sem dados para mostrar.</p>
    </div>

    <div class="card">
      <h2>Exercicios do modulo</h2>
      <p class="meta">Escolhe um modulo e completa exercicios para ganhar pontos.</p>
      <div class="picker">
        <label>
          Modulo
          <select v-model.number="selectedModuleId" :disabled="!selectedBookId || isLoadingModules">
            <option :value="null">Seleciona um modulo</option>
            <option v-for="moduleItem in modules" :key="moduleItem.modules_id" :value="moduleItem.modules_id">
              {{ moduleItem.module_title || `Modulo ${moduleItem.modules_id}` }}
            </option>
          </select>
        </label>
        <span class="meta" v-if="selectedBook">Livro: {{ selectedBook.title }}</span>
      </div>

      <p v-if="isLoadingModules" class="state">A carregar modulos...</p>
      <p v-else-if="isLoadingExercises" class="state">A carregar exercicios...</p>

      <div v-else-if="exercises.length" class="exercise-grid">
        <article v-for="exercise in exercises" :key="exercise.exercise_id" class="exercise-card">
          <div class="exercise-top">
            <span class="badge">{{ exercise.type || 'exercicio' }}</span>
            <span class="pill">+{{ pointsByExercise }} XP</span>
          </div>
          <p class="question">
            {{ (exercise.content as any)?.pergunta || (exercise.content as any)?.question || 'Pergunta indisponivel' }}
          </p>
          <button class="ghost" type="button" :disabled="completedExerciseIds.includes(exercise.exercise_id || 0)"
            @click="completeExercise(exercise)">
            {{ completedExerciseIds.includes(exercise.exercise_id || 0) ? 'Concluido' : 'Concluir' }}
          </button>
        </article>
      </div>
      <p v-else class="state">Sem exercicios disponiveis.</p>
    </div>

  </section>
</template>

<style scoped>
.profile {
  display: grid;
  gap: 24px;
}

.card {
  background: #ffffff;
  padding: 22px;
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}

.form {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

label {
  display: grid;
  gap: 6px;
  font-weight: 600;
}

input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d7d7d7;
}

.avatar img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #0c7a5a;
}

.btn {
  width: fit-content;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  background: #0c7a5a;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.stats div {
  background: #f5faf8;
  padding: 12px;
  border-radius: 12px;
  display: grid;
  gap: 4px;
}

.progress {
  height: 8px;
  background: #eef3f0;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 12px;
}

.bar {
  height: 100%;
  background: linear-gradient(90deg, #0c7a5a, #6bd3b0);
}

ul {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  gap: 10px;
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-weight: 700;
}

.meta {
  font-size: 12px;
  color: #6f6f6f;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.book-card {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  border: 2px solid transparent;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);
}

.book-card.selected {
  border-color: #0c7a5a;
  box-shadow: 0 14px 26px rgba(12, 122, 90, 0.16);
}

.book-card .cover {
  width: 70px;
  height: 90px;
  border-radius: 12px;
  background: linear-gradient(160deg, #0c7a5a, #6bd3b0);
  color: #fff;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-weight: 700;
}

.book-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.picker {
  display: grid;
  gap: 12px;
  margin: 12px 0;
}

.picker select {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d7d7d7;
}

.exercise-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.field-grid {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.field-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8faf9;
  border: 1px solid #e6ecea;
}

.field-key {
  font-weight: 700;
  color: #2f2f2f;
}

.field-value {
  color: #4a4a4a;
  word-break: break-word;
}

.exercise-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 12px;
  border: 1px solid #e7e7e7;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);
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

.pill {
  font-size: 12px;
  font-weight: 700;
  color: #0c7a5a;
  background: #e7f7f0;
  padding: 4px 10px;
  border-radius: 999px;
}

.question {
  margin: 0;
  font-weight: 600;
}

.ghost {
  width: fit-content;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #d0d0d0;
  background: transparent;
  font-weight: 600;
  cursor: pointer;
}

.state {
  font-weight: 600;
  color: #6f6f6f;
}

.error {
  color: #b13b3b;
}
</style>
