<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import UiButton from '@/components/ui/UiButton.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import BookMockup from '@/components/ui/BookMockup.vue'
import BookBadge from '@/components/ui/BookBadge.vue'
import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'
import heroUrl from '@/assets/images/person_and_books.png'
import {
  FireIcon,
  BookOpenIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  LockClosedIcon,
  TrophyIcon,
  StarIcon,
} from '@heroicons/vue/24/outline'
import { fetchUserBooks, fetchModule } from '../services/books'
import { fetchUsers, getUserDisplayName, updateUser } from '../services/auth'
import { getAssetUrl } from '../services/client'
import {
  fetchLatestUserDailyExercise,
  fetchLatestUserExercise,
  fetchAllUsersPoints,
} from '../services/exercises'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useNotificationsStore } from '@/stores/notifications'
import { BADGE_TIERS, TIER_LABELS, TIER_DESCS } from '@/utils/badgeTiers'
import { DAILY_UNLOCK_LEVEL } from '@/utils/constants'
import type { Book, UserBook } from '@/types'

const auth = useAuthStore()
const { user, avatarUrl, progress, avatarConfig } = storeToRefs(auth)
const toast = useToast()
const notifStore = useNotificationsStore()
const userBooks = ref<UserBook[]>([])
const isLoadingProfile = ref(true)

type DailyStatus = 'loading' | 'ready' | 'cooldown' | 'no-exercises' | 'locked'
const dailyStatus = ref<DailyStatus>('loading')
const dailyCooldownSeconds = ref(0)
const dailyLastQuestion = ref('')
const dailyWasCorrect = ref<boolean | null>(null)
let dailyTimer: number | null = null

const recentUserBook = ref<UserBook | null>(null)
const recentBook = computed(() => (recentUserBook.value?.book_id as Book) ?? null)
const recentBookId = computed(() => recentBook.value?.book_id ?? null)
const recentBadge = computed<BookBadgeTier | undefined>(() => {
  const b = recentUserBook.value?.current_badge
  return b && b !== 'default' ? (b as BookBadgeTier) : undefined
})

const dailyStreak = computed(() => user.value?.exercises_daily_streak ?? 0)
const bestStreak = computed(() => user.value?.best_exercises_daily_streak ?? 0)
const booksObtained = computed(() => userBooks.value.length)

const progressPct = computed(() =>
  progress.value.nextLevelXp
    ? Math.min(100, Math.round((progress.value.progress / progress.value.nextLevelXp) * 100))
    : 0,
)



const TIER_RANK: Record<BookBadgeTier, number> = { bronze: 0, silver: 1, gold: 2, diamond: 3, galaxy: 4 }

const badgeCounts = computed(() => {
  const counts: Record<BookBadgeTier, number> = { bronze: 0, silver: 0, gold: 0, diamond: 0, galaxy: 0 }
  for (const ub of userBooks.value) {
    const b = ub.current_badge as BookBadgeTier | 'default' | undefined
    if (!b || b === 'default' || !(b in TIER_RANK)) continue
    const rank = TIER_RANK[b]
    for (const tier of BADGE_TIERS) {
      if (TIER_RANK[tier] <= rank) counts[tier]++
    }
  }
  return counts
})

const totalBadges = computed(() =>
  userBooks.value.filter(ub => ub.current_badge && ub.current_badge !== 'default').length
)

const currentRank = ref<number | null>(null)
const bestRank = ref<number | null>(null)

