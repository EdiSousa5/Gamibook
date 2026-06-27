<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  BookOpenIcon,
  UsersIcon,
  SparklesIcon,
  BoltIcon,
  FireIcon,
  TrophyIcon,
  ChartBarIcon,
} from '@heroicons/vue/24/outline'
import UiCard from '@/components/ui/UiCard.vue'
import UiStatCard from '@/components/ui/UiStatCard.vue'
import UiChip from '@/components/ui/UiChip.vue'
import UiProgress from '@/components/ui/UiProgress.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import {
  fetchBooks,
  fetchBooksByAutor,
  fetchBooksByEditora,
  fetchBookUserStats,
  fetchModulesByBook,
  fetchExerciseCountByModules,
  fetchBookExerciseAttempts,
  fetchCorrectAttemptsByModules,
} from '@/services/books'
import { fetchPlatformStats, type PlatformStats } from '@/services/exercises'
import { getAssetUrl, getStoredUserId } from '@/services/client'
import { fetchCurrentUserEditoraId } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import type { Book } from '@/types'

const auth = useAuthStore()
const storedId = getStoredUserId() ?? ''

const roleName = computed(() => {
  const role = auth.user?.role
  const name = typeof role === 'string' ? role : (role as any)?.name ?? ''
  return name.trim().toLowerCase()
})
const isAutor = computed(() => roleName.value === 'autor')
const isEditora = computed(() => roleName.value === 'editora')
const isEditorRole = computed(() => isAutor.value || isEditora.value)

// ── Types ─────────────────────────────────────────────────

interface BookStat {
  book: Book
  users: number
  badgeCounts: Record<string, number>
  totalExercises: number
  totalAttempts: number
  correctAttempts: number
}

// ── State ─────────────────────────────────────────────────

const loading = ref(true)
const platformLoading = ref(true)
const stats = ref<BookStat[]>([])
const platform = ref<PlatformStats | null>(null)
const filterStatus = ref('all')

const filterOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Publicados', value: 'approved' },
  { label: 'Não publicados', value: 'pending' },
]

// ── Load ──────────────────────────────────────────────────

