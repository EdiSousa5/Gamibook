<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { fetchUserPointsHistoryList, type PointsHistoryEntry } from '@/services/exercises'
import { StarIcon, CalendarDaysIcon, FireIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const auth = useAuthStore()
const entries = ref<PointsHistoryEntry[]>([])
const isLoading = ref(true)
const error = ref('')

type SourceFilter = 'all' | 'exercise' | 'daily'
type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'custom'

const sourceFilter = ref<SourceFilter>('all')
const periodFilter = ref<PeriodFilter>('all')
const customDateFrom = ref('')
const customDateTo = ref('')

const GROUPS_PER_PAGE = 7
const currentPage = ref(1)

const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0,0,0,0); return c }

const filteredEntries = computed(() => {
  let list = entries.value

  if (sourceFilter.value !== 'all') {
    list = list.filter(e => e.source === sourceFilter.value)
  }

  if (periodFilter.value === 'today') {
    const today = startOfDay(new Date())
    list = list.filter(e => new Date(e.date_created) >= today)
  } else if (periodFilter.value === 'week') {
    const weekAgo = startOfDay(new Date())
    weekAgo.setDate(weekAgo.getDate() - 7)
    list = list.filter(e => new Date(e.date_created) >= weekAgo)
  } else if (periodFilter.value === 'month') {
    const monthAgo = startOfDay(new Date())
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    list = list.filter(e => new Date(e.date_created) >= monthAgo)
  } else if (periodFilter.value === 'custom') {
    if (customDateFrom.value) {
      const from = startOfDay(new Date(customDateFrom.value))
      list = list.filter(e => new Date(e.date_created) >= from)
    }
    if (customDateTo.value) {
      const to = startOfDay(new Date(customDateTo.value))
      to.setDate(to.getDate() + 1)
      list = list.filter(e => new Date(e.date_created) < to)
    }
  }

  return list
})

const totalPoints = computed(() => filteredEntries.value.reduce((s, e) => s + (e.points ?? 0), 0))
const exerciseCount = computed(() => entries.value.filter(e => e.source === 'exercise').length)
const dailyCount = computed(() => entries.value.filter(e => e.source === 'daily').length)

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const allGroups = computed(() => {
  const groups: { date: string; entries: PointsHistoryEntry[] }[] = []
  const map = new Map<string, PointsHistoryEntry[]>()
  for (const e of filteredEntries.value) {
    const day = new Date(e.date_created).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(e)
  }
  for (const [date, es] of map) groups.push({ date, entries: es })
  return groups
})

const totalPages = computed(() => Math.max(1, Math.ceil(allGroups.value.length / GROUPS_PER_PAGE)))

const paginatedGroups = computed(() => {
  const start = (currentPage.value - 1) * GROUPS_PER_PAGE
  return allGroups.value.slice(start, start + GROUPS_PER_PAGE)
})

const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = []
  pages.push(1)
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

function setSource(f: SourceFilter) {
  sourceFilter.value = f
  currentPage.value = 1
}

function setPeriod(p: PeriodFilter) {
  periodFilter.value = p
  currentPage.value = 1
}

function goPage(p: number) {
  currentPage.value = Math.max(1, Math.min(totalPages.value, p))
}

watch([customDateFrom, customDateTo], () => { currentPage.value = 1 })

