<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PodiumItem from '@/components/ui/PodiumItem.vue'
import RankingListItem from '@/components/ui/RankingListItem.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'
import {
  fetchUsers,
  getUserAvatarId,
} from '../services/auth'
import { fetchUserBookBadges } from '../services/books'
import { fetchAllUsersPoints } from '../services/exercises'
import { getAssetUrl, getStoredUserId } from '../services/client'
import { getLevelProgressFromPoints } from '@/utils/gamification'
import { useToast } from '@/composables/useToast'
import type { User } from '@/types'

const toast = useToast()

type TimeFilter = 'all' | 'week' | 'month' | 'year'

type BadgeCounts = Record<BookBadgeTier, number>

type LeaderboardEntry = User & {
  totalPoints: number
  level: number
  badgeCounts: BadgeCounts
}

const TIME_FILTERS: Array<{ value: TimeFilter; label: string }> = [
  { value: 'all', label: 'Todo o Tempo' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
  { value: 'year', label: 'Este ano' },
]

const topGlobal = ref<LeaderboardEntry[]>([])
const currentUserEntry = ref<(LeaderboardEntry & { globalRank: number }) | null>(null)
const error = ref('')
const isLoading = ref(false)
const isInitialLoad = ref(true)
const timeFilter = ref<TimeFilter>('all')

onMounted(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
const displayUserName = (entry?: User | null) => {
  if (!entry) return '—'
  const name = [entry.first_name, entry.last_name].filter(Boolean).join(' ').trim()
  return name || entry.email || entry.id || '—'
}
const getAvatarUrl = (user?: User | null) => getAssetUrl(getUserAvatarId(user))
const currentUserId = getStoredUserId()

const buildBadgeCounts = (): BadgeCounts => ({
  bronze: 0,
  silver: 0,
  gold: 0,
  diamond: 0,
  galaxy: 0,
})


const getRangeStartDate = (filter: TimeFilter) => {
  if (filter === 'all') return null
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  if (filter === 'week') {
    const day = start.getDay()
    const diff = (day + 6) % 7
    start.setDate(start.getDate() - diff)
    return start.toISOString()
  }

  if (filter === 'month') {
    start.setDate(1)
    return start.toISOString()
  }

  start.setMonth(0, 1)
  return start.toISOString()
}

// Computadas para separar o pódio da lista restante
const podiumUsers = computed(() => topGlobal.value.slice(0, 3))
const remainingUsersList = computed(() => topGlobal.value.slice(3))

const isUserInTop = computed(() => topGlobal.value.some(u => String(u.id) === String(currentUserId)))
const showUserBelowList = computed(() => !isUserInTop.value && currentUserEntry.value !== null)

const scrollToMe = () => {
  if (!currentUserId) return
  const el = document.getElementById(`user-${currentUserId}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('highlight-pulse-green')
    setTimeout(() => {
      el.classList.remove('highlight-pulse-green')
    }, 2500)
  } else {
    toast.info('Ainda não te encontras nesta tabela de classificação!')
  }
}

const loadRankings = async () => {
  error.value = ''
  isLoading.value = true
  try {
    const startDate = getRangeStartDate(timeFilter.value) ?? undefined
    const [users, userBooks, pointsMap] = await Promise.all([
      fetchUsers(undefined, 'Utilizador'),
      fetchUserBookBadges(),
      fetchAllUsersPoints(startDate),
    ])

    const badgeMap = new Map<string, BadgeCounts>()
    for (const entry of userBooks) {
      const userId = String(entry.user_id ?? '')
      if (!userId) continue
      const badge = entry.current_badge
      if (!badge || badge === 'default') continue
      const counts = badgeMap.get(userId) ?? buildBadgeCounts()
      if (badge in counts) {
        counts[badge as BookBadgeTier] += 1
        badgeMap.set(userId, counts)
      }
    }

    const sorted = users
      .map((user) => {
        const userId = String(user.id ?? '')
        const totalPoints = pointsMap.get(userId) ?? 0
        const badgeCounts = badgeMap.get(userId) ?? buildBadgeCounts()
        const level = getLevelProgressFromPoints(totalPoints).level
        return { ...user, totalPoints, level, badgeCounts }
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)

    const userIdx = sorted.findIndex(u => String(u.id) === String(currentUserId))
    currentUserEntry.value = userIdx >= 0
      ? { ...sorted[userIdx]!, globalRank: userIdx + 1 }
      : null

    topGlobal.value = sorted.slice(0, 50)
  } catch {
    error.value = 'Não foi possível carregar os rankings.'
  } finally {
    isLoading.value = false
    isInitialLoad.value = false
  }
}

watch(timeFilter, () => {
  loadRankings()
}, { immediate: true })
</script>

<template>
  <section class="rankings">
    <div class="filters-wrapper">
      <UiSegmented :model-value="timeFilter" :options="TIME_FILTERS" @update="timeFilter = $event as TimeFilter" />
    </div>

    <p v-if="isLoading && isInitialLoad" class="state podium-state">A carregar rankings...</p>
    <p v-else-if="error" class="state error podium-state">{{ error }}</p>

    <template v-else-if="topGlobal.length">
      <section class="podium" :class="{ 'content-refreshing': isLoading }">
        <!-- 2º Lugar -->
        <div class="podium-col place-2-col">
          <PodiumItem v-if="podiumUsers[1]" :position="2" :points="podiumUsers[1].totalPoints"
            :level="podiumUsers[1].level" :avatarUrl="getAvatarUrl(podiumUsers[1])"
            :displayName="displayUserName(podiumUsers[1])"
            :elementId="`user-${podiumUsers[1].id}`" />
        </div>

        <!-- 1º Lugar -->
        <div class="podium-col place-1-col">
          <PodiumItem v-if="podiumUsers[0]" :position="1" :points="podiumUsers[0].totalPoints"
            :level="podiumUsers[0].level" :avatarUrl="getAvatarUrl(podiumUsers[0])"
            :displayName="displayUserName(podiumUsers[0])"
            :elementId="`user-${podiumUsers[0].id}`" />
        </div>

        <!-- 3º Lugar -->
        <div class="podium-col place-3-col">
          <PodiumItem v-if="podiumUsers[2]" :position="3" :points="podiumUsers[2].totalPoints"
            :level="podiumUsers[2].level" :avatarUrl="getAvatarUrl(podiumUsers[2])"
            :displayName="displayUserName(podiumUsers[2])"
            :elementId="`user-${podiumUsers[2].id}`" />
        </div>
      </section>

      <div class="list-container" :class="{ 'content-refreshing': isLoading }">
        <UiCard v-if="remainingUsersList.length || showUserBelowList" class="list-card">
          <ul class="user-list">
            <RankingListItem v-for="(user, index) in remainingUsersList" :key="user.id || user.email || user.name"
              :id="`user-${user.id}`" :position="index + 4" :points="user.totalPoints" :level="user.level"
              :badgeCounts="user.badgeCounts" :isCurrentUser="String(user.id) === String(currentUserId)"
              :avatarUrl="getAvatarUrl(user)" :displayName="displayUserName(user)" />
          </ul>

          <template v-if="showUserBelowList && currentUserEntry">
            <div class="out-of-top-divider">
              <span>. . .</span>
            </div>
            <ul class="user-list">
              <RankingListItem
                :id="`user-${currentUserEntry.id}`"
                :position="currentUserEntry.globalRank"
                :points="currentUserEntry.totalPoints"
                :level="currentUserEntry.level"
                :badgeCounts="currentUserEntry.badgeCounts"
                :isCurrentUser="true"
                :avatarUrl="getAvatarUrl(currentUserEntry)"
                :displayName="displayUserName(currentUserEntry)"
              />
            </ul>
          </template>
        </UiCard>
      </div>
    </template>

    <p v-else-if="!isLoading && !error" class="state">Sem utilizadores disponíveis.</p>

    <div v-if="isUserInTop" class="fab-container">
      <UiButton variant="primary" class="fab-button" @click="scrollToMe">O Meu Lugar</UiButton>
    </div>
  </section>
</template>

<style scoped>
.rankings {
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--color-mirage-900);
}

.filters-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  z-index: 10;
}

.content-refreshing {
  opacity: 0.45;
  transition: opacity 0.35s ease;
  pointer-events: none;
}

.state {
  margin-top: 12px;
  font-weight: 600;
  color: var(--color-mirage-600);
  text-align: center;
}

.error {
  color: var(--color-error-strong);
}

.podium-state {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.podium {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 0;
  width: 100%;
  max-width: 800px;
  margin-top: 24px;
  margin-bottom: 0px;
}

.podium-col {
  flex: 1;
  display: flex;
  justify-content: center;
}

.place-1-col {
  z-index: 3;
  position: relative;
}

.place-2-col {
  z-index: 2;
  position: relative;
}

.place-3-col {
  z-index: 1;
  position: relative;
}

.list-container {
  width: 100%;
  max-width: 1120px;
  position: relative;
  z-index: 10;
  margin-top: var(--rankings-list-overlap, -40px);
}

.list-card {
  padding: 16px;
  overflow: hidden;
  background: var(--color-wild-100);
}

.user-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.out-of-top-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-200) 0;
  color: var(--color-mirage-400);
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 4px;
}

/* --- Botão Flutuante (FAB) --- */
.fab-container {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 50;
}

.fab-button {
  --btn-offset-x: 5px;
  --btn-offset-y: 7px;
}

:deep(.highlight-pulse-green) {
  animation: pulse-green 2.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes pulse-green {
  0%   { transform: scale(1); }
  15%  { transform: scale(1.04); }
  50%  { transform: scale(1.01); }
  100% { transform: scale(1); }
}

@media (max-width: 768px) {
  .fab-container {
    bottom: 16px;
    right: 16px;
  }
}
</style>