onMounted(async () => {
  loading.value = true
  platformLoading.value = true

  // Carregar estatísticas da plataforma (só para admins verdadeiros, não editoras/autores)
  if (!isEditorRole.value) {
    fetchPlatformStats()
      .then(data => { platform.value = data })
      .catch(e => console.error('fetchPlatformStats', e))
      .finally(() => { platformLoading.value = false })
  } else {
    platformLoading.value = false
  }

  try {
    let books
    if (isAutor.value) {
      books = await fetchBooksByAutor(storedId)
    } else if (isEditora.value) {
      const editoraId = await fetchCurrentUserEditoraId()
      books = editoraId != null ? await fetchBooksByEditora(editoraId) : []
    } else {
      books = await fetchBooks()
    }

    stats.value = await Promise.all(
      books.map(async (book): Promise<BookStat> => {
        const [userStat, modules] = await Promise.all([
          fetchBookUserStats(book.book_id).catch(() => ({ totalUsers: 0, badgeCounts: {} as Record<string, number> })),
          fetchModulesByBook(book.book_id).catch(() => []),
        ])
        const moduleIds = modules.map(m => m.modules_id)
        const [totalExercises, totalAttempts, correctAttempts] = await Promise.all([
          fetchExerciseCountByModules(moduleIds).catch(() => 0),
          fetchBookExerciseAttempts(moduleIds).catch(() => 0),
          fetchCorrectAttemptsByModules(moduleIds).catch(() => 0),
        ])
        return {
          book,
          users: userStat.totalUsers,
          badgeCounts: userStat.badgeCounts,
          totalExercises,
          totalAttempts,
          correctAttempts,
        }
      }),
    )
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

// ── Derived ───────────────────────────────────────────────

const filtered = computed(() => {
  if (filterStatus.value === 'approved') return stats.value.filter(s => s.book.is_approved)
  if (filterStatus.value === 'pending') return stats.value.filter(s => !s.book.is_approved)
  return stats.value
})

const totals = computed(() => ({
  books: stats.value.length,
  approved: stats.value.filter(s => s.book.is_approved).length,
  users: stats.value.reduce((a, s) => a + s.users, 0),
}))

const successRate = computed(() => {
  if (!platform.value || !platform.value.totalAttempts) return 0
  return Math.round((platform.value.correctAttempts / platform.value.totalAttempts) * 100)
})

function formatXp(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

// ── Badge chart ───────────────────────────────────────────

const BADGE_ORDER = ['default', 'bronze', 'silver', 'gold', 'diamond', 'galaxy'] as const
const BADGE_LABELS: Record<string, string> = {
  default: 'Sem badge', bronze: 'Bronze', silver: 'Prata',
  gold: 'Ouro', diamond: 'Diamante', galaxy: 'Galaxy',
}
const BADGE_COLORS: Record<string, string> = {
  default: 'var(--color-mirage-300)',
  bronze: '#c07830',
  silver: '#8a97a4',
  gold: '#d4a820',
  diamond: '#3baad4',
  galaxy: '#9b5de5',
}


function acertoPct(s: BookStat) {
  return s.totalAttempts > 0 ? Math.round((s.correctAttempts / s.totalAttempts) * 100) : 0
}
</script>

<template>
  <section class="stats-page">

    <!-- Header -->
    <header class="page-header">
      <p class="kicker">Painel de administração</p>
      <h1>Estatísticas</h1>
    </header>

    <!-- Summary stat cards (conteúdo) -->
    <div v-if="loading" class="summary-grid">
      <UiSkeleton v-for="i in 4" :key="i" height="72px" radius="14px" />
    </div>
    <div v-else class="summary-grid">
      <UiStatCard label="Livros" :value="totals.books">
        <template #icon><BookOpenIcon class="stat-icon" /></template>
        <template #value>
          <span class="stat-val">{{ totals.books }}</span>
          <span class="stat-sub">{{ totals.approved }} publicados</span>
        </template>
      </UiStatCard>

      <UiStatCard label="Leitores" :value="totals.users">
        <template #icon><UsersIcon class="stat-icon" /></template>
        <template #value>
          <span class="stat-val">{{ totals.users }}</span>
          <span class="stat-sub">em todos os livros</span>
        </template>
      </UiStatCard>

    </div>

    <!-- Atividade da Plataforma (só para admins verdadeiros) -->
    <template v-if="!isEditorRole">
      <div class="section-title-row">
        <ChartBarIcon class="section-title-icon" aria-hidden="true" />
        <h2 class="section-title">Atividade da Plataforma</h2>
      </div>

      <div v-if="platformLoading" class="summary-grid platform-grid">
        <UiSkeleton v-for="i in 4" :key="i" height="72px" radius="14px" />
      </div>
      <div v-else class="summary-grid platform-grid">
        <UiStatCard label="Utilizadores ativos" :value="platform?.activeUsers ?? 0">
          <template #icon><UsersIcon class="stat-icon stat-icon--platform" /></template>
          <template #value>
            <span class="stat-val">{{ platform?.activeUsers?.toLocaleString('pt-PT') ?? '—' }}</span>
            <span class="stat-sub">com atividade registada</span>
          </template>
        </UiStatCard>

        <UiStatCard label="XP total ganho" :value="platform?.totalXp ?? 0">
          <template #icon><BoltIcon class="stat-icon stat-icon--platform" /></template>
          <template #value>
            <span class="stat-val">{{ platform ? formatXp(platform.totalXp) : '—' }}</span>
            <span class="stat-sub">pontos de experiência</span>
          </template>
        </UiStatCard>

        <UiStatCard label="Tentativas de exercícios" :value="platform?.totalAttempts ?? 0">
          <template #icon><SparklesIcon class="stat-icon stat-icon--platform" /></template>
          <template #value>
            <span class="stat-val">{{ platform?.totalAttempts?.toLocaleString('pt-PT') ?? '—' }}</span>
            <span class="stat-sub">{{ successRate }}% de respostas corretas</span>
          </template>
        </UiStatCard>

        <UiStatCard label="Desafios diários" :value="platform?.totalDailyChallenges ?? 0">
          <template #icon><FireIcon class="stat-icon stat-icon--platform" /></template>
          <template #value>
            <span class="stat-val">{{ platform?.totalDailyChallenges?.toLocaleString('pt-PT') ?? '—' }}</span>
            <span class="stat-sub">completados na plataforma</span>
          </template>
        </UiStatCard>
      </div>

      <!-- Taxa de acerto detalhada -->
      <UiCard v-if="!platformLoading && platform && platform.totalAttempts > 0" class="accuracy-card">
        <div class="accuracy-header">
          <TrophyIcon class="accuracy-icon" aria-hidden="true" />
          <div>
            <p class="accuracy-title">Taxa de acerto global</p>
            <p class="accuracy-sub">Baseada em {{ platform.totalAttempts.toLocaleString('pt-PT') }} tentativas de todos os leitores</p>
          </div>
          <span class="accuracy-pct">{{ successRate }}%</span>
        </div>
        <div class="accuracy-bar-wrap">
          <UiProgress :value="successRate" :max="100" />
        </div>
        <div class="accuracy-breakdown">
          <div class="accuracy-cell accuracy-cell--correct">
            <span class="accuracy-cell-val">{{ platform.correctAttempts.toLocaleString('pt-PT') }}</span>
            <span class="accuracy-cell-label">corretas</span>
          </div>
          <div class="accuracy-cell accuracy-cell--wrong">
            <span class="accuracy-cell-val">{{ (platform.totalAttempts - platform.correctAttempts).toLocaleString('pt-PT') }}</span>
            <span class="accuracy-cell-label">incorretas</span>
          </div>
        </div>
      </UiCard>
    </template>

    <!-- Filter -->
    <div class="toolbar">
      <UiSegmented
        :model-value="filterStatus"
        :options="filterOptions"
        @update="(v: string) => { filterStatus = v }"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="book-list">
      <UiSkeleton v-for="i in 3" :key="i" height="260px" radius="12px" />
    </div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="empty-state">
      <BookOpenIcon class="empty-icon" />
      <p>Nenhum livro encontrado.</p>
    </div>

    <!-- Book cards -->
    <div v-else class="book-list">
      <UiCard v-for="s in filtered" :key="s.book.book_id" class="book-card">

        <!-- Book row -->
        <div class="book-row">
          <img
            v-if="s.book.cover_img"
            :src="getAssetUrl(s.book.cover_img)"
            class="book-cover"
            :alt="s.book.title"
          />
          <div v-else class="book-cover book-cover--empty">
            <BookOpenIcon />
          </div>

          <div class="book-info">
            <h2 class="book-title">{{ s.book.title }}</h2>
            <div class="book-chips">
              <UiChip
                :label="s.book.is_approved ? 'Publicado' : 'Não publicado'"
                :variant="s.book.is_approved ? 'filled' : 'outline'"
              />
              <UiChip
                :label="s.book.has_minimum_content ? 'Conteúdo completo' : 'Conteúdo em falta'"
                :variant="s.book.has_minimum_content ? 'soft' : 'outline'"
              />
            </div>
          </div>

          <!-- Quick numbers -->
          <div class="quick-numbers">
            <div class="quick-num">
              <UsersIcon class="qnum-icon" />
              <span class="qnum-val">{{ s.users }}</span>
              <span class="qnum-label">leitores</span>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="divider" />

        <!-- Stats row -->
        <div class="stats-row">

          <!-- Badge distribution -->
          <div class="stat-block">
            <p class="stat-label">Badges dos leitores</p>
            <div v-if="s.users === 0" class="stat-empty">Ainda sem leitores</div>
            <div v-else class="badge-list">
              <div
                v-for="tier in BADGE_ORDER"
                :key="tier"
                class="badge-list-row"
              >
                <span class="badge-list-dot" :style="{ background: BADGE_COLORS[tier] }" />
                <span class="badge-list-name">{{ BADGE_LABELS[tier] }}</span>
                <span class="badge-list-count">{{ s.badgeCounts[tier] ?? 0 }}</span>
                <span class="badge-list-pct">
                  {{ s.users > 0 ? Math.round(((s.badgeCounts[tier] ?? 0) / s.users) * 100) : 0 }}%
                </span>
              </div>
            </div>
          </div>

          <!-- Exercícios -->
          <div class="stat-block">
            <p class="stat-label">Exercícios</p>
            <p class="ex-count">{{ s.totalExercises }}</p>
            <p class="stat-sub-text">{{ s.totalAttempts }} tentativas no total</p>
          </div>

          <!-- Taxa de acerto -->
          <div class="stat-block">
            <p class="stat-label">Taxa de acerto</p>
            <div v-if="s.totalAttempts === 0" class="stat-empty">Sem tentativas ainda</div>
            <template v-else>
              <div class="progress-row">
                <UiProgress :value="acertoPct(s)" :max="100" />
                <span class="progress-pct">{{ acertoPct(s) }}%</span>
              </div>
              <p class="stat-sub-text">{{ s.correctAttempts }} correctas de {{ s.totalAttempts }}</p>
            </template>
          </div>

        </div>
      </UiCard>
    </div>

  </section>
</template>

<style scoped>
.stats-page {
  display: grid;
  gap: var(--space-500);
}

/* ── Header (idêntico ao AdminHome) ── */
.page-header { display: grid; gap: var(--space-100); }
.kicker {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-mirage-500);
}
h1 {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-mirage-800);
  margin: 0;
}

/* ── Summary grid ── */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: var(--space-300);
}
.stat-icon {
  width: 22px;
  height: 22px;
  stroke: var(--color-deep-700);
  stroke-width: var(--icon-stroke);
}
.stat-val {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-mirage-800);
  line-height: 1;
  display: block;
}
.stat-sub {
  font-size: 11px;
  color: var(--color-mirage-500);
  font-weight: 600;
  display: block;
  margin-top: 2px;
}

