<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import heroUrl from '@/assets/images/person_and_books.png'
import { BookOpenIcon, FireIcon, QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import {
  fetchApprovedBooks,
  fetchUserById,
  fetchUserBooks,
  fetchUsers,
  getAssetUrl,
  getUserAvatarId,
  getUserDisplayName,
  getLevelProgressFromPoints,
  type Book,
  type User,
  type UserBook,
} from '../services/directus'

const user = ref<User | null>(null)
const books = ref<Book[]>([])
const ranking = ref<User[]>([])
const error = ref('')
const userBooks = ref<UserBook[]>([])
const pointsByExercise = 10

const displayUserName = (entry?: User | null) => getUserDisplayName(entry)

const userBooksList = computed(() =>
  userBooks.value.map((entry) => entry.book_id).filter((book): book is Book => !!book),
)

const booksObtained = computed(() => userBooksList.value.length)
const answeredQuestions = computed(() => Math.max(0, Math.floor((user.value?.points ?? 0) / pointsByExercise)))
const levelProgress = computed(() => getLevelProgressFromPoints(user.value?.points ?? 0))
const bookProgress = computed(() => {
  const total = Math.max(books.value.length, 1)
  const current = userBooksList.value.length
  return {
    current,
    total,
    percent: Math.min(100, Math.round((current / total) * 100)),
  }
})

const avatar = computed(() => getAssetUrl(getUserAvatarId(user.value)))

const loadUserBooks = async (userId: string) => {
  if (!userId) return
  try {
    userBooks.value = await fetchUserBooks(userId)
  } catch {
    error.value = 'Nao foi possivel carregar os livros do utilizador.'
  }
}

const loadProfile = async () => {
  const storedId = localStorage.getItem('gb_user_id')
  if (!storedId) {
    user.value = null
    return
  }

  error.value = ''
  try {
    const me = await fetchUserById(storedId)
    user.value = me
    await loadUserBooks(me.id ? String(me.id) : '')
  } catch {
    error.value = 'Nao foi possivel carregar o perfil.'
  }
}

onMounted(async () => {
  error.value = ''
  try {
    const [bookList, topUsers] = await Promise.all([fetchApprovedBooks(), fetchUsers(10)])
    books.value = bookList
    ranking.value = topUsers
    await loadProfile()
  } catch {
    error.value = 'Nao foi possivel carregar os dados do dashboard.'
  }
})
</script>

<template>
  <section class="dashboard">
    <header class="hero">
      <div class="hero-copy">
        <h1>Aprende para além das páginas do livro.</h1>
        <p class="subtitle">
          Explora conteúdos, desbloqueia módulos e pratica com exercícios gamificados pensados para reforçar a tua aprendizagem.
        </p>
      </div>
      <div class="hero-visual">
        <img :src="heroUrl" alt="Livros" />
      </div>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="profile-card">
      <div class="profile-left">
        <div class="profile-avatar" :class="{ fallback: !avatar }">
          <img v-if="avatar" :src="avatar" alt="Avatar" />
          <span v-else>{{ displayUserName(user).charAt(0).toUpperCase() }}</span>
        </div>
        <div class="profile-info">
          <div class="name-row">
            <h2>{{ displayUserName(user) }}</h2>
            <RouterLink to="/settings/conta" class="edit-link" aria-label="Editar">
              <UiIconButton variant="outline">
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 16.5V20h3.5L19 8.5l-3.5-3.5L4 16.5z" fill="none" stroke="currentColor"
                    stroke-width="var(--icon-stroke)" />
                </svg>
              </UiIconButton>
            </RouterLink>
          </div>
          <div class="profile-stats">
            <div class="mini-stat">
              <div class="mini-icon">
                <FireIcon class="icon" aria-hidden="true" />
              </div>
              <div class="mini-text">
                <strong>3</strong>
                <span>Maior streak</span>
              </div>
            </div>
            <div class="mini-stat">
              <div class="mini-icon">
                <BookOpenIcon class="icon" aria-hidden="true" />
              </div>
              <div class="mini-text">
                <strong>{{ booksObtained }}</strong>
                <span>Livros obtidos</span>
              </div>
            </div>
            <div class="mini-stat">
              <div class="mini-icon">
                <QuestionMarkCircleIcon class="icon" aria-hidden="true" />
              </div>
              <div class="mini-text">
                <strong>{{ answeredQuestions }}</strong>
                <span>Perguntas respondidas</span>
              </div>
            </div>
          </div>
          <div class="profile-progress">
            <div class="progress-info">
              <span>Nivel {{ levelProgress.level }}</span>
              <span>{{ levelProgress.progress }}/{{ levelProgress.nextLevelXp }} XP</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill"
                :style="{ width: `${Math.min(100, Math.round((levelProgress.progress / levelProgress.nextLevelXp) * 100))}%` }">
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="layout">
      <section class="panel">
        <div class="panel-header">
          <h2>Livros</h2>
          <span class="meta">{{ bookProgress.current }}</span>
        </div>
        <ul v-if="userBooksList.length" class="book-list">
          <li v-for="book in userBooksList" :key="book.book_id" class="panel-book">
            <div>
              <p class="title">{{ book.title || 'Sem titulo' }}</p>
              <p class="meta">{{ book.publisher || 'Sem editora' }}</p>
            </div>
            <RouterLink :to="`/book/${book.book_id}`" class="action">Abrir</RouterLink>
          </li>
        </ul>
        <p v-else class="empty">Sem livros associados.</p>
        <div class="panel-footer">
          <UiButton size="sm" variant="outline">Ver mais</UiButton>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Estatisticas</h2>
        </div>
        <ol v-if="ranking.length" class="rank-list">
          <li v-for="rankUser in ranking" :key="rankUser.id || rankUser.email || rankUser.name">
            <span>{{ displayUserName(rankUser) }}</span>
            <strong>{{ rankUser.points ?? '-' }}</strong>
          </li>
        </ol>
        <p v-else class="empty">Sem ranking disponivel.</p>
        <div class="panel-footer">
          <UiButton size="sm" variant="outline">Ver mais</UiButton>
        </div>
      </section>
    </div>

  </section>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: var(--space-600);
}

