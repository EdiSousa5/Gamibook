<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
import { fetchUserPointsFromHistory } from '../services/exercises'
import { getAssetUrl, getStoredUserId } from '../services/client'
import { getLevelProgressFromPoints } from '@/utils/gamification'
import type { User } from '@/types'

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
const error = ref('')
const isLoading = ref(false)
const timeFilter = ref<TimeFilter>('all')
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

const resolveUserId = (value: unknown) => {
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    return String((value as { id?: string | number }).id ?? '')
  }
  if (value && typeof value === 'object' && 'user_id' in value) {
    return String((value as { user_id?: string | number }).user_id ?? '')
  }
  return null
}

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

const isUserInList = computed(() => topGlobal.value.some(u => String(u.id) === String(currentUserId)))

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
    alert('Ainda não te encontras nesta tabela de classificação!')
  }
}

const loadRankings = async () => {
  error.value = ''
  isLoading.value = true
  try {
    const startDate = getRangeStartDate(timeFilter.value) ?? undefined
    const [users, userBooks] = await Promise.all([
      fetchUsers(undefined, 'Utilizador'),
      fetchUserBookBadges(),
    ])

    const pointsMap = new Map<string, number>()
    const pointsPromises = users.map(async (u) => {
      const userId = String(u.id ?? '')
      if (!userId) return
      try {
        const points = await fetchUserPointsFromHistory(userId)
        pointsMap.set(userId, points)
      } catch {
        pointsMap.set(userId, 0)
      }
    })
    await Promise.all(pointsPromises)

    const badgeMap = new Map<string, BadgeCounts>()
    for (const entry of userBooks) {
      const userId = resolveUserId(entry.user_id)
      if (!userId) continue
      const badge = entry.current_badge
      if (!badge || badge === 'default') continue
      const counts = badgeMap.get(userId) ?? buildBadgeCounts()
      if (badge in counts) {
        counts[badge as BookBadgeTier] += 1
        badgeMap.set(userId, counts)
      }
    }

    topGlobal.value = users
      .map((user) => {
        const userId = String(user.id ?? '')
        const totalPoints = pointsMap.get(userId) ?? 0
        const badgeCounts = badgeMap.get(userId) ?? buildBadgeCounts()
        const level = getLevelProgressFromPoints(totalPoints).level
        return { ...user, totalPoints, level, badgeCounts }
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
  } catch {
    error.value = 'Não foi possível carregar os rankings.'
  } finally {
    isLoading.value = false
  }
}

watch(timeFilter, () => {
  loadRankings()
}, { immediate: true })
</script>

<template>
  <section class="rankings">
    <div class="filters-wrapper">
      <span class="filters-label">Filtrar por Período:</span>
      <UiSegmented :model-value="timeFilter" :options="TIME_FILTERS" @update="timeFilter = $event as TimeFilter" />
    </div>

    <p v-if="isLoading" class="state podium-state">A carregar rankings...</p>
    <p v-else-if="error" class="state error podium-state">{{ error }}</p>

    <template v-else-if="topGlobal.length">
      <section class="podium">
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

      <div class="list-container">
        <UiCard v-if="remainingUsersList.length" class="list-card">
          <ul class="user-list">
            <RankingListItem v-for="(user, index) in remainingUsersList" :key="user.id || user.email || user.name"
              :id="`user-${user.id}`" :position="index + 4" :points="user.totalPoints" :level="user.level"
              :badgeCounts="user.badgeCounts" :isCurrentUser="String(user.id) === String(currentUserId)"
              :avatarUrl="getAvatarUrl(user)" :displayName="displayUserName(user)" />
          </ul>
        </UiCard>
      </div>
    </template>

    <p v-else-if="!isLoading && !error" class="state">Sem utilizadores disponíveis.</p>

    <div v-if="isUserInList" class="fab-container">
      <UiButton variant="primary" class="fab-button" @click="scrollToMe">O Meu Lugar</UiButton>
    </div>
  </section>
</template>

<style scoped>
.rankings {
  padding: 32px 16px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--color-mirage-900);
}

.filters-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
  z-index: 10;
  background: var(--color-wild-100);
  padding: 16px 24px;
  border-radius: var(--radius-400);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  width: 100%;
  max-width: 600px;
}

.filters-label {
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-mirage-600);
}

.state {
  margin-top: 12px;
  font-weight: 600;
  color: var(--color-mirage-600);
  text-align: center;
}

.error {
  color: #b13b3b;
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
  margin-top: -40px;
  /* Faz com que a lista passe um bocado por cima dos pódios */
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