const formatDailyCooldown = computed(() => {
  const h = Math.floor(dailyCooldownSeconds.value / 3600)
  const m = Math.floor((dailyCooldownSeconds.value % 3600) / 60)
  const s = dailyCooldownSeconds.value % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const startDailyCooldownTimer = (lastDate: string) => {
  const nextTime = new Date(lastDate).getTime() + 24 * 60 * 60 * 1000
  const update = () => {
    dailyCooldownSeconds.value = Math.max(0, Math.floor((nextTime - Date.now()) / 1000))
    if (dailyCooldownSeconds.value <= 0 && dailyTimer !== null) {
      clearInterval(dailyTimer)
      dailyTimer = null
      dailyStatus.value = 'ready'
    }
  }
  update()
  dailyTimer = window.setInterval(update, 1000)
}

const loadDailyStatus = async (userId: string, books: UserBook[]) => {
  try {
    // Verificar nível mínimo para desafios diários
    const userLevel = auth.progress.level
    if (userLevel < DAILY_UNLOCK_LEVEL) {
      dailyStatus.value = 'locked'
      return
    }

    const latest = await fetchLatestUserDailyExercise(userId)
    const lastDateStr = latest?.date_created ?? null

    if (lastDateStr) {
      const elapsed = Date.now() - new Date(lastDateStr).getTime()
      const ONE_DAY = 24 * 60 * 60 * 1000

      if (elapsed < ONE_DAY) {
        const ex = latest?.exercise_id as { content?: Record<string, unknown> } | null
        if (ex?.content) {
          dailyLastQuestion.value = String(
            ex.content.pergunta ?? ex.content.question ?? ex.content.enunciado ?? '',
          )
        }
        dailyWasCorrect.value = latest?.is_correct ?? null
        startDailyCooldownTimer(lastDateStr)
        dailyStatus.value = 'cooldown'
        return
      } else if (elapsed >= 2 * ONE_DAY) {
        const streak = auth.user?.exercises_daily_streak ?? 0
        if (streak > 0) {
          await updateUser(userId, { exercises_daily_streak: 0 })
          if (auth.user) auth.user.exercises_daily_streak = 0
          toast.warning('O teu streak foi reiniciado por não teres feito o desafio diário a tempo.')
        }
      }
    }

    const hasBooks = books.some((ub) => {
      const b = ub.book_id
      return typeof b === 'object' ? !!b?.book_id : typeof b === 'number'
    })
    dailyStatus.value = hasBooks ? 'ready' : 'no-exercises'
  } catch {
    dailyStatus.value = 'no-exercises'
  }
}

const checkLeaderboardNotification = async (userId: string) => {
  try {
    const [users, pointsMap] = await Promise.all([
      fetchUsers(100),
      fetchAllUsersPoints(),
    ])

    const sorted = users
      .map((u) => ({ id: String(u.id ?? ''), totalPoints: pointsMap.get(String(u.id ?? '')) ?? 0 }))
      .sort((a, b) => b.totalPoints - a.totalPoints)

    const idx = sorted.findIndex((u) => u.id === userId)
    const rankValue = idx >= 0 ? idx + 1 : null
    currentRank.value = rankValue

    if (rankValue !== null) {
      const bestKey = `gb_best_rank_${userId}`
      const prevBestStr = localStorage.getItem(bestKey)
      const prevBest = prevBestStr ? parseInt(prevBestStr, 10) : null
      if (prevBest === null || rankValue < prevBest) {
        localStorage.setItem(bestKey, String(rankValue))
        bestRank.value = rankValue
      } else {
        bestRank.value = prevBest
      }
    }

    if (!rankValue) return

    const storedKey = `gb_last_rank_${userId}`
    const prevRankStr = localStorage.getItem(storedKey)
    const prevRank = prevRankStr ? parseInt(prevRankStr, 10) : null
    localStorage.setItem(storedKey, String(rankValue))

    if (prevRank === null || prevRank === rankValue) return

    if (rankValue < prevRank) {
      notifStore.add({
        user: userId,
        title: 'Subiste no ranking!',
        message: `Passaste da posição ${prevRank} para a posição ${rankValue} na tabela de classificação.`,
        type: 'achievement',
      })
    } else {
      notifStore.add({
        user: userId,
        title: 'Desceste no ranking',
        message: `Passaste da posição ${prevRank} para a posição ${rankValue} na tabela de classificação.`,
        type: 'system',
      })
    }
  } catch { /* silent */ }
}

const loadRecentBook = async (userId: string) => {
  try {
    const latestEx = await fetchLatestUserExercise(userId).catch(() => null)
    if (latestEx?.module_id) {
      const moduleId = typeof latestEx.module_id === 'object' ? latestEx.module_id.modules_id : latestEx.module_id
      const modData = await fetchModule(moduleId).catch(() => null)
      if (modData?.id_book) {
        const ub = userBooks.value.find(b => (b.book_id as Book)?.book_id === modData.id_book)
        if (ub) {
          recentUserBook.value = ub
          return
        }
      }
    }
  } catch (err) { }
  recentUserBook.value = userBooks.value[0] ?? null
}

onMounted(async () => {
  isLoadingProfile.value = true
  try {
    if (!auth.user) await auth.loadUser()
    const userId = user.value?.id ? String(user.value.id) : null
    if (!userId) return
    const storedBest = localStorage.getItem(`gb_best_rank_${userId}`)
    if (storedBest) bestRank.value = parseInt(storedBest, 10)
    const [books] = await Promise.all([
      fetchUserBooks(userId).catch(() => [] as UserBook[]),
      checkLeaderboardNotification(userId),
    ])
    userBooks.value = books
    await loadRecentBook(userId)
    await loadDailyStatus(userId, books)
    if (dailyStatus.value === 'ready' && dailyStreak.value > 0) {
      const n = dailyStreak.value
      toast.warning(`O teu streak de ${n} ${n === 1 ? 'dia' : 'dias'} expira hoje se não responderes!`, 6000)
    }
  } catch {
    toast.error('Não foi possível carregar o dashboard.')
  } finally {
    isLoadingProfile.value = false
  }
})

onUnmounted(() => {
  if (dailyTimer !== null) clearInterval(dailyTimer)
})
</script>

<template>
  <section class="dashboard">

    <!-- ── HERO ───────────────────────────────────────────── -->
    <header class="hero">
      <div class="hero-copy">
        <h1>Aprende para além das páginas do livro.</h1>
        <p class="subtitle">
          Explora conteúdos, desbloqueia módulos e pratica com exercícios gamificados
          pensados para reforçar a tua aprendizagem.
        </p>
      </div>
      <div class="hero-visual">
        <img :src="heroUrl" alt="Livros" />
      </div>
    </header>

    <!-- ── PROFILE CARD ───────────────────────────────────── -->
    <section class="profile-card">
      <template v-if="isLoadingProfile && !user">
        <div class="profile-top">
          <UiSkeleton width="6.25rem" height="6.25rem" radius="22px" />
          <div class="profile-info">
            <UiSkeleton height="28px" width="180px" radius="8px" />
            <UiSkeleton height="10px" radius="999px" />
          </div>
        </div>
        <div class="profile-stats">
          <UiSkeleton v-for="i in 6" :key="i" height="64px" radius="14px" />
        </div>
      </template>

      <template v-else>
        <div class="profile-top">
          <div class="profile-avatar-wrapper">
            <UiAvatar
              :src="avatarUrl || undefined"
              :alt="getUserDisplayName(user).charAt(0)"
              :size="100"
              :border="avatarConfig.border"
              :avatar-color="avatarConfig.avatarColor"
              :effect="avatarConfig.effect"
              :shadow="avatarConfig.shadow"
            />
          </div>
          <div class="profile-info">
            <div class="name-row">
              <h2>{{ getUserDisplayName(user) }}</h2>
              <RouterLink to="/settings/conta" aria-label="Editar perfil" class="edit-link">
                <UiIconButton variant="outline">
                  <PencilSquareIcon class="icon" aria-hidden="true" />
                </UiIconButton>
              </RouterLink>
              <div class="level-chip">Nível {{ progress.level }}</div>
            </div>
            <div class="profile-progress">
              <div class="progress-info">
                <span>Nível {{ progress.level }}</span>
                <span>{{ progress.progress }}/{{ progress.nextLevelXp }} XP</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${progressPct}%` }" />
              </div>
            </div>
          </div>
        </div>

        <div class="profile-stats">
          <div class="mini-stat" :class="{ 'mini-stat--hot': bestStreak >= 2 }">
            <div class="mini-icon"><FireIcon class="icon" aria-hidden="true" /></div>
            <div class="mini-text"><strong>{{ bestStreak }}</strong><span>Melhor Streak</span></div>
          </div>
          <div class="mini-stat" :class="{ 'mini-stat--hot': dailyStreak >= 2 }">
            <div class="mini-icon"><FireIcon class="icon" aria-hidden="true" /></div>
            <div class="mini-text"><strong>{{ dailyStreak }}</strong><span>Streak Atual</span></div>
          </div>
          <div class="mini-stat">
            <div class="mini-icon"><BookOpenIcon class="icon" aria-hidden="true" /></div>
            <div class="mini-text"><strong>{{ booksObtained }}</strong><span>Livros</span></div>
          </div>
          <div class="mini-stat">
            <div class="mini-icon"><SparklesIcon class="icon" aria-hidden="true" /></div>
            <div class="mini-text"><strong>{{ totalBadges }}</strong><span>Badges</span></div>
          </div>
          <div class="mini-stat">
            <div class="mini-icon"><TrophyIcon class="icon" aria-hidden="true" /></div>
            <div class="mini-text">
              <strong>{{ currentRank !== null ? `#${currentRank}` : '—' }}</strong>
              <span>Rank Atual</span>
            </div>
          </div>
          <div class="mini-stat">
            <div class="mini-icon"><StarIcon class="icon" aria-hidden="true" /></div>
            <div class="mini-text">
              <strong>{{ bestRank !== null ? `#${bestRank}` : '—' }}</strong>
              <span>Melhor Rank</span>
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- ── DAILY + RESUME ─────────────────────────────────── -->
    <div class="two-col">

      <!-- DESAFIO DIÁRIO -->
      <section class="daily-card" :class="`daily-card--${dailyStatus}`">
        <div class="daily-top">
          <div>
            <h2 class="daily-heading">Desafio Diário</h2>
            <p class="daily-sub-head">Uma pergunta por dia mantém o streak ativo!</p>
          </div>
          <div v-if="dailyStatus !== 'locked'" class="streak-pill" :class="{ 'streak-pill--hot': dailyStreak >= 2 }">
            <FireIcon class="streak-pill-icon" aria-hidden="true" />
            <strong>{{ dailyStreak }}</strong>
          </div>
        </div>

        <div v-if="dailyStatus === 'loading'" class="daily-body">
          <UiSkeleton height="72px" radius="14px" />
          <UiSkeleton height="48px" width="160px" radius="12px" />
        </div>

        <div v-else-if="dailyStatus === 'ready'" class="daily-body">
          <div class="daily-available">
            <div class="daily-icon-wrap" aria-hidden="true">
              <QuestionMarkCircleIcon class="daily-icon" />
            </div>
            <div class="daily-available-text">
              <p class="daily-available-title">Exercício disponível!</p>
              <p class="daily-available-desc">Responde agora e mantém o teu streak ativo.</p>
            </div>
          </div>
          <RouterLink to="/daily-exercise" class="daily-cta-link">
            <UiButton variant="primary">Responder Agora</UiButton>
          </RouterLink>
        </div>

        <div v-else-if="dailyStatus === 'cooldown'" class="daily-body">
          <div class="daily-done-row" :class="dailyWasCorrect === false ? 'daily-done-row--wrong' : 'daily-done-row--correct'">
            <CheckCircleIcon v-if="dailyWasCorrect !== false" class="daily-done-icon" aria-hidden="true" />
            <XCircleIcon v-else class="daily-done-icon daily-done-icon--wrong" aria-hidden="true" />
            <span class="daily-done-label">{{ dailyWasCorrect === false ? 'Erraste hoje' : 'Concluído hoje!' }}</span>
          </div>
          <div class="daily-timer-block">
            <p class="timer-label">Próximo desafio em</p>
            <strong class="timer-value">{{ formatDailyCooldown }}</strong>
          </div>
          <div v-if="dailyLastQuestion" class="daily-last">
            <p class="dl-label">Última pergunta</p>
            <p class="dl-text">{{ dailyLastQuestion }}</p>
          </div>
        </div>

        <div v-else-if="dailyStatus === 'locked'" class="daily-body daily-locked">
          <div class="daily-locked-icon-wrap">
            <LockClosedIcon class="daily-locked-icon" aria-hidden="true" />
          </div>
          <h3 class="daily-locked-title">Ainda bloqueado</h3>
          <p class="daily-locked-desc">Os desafios diários desbloqueiam ao atingires o <strong>nível {{ DAILY_UNLOCK_LEVEL }}</strong>. Completa exercícios nos módulos para subir de nível!</p>
          <RouterLink to="/collection">
            <UiButton variant="outline" size="sm">Explorar livros</UiButton>
          </RouterLink>
        </div>

        <div v-else class="daily-body daily-empty">
          <BookOpenIcon class="daily-empty-icon" aria-hidden="true" />
          <p>Sem exercícios disponíveis. Completa módulos primeiro!</p>
        </div>
      </section>

      <!-- RETOMAR APRENDIZAGEM -->
      <section class="resume-card">
        <h2 class="resume-heading">Retomar Aprendizagem</h2>

        <div v-if="isLoadingProfile && !recentBook" class="resume-skeleton">
          <UiSkeleton width="100px" height="145px" radius="6px" />
          <div class="resume-skeleton-info">
            <UiSkeleton height="12px" width="80px" radius="4px" />
            <UiSkeleton height="22px" width="160px" radius="6px" />
            <UiSkeleton height="12px" width="100px" radius="4px" />
            <UiSkeleton height="40px" width="130px" radius="10px" />
          </div>
        </div>

        <div v-else-if="recentBook" class="resume-body">
          <RouterLink v-if="recentBookId" :to="`/book/${recentBookId}`" class="resume-book-link">
            <BookMockup :cover-url="recentBook.cover_img ? getAssetUrl(recentBook.cover_img) : null"
              :title="recentBook.title ?? 'Livro'" size="sm" :badge="recentBadge" />
          </RouterLink>
          <div class="resume-info">
            <h3 class="resume-title">{{ recentBook.title || 'Sem título' }}</h3>
            <p v-if="recentBook?.editora?.nome_editora" class="resume-publisher">
              {{ recentBook.editora.nome_editora }}
            </p>
            <RouterLink v-if="recentBookId" :to="`/book/${recentBookId}`">
              <UiButton variant="primary" size="sm">Ir para o Livro</UiButton>
            </RouterLink>
          </div>
        </div>

        <div v-else class="resume-empty">
          <div class="resume-empty-icon-wrap">
            <BookOpenIcon class="resume-empty-icon" aria-hidden="true" />
          </div>
          <h3>Nenhum livro ainda</h3>
          <p>Adiciona um livro ao catálogo para começares.</p>
          <RouterLink to="/collection">
            <UiButton variant="outline" size="sm">Explorar Catálogo</UiButton>
          </RouterLink>
        </div>
      </section>
    </div>

    <!-- ── BADGES COLLECTION ──────────────────────────────── -->
    <section v-if="!isLoadingProfile && booksObtained > 0" class="badges-card">
      <div class="badges-header">
        <h2>Badges Conquistados</h2>
        <span class="badges-total-pill">
          <SparklesIcon class="badges-pill-icon" aria-hidden="true" />
          {{ totalBadges }} ganhos
        </span>
      </div>
      <div class="badges-list">
        <div v-for="tier in BADGE_TIERS" :key="tier" class="badge-row"
          :class="badgeCounts[tier] > 0 ? 'badge-row--earned' : 'badge-row--pending'">
          <BookBadge :tier="tier" size="sm" />
          <div class="badge-row-info">
            <span class="badge-row-name">{{ TIER_LABELS[tier] }}</span>
            <span class="badge-row-desc">{{ TIER_DESCS[tier] }}</span>
          </div>
          <div class="badge-row-count">
            <strong class="count-num">{{ badgeCounts[tier] }}</strong>
            <span class="count-label">{{ badgeCounts[tier] === 1 ? 'livro' : 'livros' }}</span>
          </div>
        </div>
      </div>
    </section>

  </section>
</template>

<style>
/* CUSTOM SCROLLBAR GLOBAL DO SITE */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-wild-200, #f1f5f9);
  border-radius: 8px;
}

::-webkit-scrollbar-thumb {
  background: var(--color-mirage-400, #94a3b8);
  border-radius: 8px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-mirage-500, #64748b);
}

* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-mirage-400, #94a3b8) var(--color-wild-200, #f1f5f9);
}
</style>

<style scoped>
.dashboard {
  display: grid;
  gap: var(--space-600);
}

/* ── HERO ───────────────────────────────────────────────── */
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

.hero-copy h1 {
  margin: 0;
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  font-weight: 900;
  color: var(--color-mirage-800);
  line-height: 1.2;
}

.subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-mirage-600);
  line-height: 1.6;
}

