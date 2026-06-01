<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { FireIcon } from '@heroicons/vue/24/solid'
import { StarIcon, ChevronLeftIcon, ChevronRightIcon, BookOpenIcon, TrophyIcon, SparklesIcon } from '@heroicons/vue/24/outline'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import BookBadge from '@/components/ui/BookBadge.vue'
import BookMockup from '@/components/ui/BookMockup.vue'
import BookShelf from '@/components/ui/BookShelf.vue'
import { fetchUserById, getUserAvatarId, getUserDisplayName } from '@/services/auth'
import { fetchUserBookBadges, fetchUserBooks } from '@/services/books'
import { fetchUserPointsFromHistory } from '@/services/exercises'
import { getAssetUrl } from '@/services/client'
import { getLevelProgressFromPoints } from '@/utils/gamification'
import type { User, UserBook, Book } from '@/types'
import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'
import type { AvatarBorder, AvatarColor, AvatarEffect, AvatarShadow } from '@/types/avatar'

type BadgeCounts = Record<BookBadgeTier, number>

const route = useRoute()
const userId = computed(() => route.params.id as string)

const user = ref<User | null>(null)
const points = ref(0)
const badgeCounts = ref<BadgeCounts>({ bronze: 0, silver: 0, gold: 0, diamond: 0, galaxy: 0 })
const userBooks = ref<UserBook[]>([])
const isLoading = ref(true)
const error = ref('')

const displayName = computed(() => getUserDisplayName(user.value))
const avatarUrl = computed(() => getAssetUrl(getUserAvatarId(user.value)))
const levelInfo = computed(() => getLevelProgressFromPoints(points.value))
const progressPercent = computed(() => {
  const { progress, nextLevelXp } = levelInfo.value
  return nextLevelXp ? Math.min(100, Math.round((progress / nextLevelXp) * 100)) : 0
})

const BADGE_TIERS: { tier: BookBadgeTier; label: string }[] = [
  { tier: 'bronze', label: 'Bronze' },
  { tier: 'silver', label: 'Prata' },
  { tier: 'gold', label: 'Ouro' },
  { tier: 'diamond', label: 'Diamante' },
  { tier: 'galaxy', label: 'Galáxia' },
]

const BADGE_WEIGHTS: Record<BookBadgeTier, number> = { bronze: 1, silver: 2, gold: 3, diamond: 4, galaxy: 5 }

const totalBadgeScore = computed(() =>
  userBooks.value.reduce((sum, ub) => {
    const badge = ub.current_badge as BookBadgeTier | 'default' | undefined
    if (!badge || badge === 'default') return sum
    return sum + (BADGE_WEIGHTS[badge] ?? 0)
  }, 0)
)

const getBookCover = (ub: UserBook) => {
  const book = ub.book_id as Book | undefined
  return book?.cover_img ? getAssetUrl(book.cover_img) : null
}

const getBookTitle = (ub: UserBook) => {
  const book = ub.book_id as Book | undefined
  return book?.title ?? 'Livro'
}

const getBookBadge = (ub: UserBook): BookBadgeTier | undefined => {
  return ub.current_badge && ub.current_badge !== 'default'
    ? (ub.current_badge as BookBadgeTier)
    : undefined
}

const joinDate = computed(() => {
  const raw = (user.value as any)?.date_created
  if (!raw) return null
  return new Date(raw).toLocaleDateString('pt-PT', { year: 'numeric', month: 'long' })
})

// Carousel
const shelfZoneRef = ref<HTMLElement | null>(null)
const booksRowRef = ref<HTMLElement | null>(null)
const carouselOffset = ref(0)
const BOOK_STEP = 120

const maxOffset = computed(() => {
  if (!shelfZoneRef.value || !booksRowRef.value) return 0
  return Math.max(0, booksRowRef.value.scrollWidth - shelfZoneRef.value.clientWidth)
})

const canLeft = computed(() => carouselOffset.value > 0)
const canRight = computed(() => carouselOffset.value < maxOffset.value)
const needsCarousel = computed(() => userBooks.value.length > 4)

