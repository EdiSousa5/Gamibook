<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PodiumItem from '@/components/ui/PodiumItem.vue'
import RankingListItem from '@/components/ui/RankingListItem.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { StarIcon, MagnifyingGlassIcon, UserGroupIcon, LockClosedIcon } from '@heroicons/vue/24/outline'
import { FireIcon } from '@heroicons/vue/24/solid'
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
import type { AvatarBorder, AvatarColor, AvatarEffect, AvatarShadow } from '@/types/avatar'

const router = useRouter()

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

type PeekEntry = LeaderboardEntry & { globalRank: number }
const peekEntry = ref<PeekEntry | null>(null)

const searchModalOpen = ref(false)
const searchQuery = ref('')

const filteredSearchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return topGlobal.value
  return topGlobal.value.filter(u => {
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ').toLowerCase()
    return name.includes(q) || (u.email ?? '').toLowerCase().includes(q)
  })
})

function openSearchModal() {
  searchQuery.value = ''
  searchModalOpen.value = true
}

function handleSearchSelect(entry: LeaderboardEntry & { globalRank: number }) {
  searchModalOpen.value = false
  goToProfile(String(entry.id))
}

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

const goToProfile = (userId: string) => {
  const all = [...topGlobal.value]
  const idx = all.findIndex(u => String(u.id) === String(userId))
  if (idx !== -1) {
    peekEntry.value = { ...all[idx]!, globalRank: idx + 1 }
  } else if (currentUserEntry.value && String(currentUserEntry.value.id) === String(userId)) {
    peekEntry.value = currentUserEntry.value
  } else {
    router.push(`/user/${userId}`)
  }
}