/* ── Section title ── */
.section-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-200);
}
.section-title-icon {
  width: 20px;
  height: 20px;
  stroke: var(--color-mirage-600);
  stroke-width: var(--icon-stroke);
  flex-shrink: 0;
}
.section-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-mirage-800);
  margin: 0;
}

/* ── Platform grid ── */
.platform-grid { }
.stat-icon--platform { stroke: var(--color-deep-600); }

/* ── Accuracy card ── */
.accuracy-card {
  display: grid;
  gap: var(--space-300);
}
.accuracy-header {
  display: flex;
  align-items: center;
  gap: var(--space-300);
}
.accuracy-icon {
  width: 24px;
  height: 24px;
  stroke: var(--color-deep-600);
  stroke-width: var(--icon-stroke);
  flex-shrink: 0;
}
.accuracy-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-800);
  margin: 0;
}
.accuracy-sub {
  font-size: 11px;
  color: var(--color-mirage-500);
  font-weight: 600;
  margin: 2px 0 0;
}
.accuracy-pct {
  margin-left: auto;
  font-size: 26px;
  font-weight: 800;
  color: var(--color-mirage-800);
  flex-shrink: 0;
}
.accuracy-bar-wrap { }
.accuracy-breakdown {
  display: flex;
  gap: var(--space-300);
}
.accuracy-cell {
  flex: 1;
  display: grid;
  gap: var(--space-050);
  padding: var(--space-300);
  border-radius: var(--radius-200);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
}
.accuracy-cell--correct { background: var(--color-deep-100); }
.accuracy-cell--wrong   { background: var(--color-wild-300); }
.accuracy-cell-val {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-mirage-800);
}
.accuracy-cell-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
}