const shiftCarousel = (dir: 1 | -1) => {
  carouselOffset.value = Math.max(0, Math.min(maxOffset.value, carouselOffset.value + dir * BOOK_STEP * 2))
}

onMounted(async () => {
  try {
    const [userData, totalPoints, allBadges, books] = await Promise.all([
      fetchUserById(userId.value),
      fetchUserPointsFromHistory(userId.value).catch(() => 0),
      fetchUserBookBadges().catch(() => [] as UserBook[]),
      fetchUserBooks(userId.value).catch(() => [] as UserBook[]),
    ])

    user.value = userData
    points.value = totalPoints
    userBooks.value = books

    const counts: BadgeCounts = { bronze: 0, silver: 0, gold: 0, diamond: 0, galaxy: 0 }
    for (const ub of allBadges) {
      if (String(ub.user_id) !== String(userId.value)) continue
      const badge = ub.current_badge as BookBadgeTier | 'default' | undefined
      if (badge && badge !== 'default' && badge in counts) {
        counts[badge] += 1
      }
    }
    badgeCounts.value = counts
  } catch {
    error.value = 'Não foi possível carregar o perfil.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="profile-page">

    <!-- Loading -->
    <template v-if="isLoading">
      <div class="card hero-card">
        <UiSkeleton width="110px" height="110px" radius="50%" />
        <UiSkeleton width="200px" height="24px" />
        <div style="display:flex;gap:12px;align-items:center;width:100%;max-width:400px">
          <UiSkeleton width="72px" height="58px" radius="12px" />
          <div style="flex:1;display:flex;flex-direction:column;gap:8px">
            <UiSkeleton width="100%" height="11px" radius="999px" />
            <UiSkeleton width="70%" height="10px" radius="999px" />
          </div>
        </div>
      </div>
      <div class="stats-grid">
        <UiSkeleton width="100%" height="90px" radius="16px" />
        <UiSkeleton width="100%" height="90px" radius="16px" />
        <UiSkeleton width="100%" height="90px" radius="16px" />
      </div>
      <UiSkeleton width="100%" height="140px" radius="16px" />
    </template>

    <!-- Error -->
    <div v-else-if="error" class="card error-card">
      <p>{{ error }}</p>
    </div>

    <!-- Content -->
    <template v-else>

      <!-- Hero card -->
      <div class="card hero-card">
        <UiAvatar
          :src="avatarUrl || undefined"
          :alt="displayName.charAt(0).toUpperCase()"
          :size="110"
          :border="user?.avatar_border as AvatarBorder"
          :avatar-color="user?.avatar_color as AvatarColor"
          :effect="user?.avatar_effect as AvatarEffect"
          :shadow="user?.avatar_shadow as AvatarShadow"
        />

        <strong class="profile-name">{{ displayName }}</strong>
        <span v-if="joinDate" class="join-date">Membro desde {{ joinDate }}</span>

        <div class="level-row">
          <div class="level-badge">
            <span class="level-eyebrow">NÍVEL</span>
            <span class="level-num">{{ levelInfo.level }}</span>
          </div>
          <div class="xp-block">
            <div class="xp-bar" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
              <div class="xp-fill" :style="{ width: `${progressPercent}%` }" />
            </div>
            <div class="xp-labels">
              <span>{{ levelInfo.progress }} XP</span>
              <span>{{ levelInfo.nextLevelXp }} XP → nível {{ levelInfo.level + 1 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="card stat-card" :class="{ 'stat-card--dim': !user?.exercises_daily_streak }">
          <FireIcon class="stat-icon streak" aria-hidden="true" />
          <span class="stat-value">{{ user?.exercises_daily_streak ?? 0 }}</span>
          <span class="stat-label">Streak atual</span>
        </div>
        <div class="card stat-card" :class="{ 'stat-card--dim': !user?.best_exercises_daily_streak }">
          <FireIcon class="stat-icon best-streak" aria-hidden="true" />
          <span class="stat-value">{{ user?.best_exercises_daily_streak ?? 0 }}</span>
          <span class="stat-label">Melhor streak</span>
        </div>
        <div class="card stat-card" :class="{ 'stat-card--dim': !user?.best_rank }">
          <TrophyIcon class="stat-icon rank" aria-hidden="true" />
          <span class="stat-value">{{ user?.best_rank != null ? `#${user.best_rank}` : '—' }}</span>
          <span class="stat-label">Melhor posição</span>
        </div>
        <div class="card stat-card">
          <StarIcon class="stat-icon pts" aria-hidden="true" />
          <span class="stat-value">{{ points.toLocaleString('pt-PT') }}</span>
          <span class="stat-label">Pontos</span>
        </div>
        <div class="card stat-card">
          <BookOpenIcon class="stat-icon books" aria-hidden="true" />
          <span class="stat-value">{{ userBooks.length }}</span>
          <span class="stat-label">Livros</span>
        </div>
        <div class="card stat-card">
          <SparklesIcon class="stat-icon badges" aria-hidden="true" />
          <span class="stat-value">{{ totalBadgeScore }}</span>
          <span class="stat-label">Badges</span>
        </div>
      </div>

      <!-- Conquistas -->
      <div class="card section-card">
        <p class="section-label">Conquistas</p>
        <div class="badges-grid">
          <div
            v-for="{ tier, label } in BADGE_TIERS"
            :key="tier"
            class="badge-cell"
            :class="{ 'badge-cell--empty': !badgeCounts[tier] }"
          >
            <BookBadge :tier="tier" size="md" />
            <span class="badge-count">{{ badgeCounts[tier] }}</span>
            <span class="badge-tier">{{ label }}</span>
          </div>
        </div>
        <p v-if="totalBadges === 0" class="empty-hint">Ainda sem conquistas.</p>
      </div>

      <!-- Coleção -->
      <div v-if="userBooks.length" class="card section-card books-section">
        <p class="section-label">Coleção</p>
        <div class="carousel-wrap">
          <!-- Left arrow -->
          <button
            v-if="needsCarousel && canLeft"
            class="c-arrow c-arrow--left"
            type="button"
            aria-label="Ver livros anteriores"
            @click="shiftCarousel(-1)"
          >
            <ChevronLeftIcon class="c-arrow-icon" aria-hidden="true" />
          </button>

          <!-- Stage (same pattern as Collection.vue) -->
          <div class="books-stage" ref="shelfZoneRef">
            <div
              class="books-row"
              ref="booksRowRef"
              :style="needsCarousel
                ? { transform: `translateX(${-carouselOffset}px)`, justifyContent: 'flex-start' }
                : { justifyContent: 'center' }"
            >
              <BookMockup
                v-for="ub in userBooks"
                :key="ub.user_book_id"
                :coverUrl="getBookCover(ub)"
                :title="getBookTitle(ub)"
                :badge="getBookBadge(ub)"
                size="sm"
              />
            </div>
            <BookShelf variant="small" />
          </div>

          <!-- Right arrow -->
          <button
            v-if="needsCarousel && canRight"
            class="c-arrow c-arrow--right"
            type="button"
            aria-label="Ver mais livros"
            @click="shiftCarousel(1)"
          >
            <ChevronRightIcon class="c-arrow-icon" aria-hidden="true" />
          </button>
        </div>
      </div>

    </template>

  </div>
</template>

<style scoped>
.profile-page {
  padding: 32px 24px 80px;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ── Base card ── */
.card {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 18px;
  box-shadow: 4px 4px 0 var(--color-shadow);
}

/* ── Hero ── */
.hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 40px 36px;
  text-align: center;
}

.profile-name {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-mirage-900);
  line-height: 1.2;
}

.join-date {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-mirage-400);
  margin-top: -6px;
}

.level-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 520px;
}

.level-badge {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: var(--color-deep-500);
  border: 2px solid var(--color-mirage-800);
  border-radius: 12px;
  box-shadow: 3px 3px 0 var(--color-shadow);
  padding: 8px 16px;
}

.level-eyebrow {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1;
}

.level-num {
  font-size: 30px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}

.xp-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.xp-bar {
  width: 100%;
  height: 11px;
  border-radius: 999px;
  background: var(--color-wild-300);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
  overflow: hidden;
}

.xp-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-400));
  border-radius: inherit;
  transition: width 0.9s cubic-bezier(0.4, 0, 0.2, 1);
}