.hero-visual {
  display: grid;
  place-items: center;
}

.hero-visual img {
  width: min(16.25rem, 100%);
  height: auto;
}

/* ── PROFILE CARD ───────────────────────────────────────── */
.profile-card {
  background: var(--color-wild-100);
  border-radius: var(--radius-400);
  padding: var(--space-500);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  gap: var(--space-400);
}

.profile-top {
  display: flex;
  align-items: center;
  gap: var(--space-400);
}

.profile-avatar-wrapper {
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

.profile-info {
  display: grid;
  gap: var(--space-200);
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: var(--space-200);
}

.name-row h2 {
  margin: 0;
  font-size: clamp(1.125rem, 3vw, 1.375rem);
  font-weight: 800;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-link {
  flex-shrink: 0;
}

.level-chip {
  margin-left: auto;
  flex-shrink: 0;
  padding: 3px 12px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-deep-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
  font-size: 11px;
  font-weight: 800;
  color: var(--color-deep-700);
  white-space: nowrap;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-200);
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  padding: var(--space-200) var(--space-300);
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
  transition: background 0.2s ease;
}

.mini-stat--hot {
  background: var(--color-deep-100);
  border-color: var(--color-deep-600);
}

.mini-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  display: grid;
  place-items: center;
  box-shadow: 2px 2px 0 var(--color-shadow);
  flex-shrink: 0;
}