const closePeek = () => { peekEntry.value = null }
const navigateToProfile = () => {
  const id = peekEntry.value?.id
  closePeek()
  if (id) router.push(`/user/${id}`)
}

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
      <div class="filters-card">
        <div class="filters-card-row">
          <div class="filters-seg-block">
            <p class="filters-label">Período</p>
            <UiSegmented :model-value="timeFilter" :options="TIME_FILTERS" @update="timeFilter = $event as TimeFilter" />
          </div>
          <div class="filters-divider" />
          <button class="search-trigger" @click="openSearchModal" aria-label="Pesquisar jogador na classificação">
            <UserGroupIcon class="search-trigger-icon" aria-hidden="true" />
            <span class="search-trigger-text">
              <span class="search-trigger-main">Pesquisar jogador</span>
              <span class="search-trigger-sub">Encontrar na classificação</span>
            </span>
            <MagnifyingGlassIcon class="search-trigger-arrow" aria-hidden="true" />
          </button>
        </div>
      </div>
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
            :elementId="`user-${podiumUsers[1].id}`"
            :userId="String(podiumUsers[1].id)"
            :avatarBorder="podiumUsers[1].avatar_border as any"
            :avatarColor="podiumUsers[1].avatar_color as any"
            :avatarEffect="podiumUsers[1].avatar_effect as any"
            :avatarShadow="podiumUsers[1].avatar_shadow as any"
            @click-user="goToProfile" />
        </div>

        <!-- 1º Lugar -->
        <div class="podium-col place-1-col">
          <PodiumItem v-if="podiumUsers[0]" :position="1" :points="podiumUsers[0].totalPoints"
            :level="podiumUsers[0].level" :avatarUrl="getAvatarUrl(podiumUsers[0])"
            :displayName="displayUserName(podiumUsers[0])"
            :elementId="`user-${podiumUsers[0].id}`"
            :userId="String(podiumUsers[0].id)"
            :avatarBorder="podiumUsers[0].avatar_border as any"
            :avatarColor="podiumUsers[0].avatar_color as any"
            :avatarEffect="podiumUsers[0].avatar_effect as any"
            :avatarShadow="podiumUsers[0].avatar_shadow as any"
            @click-user="goToProfile" />
        </div>

        <!-- 3º Lugar -->
        <div class="podium-col place-3-col">
          <PodiumItem v-if="podiumUsers[2]" :position="3" :points="podiumUsers[2].totalPoints"
            :level="podiumUsers[2].level" :avatarUrl="getAvatarUrl(podiumUsers[2])"
            :displayName="displayUserName(podiumUsers[2])"
            :elementId="`user-${podiumUsers[2].id}`"
            :userId="String(podiumUsers[2].id)"
            :avatarBorder="podiumUsers[2].avatar_border as any"
            :avatarColor="podiumUsers[2].avatar_color as any"
            :avatarEffect="podiumUsers[2].avatar_effect as any"
            :avatarShadow="podiumUsers[2].avatar_shadow as any"
            @click-user="goToProfile" />
        </div>
      </section>

      <div class="list-container" :class="{ 'content-refreshing': isLoading }">
        <UiCard v-if="remainingUsersList.length || showUserBelowList" class="list-card">
          <ul class="user-list">
            <RankingListItem v-for="(user, index) in remainingUsersList" :key="user.id || user.email || user.name"
              :id="`user-${user.id}`" :position="index + 4" :points="user.totalPoints" :level="user.level"
              :badgeCounts="user.badgeCounts" :isCurrentUser="String(user.id) === String(currentUserId)"
              :avatarUrl="getAvatarUrl(user)" :displayName="displayUserName(user)"
              :userId="String(user.id)"
              :avatarBorder="user.avatar_border as any"
              :avatarColor="user.avatar_color as any"
              :avatarEffect="user.avatar_effect as any"
              :avatarShadow="user.avatar_shadow as any"
              @click-user="goToProfile" />
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
                :userId="String(currentUserEntry.id)"
                :avatarBorder="currentUserEntry.avatar_border as any"
                :avatarColor="currentUserEntry.avatar_color as any"
                :avatarEffect="currentUserEntry.avatar_effect as any"
                :avatarShadow="currentUserEntry.avatar_shadow as any"
                @click-user="goToProfile"
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

  <!-- Modal de pesquisa de jogador -->
  <Teleport to="body">
    <Transition name="peek-fade">
      <div v-if="searchModalOpen" class="search-overlay" @click.self="searchModalOpen = false">
        <div class="search-modal" role="dialog" aria-modal="true" aria-label="Pesquisar jogador">
          <div class="search-modal__header">
            <div>
              <p class="search-modal__eyebrow">Classificação</p>
              <h3 class="search-modal__title">Pesquisar jogador</h3>
            </div>
            <UiButton variant="outline" size="sm" @click="searchModalOpen = false">Fechar</UiButton>
          </div>
          <div class="search-modal__input-area">
            <UiInput
              :model-value="searchQuery"
              placeholder="Nome do jogador..."
              @update="searchQuery = String($event)"
            />
          </div>
          <div class="search-modal__body">
            <template v-if="filteredSearchResults.length">
              <button
                v-for="(entry, idx) in filteredSearchResults"
                :key="entry.id"
                class="search-row"
                @click="handleSearchSelect({ ...entry, globalRank: idx + 1 })"
              >
                <span class="search-rank">#{{ idx + 1 }}</span>
                <UiAvatar
                  :src="getAvatarUrl(entry)"
                  :alt="displayUserName(entry).charAt(0)"
                  :size="36"
                  :border="entry.avatar_border as AvatarBorder"
                  :avatar-color="entry.avatar_color as AvatarColor"
                  :effect="entry.avatar_effect as AvatarEffect"
                  :shadow="entry.avatar_shadow as AvatarShadow"
                />
                <span class="search-name">{{ displayUserName(entry) }}</span>
                <span class="search-level">Nível {{ entry.level }}</span>
                <span class="search-pts">{{ entry.totalPoints.toLocaleString('pt-PT') }} pts</span>
              </button>
            </template>
            <p v-else class="search-empty">Nenhum jogador encontrado.</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Profile peek popup -->
  <Teleport to="body">
    <Transition name="peek-fade">
      <div v-if="peekEntry" class="peek-overlay" @click.self="closePeek">
        <div class="peek-card" role="dialog" aria-modal="true" aria-label="Pré-visualização do perfil">

          <UiAvatar
            :src="getAvatarUrl(peekEntry)"
            :alt="displayUserName(peekEntry).charAt(0).toUpperCase()"
            :size="80"
            :border="peekEntry.avatar_border as AvatarBorder"
            :avatar-color="peekEntry.avatar_color as AvatarColor"
            :effect="peekEntry.avatar_effect as AvatarEffect"
            :shadow="peekEntry.avatar_shadow as AvatarShadow"
          />

          <div class="peek-name-block">
            <h2 class="peek-name">{{ displayUserName(peekEntry) }}</h2>
            <div class="peek-level-chip">Nível {{ peekEntry.level }}</div>
          </div>

          <div class="peek-stats">
            <div class="peek-stat">
              <StarIcon class="peek-stat-icon pts" aria-hidden="true" />
              <span class="peek-stat-value">{{ peekEntry.totalPoints.toLocaleString('pt-PT') }}</span>
              <span class="peek-stat-label">Pontos</span>
            </div>
            <div class="peek-stat-divider" />
            <div class="peek-stat">
              <span class="peek-rank-num">#{{ peekEntry.globalRank }}</span>
              <span class="peek-stat-label">Classificação</span>
            </div>
          </div>

          <div class="peek-actions">
            <UiButton variant="secondary" style="flex:1" @click="closePeek">Fechar</UiButton>
            <UiButton variant="primary" style="flex:1" @click="navigateToProfile">Ver perfil</UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rankings {
  padding: var(--space-500) var(--space-400);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--color-mirage-900);
}