.xp-labels {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-mirage-500);
}

/* ── Stats ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 12px;
  text-align: center;
  transition: opacity 0.2s ease;
}

.stat-card--dim {
  opacity: 0.45;
}

.stat-icon {
  width: 20px;
  height: 20px;
  margin-bottom: 2px;
}

.stat-icon.pts        { stroke-width: 1.5; color: var(--color-deep-600); }
.stat-icon.streak     { color: #f97316; }
.stat-icon.best-streak { color: var(--color-amber-600); }
.stat-icon.rank        { stroke-width: 1.5; color: var(--color-pumpkin-600); }
.stat-icon.books       { stroke-width: 1.5; color: var(--color-deep-500); }
.stat-icon.badges      { stroke-width: 1.5; color: var(--color-deep-600); }

.stat-value {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-mirage-900);
  line-height: 1;
}

.stat-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-mirage-500);
}

/* ── Section card ── */
.section-card {
  padding: 28px;
}

.section-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
  margin: 0 0 18px;
}

/* ── Conquistas ── */
.badges-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.badge-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 12px 4px 10px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
  transition: opacity 0.2s ease;
}

.badge-cell--empty { opacity: 0.28; }

.badge-count {
  font-size: 17px;
  font-weight: 800;
  color: var(--color-mirage-900);
  line-height: 1;
}