.mini-stat--hot .mini-icon {
  background: var(--color-deep-500);
  border-color: var(--color-deep-600);
}

.mini-stat--hot .icon {
  color: #fff;
}

.mini-text {
  display: grid;
  gap: 3px;
}

.mini-stat strong {
  display: block;
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  font-weight: 800;
  color: var(--color-mirage-800);
  line-height: 1;
}

.mini-stat span {
  display: block;
  font-size: 0.75rem;
  color: var(--color-mirage-500);
  font-weight: 600;
}

.profile-progress {
  display: grid;
  gap: 8px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--color-mirage-600);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.progress-bar {
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-300);
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-500));
  border-radius: inherit;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.icon {
  width: 18px;
  height: 18px;
  stroke-width: 1.8;
}

/* ── TWO COLUMN ─────────────────────────────────────────── */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-400);
  align-items: stretch;
}

/* ── DAILY CARD ─────────────────────────────────────────── */
.daily-card {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 20px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  padding: var(--space-500);
  display: grid;
  gap: var(--space-400);
  align-content: start;
}

.daily-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-200);
}

.daily-heading {
  margin: 0;
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  font-weight: 800;
  color: var(--color-mirage-800);
}

.daily-sub-head {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--color-mirage-500);
  font-weight: 600;
}