.hero {
  background: var(--color-wild-100);
  border-radius: var(--radius-400);
  padding: var(--space-500);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  gap: var(--space-400);
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  align-items: center;
}

.hero-copy {
  display: grid;
  gap: var(--space-200);
}

.hero-visual {
  display: grid;
  place-items: center;
  padding: var(--space-300);
  background: var(--color-wild-100);
}

.hero-visual img {
  width: min(280px, 100%);
  height: auto;
}

.profile-avatar {
  width: 150px;
  height: 150px;
  border-radius: 22px;
  overflow: hidden;
  background: var(--color-deep-600);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 22px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}


.profile-card {
  background: var(--color-wild-100);
  border-radius: var(--radius-400);
  padding: var(--space-500);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.profile-left {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-400);
  align-items: center;
}

.profile-info {
  display: grid;
  gap: var(--space-300);
}

.name-row {
  display: flex;
  align-items: center;
  gap: var(--space-200);
}

.name-row h2 {
  margin: 0;
  font-size: 22px;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-200);
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  align-items: center;
  padding: var(--space-200) var(--space-300);
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
}

.mini-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: #fff;
  display: grid;
  place-items: center;
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.mini-text {
  display: grid;
  gap: 4px;
}

.mini-stat strong {
  display: block;
  font-size: 20px;
}

.mini-stat span {
  display: block;
  font-size: 14px;
  color: var(--color-mirage-600);
}

.profile-progress {
  display: grid;
  gap: 10px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--color-mirage-600);
  font-weight: 600;
}

.progress-bar {
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-500));
}

.layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-400);
}

.panel {
  background: var(--color-wild-100);
  border-radius: var(--radius-400);
  padding: var(--space-500);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  gap: var(--space-300);
}

.panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-200);
}

.panel-header .meta {
  color: var(--color-mirage-500);
  font-size: 12px;
  font-weight: 600;
}

.panel-progress {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  font-size: 12px;
  color: var(--color-mirage-600);
}

.book-list,
.rank-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: var(--space-200);
}

.panel-book,
.rank-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-200);
  padding: var(--space-200);
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
}

.title {
  font-weight: 700;
}

.meta {
  font-size: 12px;
  color: var(--color-mirage-600);
}


.bar {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
}

.fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-500));
}

.action {
  justify-self: start;
  text-decoration: none;
  font-weight: 600;
  color: var(--color-deep-700);
}

.edit-link {
  text-decoration: none;
}

.empty {
  margin-top: 12px;
  color: var(--color-mirage-600);
  font-weight: 600;
}

.error {
  color: #b13b3b;
  font-weight: 600;
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .profile-left {
    grid-template-columns: 1fr;
  }
}

.panel-footer {
  display: flex;
  justify-content: center;
}

.icon {
  width: 18px;
  height: 18px;
  color: var(--color-mirage-800);
  stroke-width: var(--icon-stroke);
}
</style>