onMounted(async () => {
  const userId = auth.user?.id ? String(auth.user.id) : null
  if (!userId) { isLoading.value = false; return }
  try {
    entries.value = await fetchUserPointsHistoryList(userId, 500)
  } catch {
    error.value = 'Não foi possível carregar o histórico.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="history-section">
    <div class="section-heading">
      <h2>Histórico de Atividade</h2>
      <p class="description">O teu registo de XP ganho em exercícios e desafios diários.</p>
    </div>

    <div v-if="isLoading" class="state-msg">A carregar…</div>
    <div v-else-if="error" class="state-msg state-msg--error">{{ error }}</div>
    <template v-else-if="entries.length === 0">
      <div class="empty-card">
        <StarIcon class="empty-icon" aria-hidden="true" />
        <p class="empty-title">Ainda sem atividade registada</p>
        <p class="empty-sub">Completa exercícios para veres o teu histórico aqui.</p>
      </div>
    </template>
    <template v-else>

      <!-- Summary -->
      <div class="summary-row">
        <div class="summary-card">
          <StarIcon class="summary-icon summary-icon--pts" aria-hidden="true" />
          <span class="summary-val">{{ totalPoints.toLocaleString('pt-PT') }}</span>
          <span class="summary-lbl">XP {{ sourceFilter === 'all' ? 'total' : 'filtrado' }}</span>
        </div>
        <div class="summary-card">
          <CalendarDaysIcon class="summary-icon summary-icon--ex" aria-hidden="true" />
          <span class="summary-val">{{ exerciseCount }}</span>
          <span class="summary-lbl">Exercícios</span>
        </div>
        <div class="summary-card">
          <FireIcon class="summary-icon summary-icon--daily" aria-hidden="true" />
          <span class="summary-val">{{ dailyCount }}</span>
          <span class="summary-lbl">Diários</span>
        </div>
      </div>

      <!-- Filtros de fonte -->
      <div class="filter-group">
        <span class="filter-group__label">Tipo</span>
        <div class="filter-bar">
          <button class="filter-btn" :class="{ active: sourceFilter === 'all' }" @click="setSource('all')">Todos</button>
          <button class="filter-btn" :class="{ active: sourceFilter === 'exercise' }" @click="setSource('exercise')">Exercícios</button>
          <button class="filter-btn" :class="{ active: sourceFilter === 'daily' }" @click="setSource('daily')">Diários</button>
        </div>
      </div>

      <!-- Filtros de período -->
      <div class="filter-group">
        <span class="filter-group__label">Período</span>
        <div class="filter-bar">
          <button class="filter-btn" :class="{ active: periodFilter === 'all' }" @click="setPeriod('all')">Tudo</button>
          <button class="filter-btn" :class="{ active: periodFilter === 'today' }" @click="setPeriod('today')">Hoje</button>
          <button class="filter-btn" :class="{ active: periodFilter === 'week' }" @click="setPeriod('week')">Semana</button>
          <button class="filter-btn" :class="{ active: periodFilter === 'month' }" @click="setPeriod('month')">Mês</button>
          <button class="filter-btn" :class="{ active: periodFilter === 'custom' }" @click="setPeriod('custom')">Intervalo</button>
        </div>
      </div>

      <!-- Date range picker (custom) -->
      <div v-if="periodFilter === 'custom'" class="date-range">
        <div class="date-field">
          <label class="date-label" for="date-from">De</label>
          <input id="date-from" type="date" class="date-input" v-model="customDateFrom" />
        </div>
        <div class="date-field">
          <label class="date-label" for="date-to">Até</label>
          <input id="date-to" type="date" class="date-input" v-model="customDateTo" />
        </div>
      </div>

      <!-- Empty filtered state -->
      <div v-if="allGroups.length === 0" class="empty-card">
        <StarIcon class="empty-icon" aria-hidden="true" />
        <p class="empty-title">Sem resultados</p>
        <p class="empty-sub">Não há atividade com os filtros selecionados.</p>
      </div>

      <template v-else>
        <!-- Timeline -->
        <div class="timeline">
          <div v-for="group in paginatedGroups" :key="group.date" class="day-group">
            <div class="day-header">
              <span class="day-label">{{ group.date }}</span>
              <span class="day-total">+{{ group.entries.reduce((s, e) => s + e.points, 0) }} XP</span>
            </div>
            <div class="entry-list">
              <div v-for="(entry, idx) in group.entries" :key="idx" class="entry-row">
                <div class="entry-badge" :class="entry.source === 'daily' ? 'entry-badge--daily' : 'entry-badge--ex'">
                  <FireIcon v-if="entry.source === 'daily'" class="entry-icon" aria-hidden="true" />
                  <StarIcon v-else class="entry-icon" aria-hidden="true" />
                </div>
                <div class="entry-body">
                  <span class="entry-type">{{ entry.source === 'daily' ? 'Desafio Diário' : 'Exercício' }}</span>
                  <span class="entry-time">{{ formatDate(entry.date_created) }}</span>
                </div>
                <span class="entry-pts">+{{ entry.points }} XP</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Paginação -->
        <div v-if="totalPages > 1" class="pagination">
          <button
            class="page-btn page-btn--nav"
            :disabled="currentPage === 1"
            aria-label="Página anterior"
            @click="goPage(currentPage - 1)"
          >
            <ChevronLeftIcon class="page-icon" aria-hidden="true" />
          </button>

          <template v-for="(p, i) in pageNumbers" :key="i">
            <span v-if="p === '...'" class="page-ellipsis">…</span>
            <button
              v-else
              class="page-btn"
              :class="{ active: p === currentPage }"
              @click="goPage(p as number)"
            >{{ p }}</button>
          </template>

          <button
            class="page-btn page-btn--nav"
            :disabled="currentPage === totalPages"
            aria-label="Próxima página"
            @click="goPage(currentPage + 1)"
          >
            <ChevronRightIcon class="page-icon" aria-hidden="true" />
          </button>
        </div>

        <p class="pagination-info">
          Página {{ currentPage }} de {{ totalPages }} · {{ allGroups.length }} dias no total
        </p>
      </template>

    </template>
  </div>
</template>

<style scoped>
.history-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-400);
}

.section-heading h2 {
  margin: 0;
  font-family: var(--font-display);
}

.description {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-mirage-600);
}

.state-msg {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-mirage-500);
  padding: var(--space-500) 0;
}