.streak-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-deep-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
  font-weight: 800;
  font-size: 15px;
  flex-shrink: 0;
  color: var(--color-deep-700);
}

.streak-pill--hot {
  background: var(--color-deep-200);
  border-color: var(--color-deep-600);
}

.streak-pill-icon {
  width: 16px;
  height: 16px;
  color: var(--color-deep-600);
}

.daily-body {
  display: grid;
  gap: var(--space-300);
}

/* Ready state */
.daily-available {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  padding: var(--space-300) var(--space-400);
  border-radius: 14px;
  border: 2px solid var(--color-deep-600);
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.daily-icon-wrap {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 12px;
  background: var(--color-deep-600);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  display: grid;
  place-items: center;
}

.daily-icon {
  width: 28px;
  height: 28px;
  color: #fff;
  stroke-width: 1.5;
}

.daily-available-text {
  display: grid;
  gap: 3px;
}

.daily-available-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.daily-available-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-600);
}

.daily-cta-link {
  width: fit-content;
}

/* Cooldown state */
.daily-done-row {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  padding: var(--space-200) var(--space-300);
  border-radius: 10px;
  width: fit-content;
}

.daily-done-row--correct {
  background: var(--color-deep-100);
  border: 2px solid var(--color-deep-600);
}

.daily-done-row--wrong {
  background: var(--color-error-muted, #fff0f0);
  border: 2px solid var(--color-red-500, #ef4444);
}

.daily-done-icon {
  width: 20px;
  height: 20px;
  color: var(--color-deep-700);
}

.daily-done-icon--wrong {
  color: var(--color-error-strong, #dc2626);
}

.daily-done-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-deep-700);
}

.daily-done-row--wrong .daily-done-label {
  color: var(--color-error-strong, #dc2626);
}

.daily-timer-block {
  display: grid;
  gap: 4px;
  padding: var(--space-300) var(--space-400);
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.timer-label {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
}

.timer-value {
  font-size: clamp(1.5rem, 5vw, 2.375rem);
  font-weight: 900;
  color: var(--color-mirage-800);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.daily-last {
  padding: var(--space-300);
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-300);
}

.dl-label {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
}

.dl-text {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-mirage-700);
  line-height: 1.5;
}

.daily-empty {
  place-items: center;
  text-align: center;
  padding: var(--space-400);
}

.daily-empty-icon {
  width: 40px;
  height: 40px;
  color: var(--color-mirage-300);
  margin-bottom: var(--space-200);
}

.daily-empty p {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-500);
}

.daily-locked {
  place-items: center;
  text-align: center;
  padding: var(--space-400);
  gap: var(--space-300);
}

.daily-locked-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-wild-200);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  display: grid;
  place-items: center;
}

