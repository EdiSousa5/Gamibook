<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import heroUrl from '@/assets/images/person_and_books.png'
import { BookOpenIcon, FireIcon, QuestionMarkCircleIcon, TrophyIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline'
import {
  fetchUserBooks,
} from '../services/books'
import { fetchUserById, getUserAvatarId, getUserDisplayName } from '../services/auth'
import { getAssetUrl } from '../services/client'
import { getLevelProgressFromPoints } from '../utils/gamification'
import type { Book, User, UserBook } from '@/types'

const user = ref<User | null>(null)
const error = ref('') // General error message
const userBooks = ref<UserBook[]>([])
const pointsByExercise = 10

const displayUserName = (entry?: User | null) => getUserDisplayName(entry)

const userBooksList = computed(() =>
  userBooks.value.map((entry) => entry.book_id).filter((book): book is Book => !!book),
)

// O Último livro a ser apresentado como destaque (Continuar a Ler)
const recentBook = computed(() => userBooksList.value.length > 0 ? userBooksList.value[0] : null)

const booksObtained = computed(() => userBooksList.value.length)
const answeredQuestions = computed(() => Math.max(0, Math.floor((user.value?.points ?? 0) / pointsByExercise)))
const levelProgress = computed(() => getLevelProgressFromPoints(user.value?.points ?? 0))

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
    // Carregamos o perfil do utilizador e os seus livros
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
          Explora conteúdos, desbloqueia módulos e pratica com exercícios gamificados pensados para reforçar a tua
          aprendizagem.
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
      <!-- Destaque: Continuar a Jogar -->
      <section class="panel feature-panel">
        <div class="panel-header">
          <div>
            <h2>Retomar Aprendizagem</h2>
            <p class="meta">Continua a fazer os exercícios do teu último livro acedido.</p>
          </div>
        </div>
        <div v-if="recentBook" class="featured-book">
          <div class="book-cover">
            <img v-if="recentBook.cover_img" :src="getAssetUrl(recentBook.cover_img)" alt="Capa" />
            <span v-else>Livro</span>
          </div>
          <div class="book-info">
            <p class="eyebrow">A ler atualmente</p>
            <h3 class="title">{{ recentBook.title || 'Sem título' }}</h3>
            <p class="meta">{{ (recentBook as any).editora?.nome_editora || 'Sem editora' }}</p>
            <div class="book-action">
              <RouterLink :to="`/book/${(recentBook as any).book_id}`">
                <UiButton variant="primary">Fazer Exercícios</UiButton>
              </RouterLink>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon-wrap">
            <BookOpenIcon class="icon-lg" aria-hidden="true" />
          </div>
          <h3>Nenhum livro na coleção</h3>
          <p class="empty-desc">Ainda não adicionaste nenhum livro. Explora o catálogo para começares a tua aventura!
          </p>
          <RouterLink to="/collection" class="mt-3 block">
            <UiButton variant="primary">Explorar Catálogo</UiButton>
          </RouterLink>
        </div>
      </section>

      <!-- Atalhos / Explorar -->
      <section class="panel explore-panel">
        <div class="panel-header">
          <div>
            <h2>Explorar o GamiBook</h2>
            <p class="meta">Descobre novos conteúdos e acompanha o teu progresso.</p>
          </div>
        </div>
        <div class="explore-grid">
          <RouterLink to="/collection" class="explore-link">
            <UiCard class="explore-card">
              <div class="explore-icon bg-pumpkin">
                <BookOpenIcon class="icon text-white" aria-hidden="true" />
              </div>
              <div class="explore-text">
                <h3>Catálogo</h3>
                <p>Encontra novos livros e adiciona-os à tua coleção.</p>
              </div>
            </UiCard>
          </RouterLink>

          <RouterLink to="/leaderboard" class="explore-link">
            <UiCard class="explore-card">
              <div class="explore-icon bg-blue">
                <TrophyIcon class="icon text-white" aria-hidden="true" />
              </div>
              <div class="explore-text">
                <h3>Classificação</h3>
                <p>Compara a tua pontuação com a de outros utilizadores.</p>
              </div>
            </UiCard>
          </RouterLink>

          <RouterLink to="/settings/conta" class="explore-link">
            <UiCard class="explore-card">
              <div class="explore-icon bg-green">
                <Cog6ToothIcon class="icon text-white" aria-hidden="true" />
              </div>
              <div class="explore-text">
                <h3>A Minha Conta</h3>
                <p>Gere o teu perfil, avatar e definições pessoais.</p>
              </div>
            </UiCard>
          </RouterLink>
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
  display: flex;
  flex-direction: column;
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

/* Destaque Livro */
.featured-book {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: var(--space-400);
  padding: var(--space-400);
  border-radius: 12px;
  background: var(--color-wild-200);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.book-cover {
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-wild-300);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 rgba(2, 29, 32, 0.15);
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--color-mirage-600);
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.eyebrow {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--color-mirage-500);
  margin-bottom: 4px;
}

.book-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.book-info h3 {
  margin: 0;
  font-size: 20px;
  color: var(--color-mirage-900);
}

.book-action {
  margin-top: var(--space-200);
}

/* Empty State Livro */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-500) 0;
  gap: var(--space-200);
}

.empty-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-wild-200);
  display: grid;
  place-items: center;
  margin-bottom: var(--space-200);
}

.empty-state h3 {
  margin: 0;
  font-size: 18px;
  color: var(--color-mirage-900);
}

.empty-desc {
  margin: 0;
  color: var(--color-mirage-600);
  max-width: 400px;
}

/* Grelha de Atalhos (Explorar) */
.explore-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-400);
}

.explore-link {
  text-decoration: none;
  color: inherit;
}

.explore-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-300);
  height: 100%;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.explore-card:hover {
  transform: translateY(-4px);
  box-shadow: 8px 8px 0 var(--color-shadow);
}

.explore-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.explore-text h3 {
  margin: 0 0 6px 0;
  font-size: 16px;
}

.explore-text p {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-600);
}

.mt-3 {
  margin-top: 12px;
}

.error {
  color: #b13b3b;
  font-weight: 600;
}

/* Utilitários de Cor */
.bg-pumpkin {
  background: var(--color-pumpkin-500);
}

.bg-blue {
  background: #3b82f6;
}

.bg-green {
  background: #10b981;
}

.text-white {
  color: #ffffff !important;
}

.edit-link {
  text-decoration: none;
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .profile-left {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .featured-book {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .book-cover {
    width: 140px;
    margin: 0 auto;
  }

  .book-action {
    align-self: center;
  }
}

.icon {
  width: 18px;
  height: 18px;
  color: var(--color-mirage-800);
  stroke-width: var(--icon-stroke);
}

.icon-lg {
  width: 28px;
  height: 28px;
  color: var(--color-mirage-500);
}
</style>