.badge-tier {
  font-size: 9px;
  font-weight: 700;
  color: var(--color-mirage-500);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.empty-hint {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--color-mirage-400);
  text-align: center;
}

/* ── Coleção / Carousel ── */
.books-section {
  padding: 24px 24px 28px; /* 28px bottom cria margem entre estante e fundo do card */
}

.carousel-wrap {
  position: relative;
  display: flex;
  align-items: stretch;
}

/* Shelf zone — same pattern as Collection.vue */
.books-stage {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 180px;
}

.books-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 24px;
  align-items: flex-end;
  /*
   * padding-bottom = 16px (frente da estante) para os livros
   * assentarem directamente sobre a superfície da estante.
   */
  padding: 24px 40px 16px;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Carousel arrows */
.c-arrow {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  cursor: pointer;
  z-index: 5;
  transition: background 0.15s ease, box-shadow 0.1s ease, transform 0.1s ease;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.c-arrow--left  { left: 4px; }
.c-arrow--right { right: 4px; }

.c-arrow:hover {
  background: var(--color-wild-200);
  box-shadow: 3px 5px 0 var(--color-shadow);
  transform: translateY(calc(-50% - 2px));
}

.c-arrow:active {
  transform: translateY(calc(-50% + 2px)) translateX(2px);
  box-shadow: 1px 1px 0 var(--color-shadow);
}

.c-arrow-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
  color: var(--color-mirage-700);
}

/* ── Error ── */
.error-card {
  display: grid;
  place-items: center;
  padding: 60px 24px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-mirage-500);
}

@media (max-width: 600px) {
  .profile-page { padding: 20px 12px 64px; }
  .hero-card { padding: 32px 20px 24px; }
  .section-card { padding: 20px; }
  .books-section { padding: 20px 20px 24px; }
  .books-row { padding: 16px 24px 16px; gap: 16px; }
}

@media (max-width: 480px) {
  .badges-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .level-row {
    flex-direction: column;
    align-items: stretch;
  }
  .level-badge {
    flex-direction: row;
    justify-content: center;
    gap: 10px;
    padding: 8px 16px;
  }
  .level-num { font-size: 24px; }
}
</style>