.daily-locked-icon {
  width: 26px;
  height: 26px;
  color: var(--color-mirage-400);
  stroke-width: 1.5;
}

.daily-locked-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--color-mirage-700);
}

.daily-locked-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
  line-height: 1.5;
  max-width: 220px;
}

/* ── RESUME CARD ────────────────────────────────────────── */
.resume-card {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 20px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  padding: var(--space-500);
  display: grid;
  gap: var(--space-300);
  align-content: start;
}

.resume-heading {
  margin: 0;
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  font-weight: 800;
  color: var(--color-mirage-800);
}

.resume-sub-head {
  margin: -4px 0 0;
  font-size: 12px;
  color: var(--color-mirage-500);
  font-weight: 600;
}

.resume-skeleton {
  display: flex;
  align-items: flex-start;
  gap: var(--space-300);
}

.resume-skeleton-info {
  flex: 1;
  display: grid;
  gap: 10px;
  align-content: start;
  padding-top: 4px;
}

.resume-body {
  display: flex;
  align-items: center;
  gap: var(--space-400);
  background: var(--color-wild-200);
  padding: var(--space-400);
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  margin-top: var(--space-200);
}

.resume-book-link {
  flex-shrink: 0;
}

.resume-info {
  display: grid;
  gap: var(--space-200);
  align-content: start;
  min-width: 0;
}