/* ── Toolbar ── */
.toolbar { display: flex; }

/* ── Book list ── */
.book-list { display: grid; gap: var(--space-400); }

.book-card { display: grid; gap: var(--space-300); }

/* Book row */
.book-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-300);
}
.book-cover {
  width: 52px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  flex-shrink: 0;
}
.book-cover--empty {
  background: var(--color-wild-400);
  display: grid;
  place-items: center;
}
.book-cover--empty svg {
  width: 22px;
  height: 22px;
  stroke: var(--color-mirage-400);
  stroke-width: var(--icon-stroke);
}
.book-info {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: var(--space-150);
  align-content: start;
}
.book-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-mirage-800);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}
.book-chips { display: flex; flex-wrap: wrap; gap: var(--space-100); }

.quick-numbers {
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
  align-items: flex-end;
  flex-shrink: 0;
}
.quick-num { display: flex; align-items: center; gap: 5px; }
.qnum-icon {
  width: 13px;
  height: 13px;
  stroke: var(--color-mirage-500);
  stroke-width: var(--icon-stroke);
}
.qnum-val { font-size: 14px; font-weight: 800; color: var(--color-mirage-800); }
.qnum-label { font-size: 11px; color: var(--color-mirage-500); font-weight: 600; }

/* Divider */
.divider { height: 1px; background: var(--color-mirage-200); }

/* Stats row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-400);
}
.stat-block { display: grid; gap: var(--space-150); align-content: start; }
.stat-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--color-mirage-400);
}
.stat-empty { font-size: 12px; color: var(--color-mirage-400); font-weight: 600; }
.stat-sub-text { font-size: 11px; color: var(--color-mirage-500); font-weight: 600; }

/* Badge list */
.badge-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.badge-list-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
}
.badge-list-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid var(--color-mirage-800);
  flex-shrink: 0;
}
.badge-list-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-mirage-600);
  flex: 1;
}
.badge-list-count {
  font-size: 12px;
  font-weight: 800;
  color: var(--color-mirage-800);
  min-width: 20px;
  text-align: right;
}
.badge-list-pct {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-mirage-400);
  min-width: 30px;
  text-align: right;
}

/* Progress */
.progress-row { display: flex; align-items: center; gap: var(--space-150); }
.progress-pct { font-size: 12px; font-weight: 800; color: var(--color-mirage-800); white-space: nowrap; }

/* Exercise count */
.ex-count {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-mirage-800);
  line-height: 1;
  margin: 2px 0 4px;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-200);
  padding: var(--space-800) var(--space-400);
  color: var(--color-mirage-400);
}
.empty-icon { width: 44px; height: 44px; stroke: currentColor; stroke-width: var(--icon-stroke); }
.empty-state p { font-size: 14px; font-weight: 700; }

@media (max-width: 37.5em) {
  h1 { font-size: 22px; }
  .summary-grid { grid-template-columns: 1fr 1fr; }
  .quick-numbers { display: none; }
  .stats-row { grid-template-columns: 1fr; }
}
</style>