.state-msg--error { color: var(--color-error-strong); }

/* ── Empty ── */
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-200);
  padding: var(--space-700) var(--space-400);
  border-radius: 16px;
  border: 2px dashed var(--color-mirage-300);
  background: var(--color-wild-200);
  text-align: center;
}

.empty-icon {
  width: 40px;
  height: 40px;
  color: var(--color-mirage-400);
  stroke-width: 1.5;
}

.empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--color-mirage-700);
}

.empty-sub {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
}

/* ── Summary ── */
.summary-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-300);
}

.summary-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-100);
  padding: var(--space-400) var(--space-300);
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 3px 3px 0 var(--color-shadow);
  text-align: center;
}

.summary-icon {
  width: 20px;
  height: 20px;
  stroke-width: 1.8;
}

.summary-icon--pts { color: var(--color-deep-600); }
.summary-icon--ex  { color: var(--color-deep-500); }
.summary-icon--daily { color: #f97316; }

.summary-val {
  font-size: 22px;
  font-weight: 900;
  color: var(--color-mirage-900);
  line-height: 1;
}

.summary-lbl {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-mirage-500);
}

/* ── Filter groups ── */
.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
}

.filter-group__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
}

.filter-bar {
  display: flex;
  gap: var(--space-150);
  flex-wrap: wrap;
}

.filter-btn {
  padding: 7px 16px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-base);
  color: var(--color-mirage-600);
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--color-shadow);
  transition: background 0.12s ease, transform 0.12s ease;
}

.filter-btn:hover { background: var(--color-wild-200); }

.filter-btn.active {
  background: var(--color-deep-100);
  border-color: var(--color-deep-600);
  color: var(--color-deep-700);
  box-shadow: 2px 2px 0 var(--color-deep-300);
}

/* ── Date range ── */
.date-range {
  display: flex;
  gap: var(--space-300);
  flex-wrap: wrap;
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
  flex: 1;
  min-width: 140px;
}

.date-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-mirage-600);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.date-input {
  padding: 8px 12px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-base);
  color: var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  cursor: pointer;
  outline: none;
  width: 100%;
}

.date-input:focus {
  border-color: var(--color-deep-500);
  box-shadow: 3px 3px 0 var(--color-deep-200);
}

/* ── Timeline ── */
.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-400);
}

.day-group {
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  overflow: hidden;
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-wild-200);
  border-bottom: 2px solid var(--color-mirage-800);
}

.day-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-700);
  text-transform: capitalize;
}

.day-total {
  font-size: 12px;
  font-weight: 800;
  color: var(--color-deep-600);
}

.entry-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.entry-row {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-wild-400);
}

.entry-row:last-child { border-bottom: none; }

.entry-badge {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: 2px solid var(--color-mirage-800);
  display: grid;
  place-items: center;
}

.entry-badge--ex    { background: var(--color-deep-100); }
.entry-badge--daily { background: #fff4e0; }

.entry-icon {
  width: 14px;
  height: 14px;
  stroke-width: 2;
  color: var(--color-mirage-700);
}

.entry-badge--daily .entry-icon { color: #f97316; }
.entry-badge--ex    .entry-icon { color: var(--color-deep-600); }

.entry-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.entry-type {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.entry-time {
  font-size: 11px;
  color: var(--color-mirage-500);
  font-weight: 500;
}

.entry-pts {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--color-deep-700);
}

/* ── Paginação ── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-150);
  flex-wrap: wrap;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  font-size: 13px;
  font-weight: 700;
  font-family: var(--font-base);
  color: var(--color-mirage-700);
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--color-shadow);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s ease, transform 0.1s ease, box-shadow 0.1s ease;
}

.page-btn:hover:not(:disabled) {
  background: var(--color-wild-200);
  transform: translateY(-1px);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.page-btn:active:not(:disabled) {
  transform: translate(1px, 2px);
  box-shadow: 1px 1px 0 var(--color-shadow);
}

.page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.page-btn.active {
  background: var(--color-deep-500);
  border-color: var(--color-deep-700);
  color: #fff;
  box-shadow: 3px 3px 0 var(--color-deep-800);
}

.page-btn--nav {
  min-width: 36px;
}

.page-icon {
  width: 14px;
  height: 14px;
  stroke-width: 2.5;
}

.page-ellipsis {
  width: 28px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-mirage-400);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pagination-info {
  margin: 0;
  font-size: 11px;
  color: var(--color-mirage-500);
  font-weight: 600;
  text-align: center;
}

@media (max-width: 480px) {
  .summary-row { gap: var(--space-200); }
  .summary-val { font-size: 18px; }

  .date-range {
    flex-direction: column;
    gap: var(--space-200);
  }

  .pagination {
    gap: var(--space-100);
  }

  .page-btn {
    min-width: 32px;
    height: 32px;
    font-size: 12px;
  }
}
</style>