.eyebrow {
  margin: 0;
  background: var(--color-deep-600);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  width: fit-content;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.resume-title {
  margin: 0;
  font-size: clamp(1rem, 2.5vw, 1.125rem);
  font-weight: 800;
  color: var(--color-mirage-800);
  line-height: 1.2;
}

.resume-publisher {
  margin: 0;
  font-size: 12px;
  color: var(--color-mirage-500);
  font-weight: 600;
}

.resume-badge-row {
  display: flex;
  align-items: center;
  gap: var(--space-200);
}

.resume-badge-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-600);
}

.resume-empty {
  display: grid;
  place-items: center;
  gap: var(--space-300);
  padding: var(--space-400);
  text-align: center;
}

.resume-empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-wild-200);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  display: grid;
  place-items: center;
}

.resume-empty-icon {
  width: 26px;
  height: 26px;
  color: var(--color-mirage-400);
}

.resume-empty h3 {
  margin: 0;
  font-size: 16px;
}

.resume-empty p {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
}

/* ── BADGES CARD ────────────────────────────────────────── */
.badges-card {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 20px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  padding: var(--space-500);
  display: grid;
  gap: var(--space-400);
}

.badges-header {
  display: flex;
  align-items: center;
  gap: var(--space-200);
}

.badges-header h2 {
  margin: 0;
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  font-weight: 800;
  flex: 1;
}