.filters-wrapper {
  margin-bottom: var(--space-500);
  z-index: 10;
  width: 100%;
  max-width: 42.5rem;
}

.filters-card {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: var(--radius-400);
  box-shadow: 4px 4px 0 var(--color-shadow);
  overflow: hidden;
}

.filters-card-row {
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
}

.filters-seg-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  padding: var(--space-300) var(--space-400);
  min-width: 0;
}

.filters-label {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--color-mirage-400);
}

.filters-divider {
  width: 2px;
  background: var(--color-mirage-800);
  flex-shrink: 0;
}

.search-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-150);
  padding: var(--space-300) var(--space-400);
  border: none;
  background: var(--color-wild-200);
  font-family: var(--font-base);
  cursor: pointer;
  transition: background 0.15s ease;
  flex-shrink: 0;
  text-align: center;
  min-width: 9.25rem;
  width: clamp(9.25rem, 22vw, 14rem);
}

.search-trigger:hover { background: var(--color-deep-100); }
.search-trigger:active { background: var(--color-deep-200); }

.search-trigger-icon {
  width: 22px;
  height: 22px;
  stroke-width: 1.8;
  color: var(--color-deep-600);
}

.search-trigger-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.search-trigger-main {
  font-size: 12px;
  font-weight: 800;
  color: var(--color-mirage-800);
  line-height: 1;
}

.search-trigger-sub {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-mirage-400);
  line-height: 1;
}

.search-trigger-arrow {
  width: 14px;
  height: 14px;
  stroke-width: 2.5;
  color: var(--color-mirage-400);
}

/* Modal de pesquisa */
.search-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 20, 25, 0.65);
  display: grid;
  place-items: center;
  z-index: 9999;
  padding: clamp(1rem, 4vw, 2rem);
}

.search-modal {
  width: min(35rem, 100%);
  max-height: 85dvh;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 1.25rem;
  box-shadow: 8px 8px 0 var(--color-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-300);
  padding: var(--space-400) var(--space-500) var(--space-300);
  border-bottom: 2px solid var(--color-wild-400);
  flex-shrink: 0;
}

.search-modal__eyebrow {
  margin: 0 0 4px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-deep-600);
  font-weight: 800;
}

.search-modal__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  font-family: var(--font-display);
  color: var(--color-mirage-800);
}

.search-modal__input-area {
  padding: var(--space-300) var(--space-500);
  border-bottom: 1px solid var(--color-wild-400);
  flex-shrink: 0;
}

.search-modal__body {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: var(--space-200) var(--space-400);
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-wild-300);
  cursor: pointer;
  font-family: var(--font-base);
  transition: background 0.1s ease;
}

.search-row:last-child { border-bottom: none; }
.search-row:hover { background: var(--color-deep-100); }

.search-rank {
  width: 34px;
  font-size: 12px;
  font-weight: 800;
  color: var(--color-mirage-400);
  flex-shrink: 0;
  font-family: var(--font-display);
  text-align: right;
}

.search-name {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-mirage-800);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-level {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
  color: var(--color-mirage-700);
  flex-shrink: 0;
}

.search-pts {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-deep-700);
  flex-shrink: 0;
}

.search-empty {
  padding: var(--space-600);
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-mirage-500);
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
  margin-top: var(--space-500);
  margin-bottom: 0;
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
  padding: var(--space-400);
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
  bottom: var(--space-600);
  right: var(--space-600);
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