.badges-total-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-600);
}

.badges-pill-icon {
  width: 14px;
  height: 14px;
}

.badges-list {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-200);
}

.badge-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-200);
  padding: var(--space-300) var(--space-200);
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  transition: transform 0.15s ease;
  text-align: center;
}

.badge-row:hover {
  transform: translateY(-3px);
}

.badge-row--earned {
  background: var(--color-wild-100);
}

.badge-row--pending {
  background: var(--color-wild-200);
}

.badge-row--pending :deep(.badge-face) {
  filter: grayscale(1);
  opacity: 0.45;
}

.badge-row--pending :deep(.badge-shadow) {
  opacity: 0.2;
}

.badge-row-info {
  display: grid;
  gap: 2px;
}

.badge-row-name {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.badge-row--pending .badge-row-name {
  color: var(--color-mirage-500);
}

.badge-row-desc {
  display: none;
}

.badge-row-count {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 4px;
  min-width: auto;
  padding: 4px 8px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.badge-row--earned .badge-row-count {
  background: var(--color-deep-100);
  border-color: var(--color-deep-600);
}

.count-num {
  font-size: 20px;
  font-weight: 900;
  color: var(--color-mirage-800);
  line-height: 1;
}

.count-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-mirage-500);
}

/* ── BOOKS CARD WITH SHELF ──────────────────────────────── */
.books-card {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 20px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  padding: var(--space-500) 0 var(--space-600) 0;
  display: grid;
  gap: var(--space-300);
  overflow: hidden;
}

.books-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-200);
  padding: 0 var(--space-500);
}

.books-card-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}

/* ── RESPONSIVE ─────────────────────────────────────────── */
@media (max-width: 53.75em) {
  .two-col {
    grid-template-columns: 1fr;
  }

  .hero {
    grid-template-columns: 1fr;
  }

  .hero-visual {
    display: none;
  }

  .profile-top {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .profile-info {
    width: 100%;
  }

  .name-row {
    justify-content: center;
    flex-wrap: wrap;
  }

  .badges-list {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .resume-body {
    flex-direction: column;
    align-items: center;
  }

  .resume-info {
    width: 100%;
    align-items: flex-start;
  }
}

@media (max-width: 37.5em) {
  .dashboard {
    gap: var(--space-400);
  }

  .badges-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .badge-row {
    padding: var(--space-200) var(--space-200);
  }

  .daily-card,
  .resume-card,
  .hero,
  .profile-card {
    padding: var(--space-400);
  }

  .mini-stat {
    padding: var(--space-150) var(--space-200);
    gap: var(--space-200);
  }

  .mini-icon {
    width: 2.25rem;
    height: 2.25rem;
  }
}

@media (max-width: 30em) {
  .profile-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .badges-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .badge-row {
    padding: var(--space-200) var(--space-300);
  }

  .level-chip {
    font-size: 0.625rem;
    padding: 2px 0.625rem;
  }
}
</style>