@media (max-width: 48em) {
  .rankings {
    padding: var(--space-400) var(--space-300);
  }

  .filters-wrapper {
    margin-bottom: var(--space-400);
  }

  .fab-container {
    bottom: var(--space-400);
    right: var(--space-300);
  }

  .podium {
    max-width: 100%;
  }

  .list-container {
    margin-top: calc(var(--rankings-list-overlap, -40px) / 2);
  }
}

@media (max-width: 37.5em) {
  /* Filtros: stack vertical no mobile */
  .filters-card-row {
    flex-direction: column;
  }

  .filters-divider {
    width: 100%;
    height: 2px;
    flex-shrink: 0;
  }

  .search-trigger {
    flex-direction: row;
    justify-content: flex-start;
    min-width: unset;
    width: 100%;
    padding: var(--space-300) var(--space-400);
    gap: var(--space-300);
    text-align: left;
  }

  .search-trigger-text {
    flex: 1;
  }

  .search-trigger-arrow {
    margin-left: auto;
  }

  .filters-seg-block {
    padding: var(--space-300);
  }

  .filters-wrapper {
    max-width: 100%;
  }

  .podium {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-300) var(--space-200);
    align-items: end;
  }

  .podium-col {
    width: 100%;
  }

  .place-1-col {
    grid-column: 1 / -1;
    order: -1;
  }

  .place-2-col {
    order: 1;
  }

  .place-3-col {
    order: 2;
  }

  .podium-state {
    height: 160px;
  }

  .search-overlay {
    padding: var(--space-300);
  }

  .search-modal {
    width: min(35rem, calc(100vw - 1.5rem));
    max-height: calc(100dvh - 1.5rem);
    border-radius: 1.25rem;
  }

  .peek-card {
    width: min(22.5rem, calc(100vw - 1.5rem));
    border-radius: 1.5rem;
    border-bottom: 2px solid var(--color-mirage-800);
    box-shadow: 6px 6px 0 var(--color-shadow);
    animation: peek-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  .list-container {
    margin-top: 0;
  }

  .search-modal__input-area {
    padding: var(--space-300);
  }

  .list-card {
    padding: var(--space-300);
  }

  .peek-overlay {
    padding: var(--space-300);
  }
}

/* ── Profile peek ── */
.peek-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 29, 32, 0.5);
  display: grid;
  place-items: center;
  z-index: 9999;
  padding: 1rem;
}

.peek-card {
  position: relative;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 1.5rem;
  box-shadow: 6px 6px 0 var(--color-shadow);
  padding: var(--space-600) var(--space-500) var(--space-500);
  width: min(22.5rem, 100%);
  max-height: calc(100dvh - 3rem);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-400);
  text-align: center;
  animation: peek-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes peek-pop {
  from { transform: scale(0.88) translateY(16px); opacity: 0; }
  to   { transform: scale(1) translateY(0); opacity: 1; }
}

.peek-name-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.peek-name {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-mirage-900);
  margin: 0;
  line-height: 1.2;
}

.peek-level-chip {
  padding: 4px 14px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-700);
}

.peek-stats {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  background: var(--color-wild-200);
  border: 2px solid var(--color-mirage-800);
  border-radius: 14px;
  box-shadow: 2px 2px 0 var(--color-shadow);
  overflow: hidden;
}

.peek-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
}

.peek-stat-divider {
  width: 2px;
  height: 40px;
  background: var(--color-mirage-800);
}

.peek-stat-icon {
  width: 18px;
  height: 18px;
  margin-bottom: 2px;
}

.peek-stat-icon.pts {
  color: var(--color-deep-600);
  stroke-width: 1.5;
}

.peek-stat-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-mirage-900);
  line-height: 1;
}

.peek-rank-num {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-mirage-900);
  line-height: 1;
}

.peek-stat-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-mirage-500);
}

.peek-actions {
  display: flex;
  gap: 10px;
  width: 100%;
  flex-wrap: wrap;
}

.peek-actions > * {
  flex: 1 1 120px;
  min-width: 0;
}

/* Transition */
.peek-fade-enter-active,
.peek-fade-leave-active {
  transition: opacity 0.2s ease;
}
.peek-fade-enter-from,
.peek-fade-leave-to {
  opacity: 0;
}
</style>