<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiChip from '@/components/ui/UiChip.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { BookOpenIcon, CheckIcon } from '@heroicons/vue/24/outline'
import {
  fetchBook,
  fetchModulesByBook,
} from '../services/books'
import {
  fetchApprovedExerciseCountsByModule,
  fetchUserExerciseCountsByModule,
} from '../services/exercises'
import { getAssetUrl, getStoredUserId } from '../services/client'
import type { Book, Module } from '@/types'

const route = useRoute()
const bookId = computed(() => Number(route.params.id || 1))

const book = ref<Book | null>(null)
const modules = ref<Module[]>([])
const approvedModules = ref<Module[]>([])
const moduleStats = ref<Record<number, { total: number; done: number; correct: number; remaining: number }>>({})
const error = ref('')
const isLoading = ref(false)

const moduleSummary = computed(() => {
  const values = Object.values(moduleStats.value)
  const total = values.reduce((sum, v) => sum + v.total, 0)
  const done = values.reduce((sum, v) => sum + v.done, 0)
  const correct = values.reduce((sum, v) => sum + v.correct, 0)
  return { total, done, correct, remaining: Math.max(0, total - done) }
})

const isMainChapter = (m: Module) => {
  if (m.order_number == null) return true
  const n = Number(m.order_number)
  return Number.isFinite(n) && Number.isInteger(n)
}

const completionPercent = (id: number) => {
  const s = moduleStats.value[id]
  if (!s || s.total === 0) return 0
  return Math.round((s.done / s.total) * 100)
}

const moduleStatus = (id: number): 'done' | 'progress' | 'fresh' => {
  const s = moduleStats.value[id]
  if (!s || s.total === 0) return 'fresh'
  if (s.done >= s.total && s.total > 0) return 'done'
  if (s.done > 0) return 'progress'
  return 'fresh'
}

const ctaLabel = (id: number) => {
  const status = moduleStatus(id)
  if (status === 'done') return 'Rever'
  if (status === 'progress') return 'Continuar'
  return 'Iniciar'
}

const formatOrder = (n: number | null | undefined) =>
  n == null ? '—' : String(n).padStart(2, '0')

watch(
  bookId,
  async (id) => {
    error.value = ''
    isLoading.value = true
    try {
      const userId = getStoredUserId()
      const [bookData, moduleList] = await Promise.all([fetchBook(id), fetchModulesByBook(id)])
      book.value = bookData
      approvedModules.value = moduleList
        .filter(isMainChapter)
        .filter((m) => m.status !== 'unapproved')
      modules.value = approvedModules.value

      if (userId && approvedModules.value.length) {
        const entries = await Promise.all(
          approvedModules.value.map(async (m) => {
            const total = await fetchApprovedExerciseCountsByModule(m.modules_id)
            const done = await fetchUserExerciseCountsByModule(userId, m.modules_id)
            const correct = await fetchUserExerciseCountsByModule(userId, m.modules_id, true)
            return [m.modules_id, { total, done, correct, remaining: Math.max(0, total - done) }] as const
          }),
        )
        moduleStats.value = Object.fromEntries(entries)
      } else {
        moduleStats.value = {}
      }
    } catch {
      error.value = 'Não foi possível carregar o livro.'
      book.value = null
      modules.value = []
      approvedModules.value = []
      moduleStats.value = {}
    } finally {
      isLoading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <section class="book-page">

    <!-- HERO -->
    <header class="book-hero">
      <div class="book-hero__info">
        <UiChip label="Biblioteca" variant="outline" />
        <h1 class="book-title">{{ book?.title || 'A carregar...' }}</h1>
        <p class="book-publisher">{{ (book as any)?.editora?.nome_editora || 'Sem editora' }}</p>
        <p v-if="book?.description" class="book-desc">{{ book.description }}</p>
      </div>
      <div class="book-hero__cover">
        <div class="book-cover">
          <img v-if="book?.cover_img" :src="getAssetUrl(book.cover_img)" alt="Capa do livro" />
          <BookOpenIcon v-else class="cover-icon" aria-hidden="true" />
        </div>
        <div class="book-cover-shadow" aria-hidden="true" />
      </div>
    </header>

    <!-- GLOBAL STATS -->
    <div v-if="approvedModules.length && !isLoading" class="stats-row">
      <div class="stat-card">
        <span class="stat-label">Total de exercícios</span>
        <strong class="stat-value">{{ moduleSummary.total }}</strong>
      </div>
      <div class="stat-card">
        <span class="stat-label">Feitos</span>
        <strong class="stat-value">{{ moduleSummary.done }}</strong>
      </div>
      <div class="stat-card">
        <span class="stat-label">Certos</span>
        <strong class="stat-value">{{ moduleSummary.correct }}</strong>
      </div>
      <div class="stat-card stat-card--accent">
        <span class="stat-label">Faltam</span>
        <strong class="stat-value">{{ moduleSummary.remaining }}</strong>
      </div>
    </div>

    <!-- MODULES -->
    <section class="modules-section">
      <div class="modules-header">
        <h2>Módulos</h2>
        <span v-if="approvedModules.length && !isLoading" class="modules-pill">
          {{ approvedModules.length }}
        </span>
      </div>

      <p v-if="isLoading" class="state-msg">A carregar módulos...</p>
      <p v-else-if="error" class="state-msg error">{{ error }}</p>

      <div v-else-if="approvedModules.length" class="module-list">
        <article
          v-for="moduleItem in approvedModules"
          :key="moduleItem.modules_id"
          class="module-card"
          :class="`module-card--${moduleStatus(moduleItem.modules_id)}`"
        >
          <!-- Order badge -->
          <div class="order-badge" :class="`order-badge--${moduleStatus(moduleItem.modules_id)}`" aria-hidden="true">
            <CheckIcon v-if="moduleStatus(moduleItem.modules_id) === 'done'" class="badge-check" />
            <span v-else class="badge-num">{{ formatOrder(moduleItem.order_number) }}</span>
          </div>

          <!-- Content -->
          <div class="module-body">
            <div class="module-body__title-row">
              <h3 class="module-title">{{ moduleItem.module_title || 'Sem título' }}</h3>
              <UiChip v-if="moduleStatus(moduleItem.modules_id) === 'done'" label="Completo" variant="filled" />
              <UiChip v-else-if="moduleStatus(moduleItem.modules_id) === 'progress'" label="Em progresso" variant="soft" />
            </div>
            <p v-if="moduleItem.additional_description" class="module-desc">
              {{ moduleItem.additional_description }}
            </p>
            <div class="module-progress">
              <div class="prog-track">
                <div class="prog-fill" :style="{ width: `${completionPercent(moduleItem.modules_id)}%` }" />
              </div>
              <span class="prog-label">
                {{ moduleStats[moduleItem.modules_id]?.done ?? 0 }}&thinsp;/&thinsp;{{ moduleStats[moduleItem.modules_id]?.total ?? 0 }} exercícios
                <span class="prog-pct">&nbsp;·&nbsp;{{ completionPercent(moduleItem.modules_id) }}%</span>
              </span>
            </div>
          </div>

          <!-- Action -->
          <div class="module-action">
            <RouterLink :to="`/book/${bookId}/module/${moduleItem.modules_id}`">
              <UiButton
                :variant="moduleStatus(moduleItem.modules_id) === 'done' ? 'outline' : 'primary'"
                size="sm"
              >
                {{ ctaLabel(moduleItem.modules_id) }}
              </UiButton>
            </RouterLink>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon-wrap">
          <BookOpenIcon class="empty-icon" aria-hidden="true" />
        </div>
        <h3>Sem módulos disponíveis</h3>
        <p>Este livro ainda não tem módulos aprovados.</p>
      </div>
    </section>

  </section>
</template>

<style scoped>
.book-page {
  display: grid;
  gap: var(--space-500);
}

/* ── HERO ───────────────────────────────────────── */
.book-hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-500);
  align-items: center;
  padding: var(--space-500);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 20px;
  box-shadow: 6px 6px 0 var(--color-shadow);
}

.book-hero__info {
  display: grid;
  gap: var(--space-200);
  align-content: start;
}

.book-title {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  color: var(--color-mirage-800);
  line-height: 1.15;
}

.book-publisher {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
}

.book-desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-600);
  line-height: 1.6;
  max-width: 500px;
}

.book-hero__cover {
  position: relative;
  flex-shrink: 0;
}

.book-cover {
  position: relative;
  z-index: 1;
  width: 148px;
  height: 208px;
  border-radius: 4px 16px 16px 4px;
  border: 2px solid var(--color-mirage-800);
  overflow: hidden;
  background: var(--color-deep-200);
  display: grid;
  place-items: center;
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-icon {
  width: 52px;
  height: 52px;
  color: var(--color-deep-600);
}

.book-cover-shadow {
  position: absolute;
  inset: 0;
  top: 8px;
  left: 8px;
  border-radius: 4px 16px 16px 4px;
  background: var(--color-shadow);
  z-index: 0;
}

/* ── STATS ROW ──────────────────────────────────── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-300);
}

.stat-card {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 14px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  padding: var(--space-300) var(--space-400);
  display: grid;
  gap: var(--space-050);
}

.stat-card--accent {
  background: var(--color-deep-100);
}

.stat-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-mirage-800);
  line-height: 1;
}

/* ── MODULES SECTION ────────────────────────────── */
.modules-section {
  display: grid;
  gap: var(--space-400);
}

.modules-header {
  display: flex;
  align-items: center;
  gap: var(--space-200);
}

.modules-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}

.modules-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--color-wild-200);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-600);
}

/* ── MODULE LIST ────────────────────────────────── */
.module-list {
  display: grid;
  gap: var(--space-300);
}

.module-card {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: var(--space-400);
  align-items: center;
  padding: var(--space-400);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 18px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.module-card:hover {
  transform: translateY(-3px);
  box-shadow: 6px 8px 0 var(--color-shadow);
}

.module-card--done {
  background: var(--color-deep-100);
}

/* Order badge */
.order-badge {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  place-items: center;
}

.order-badge--fresh   { background: var(--color-mirage-800); }
.order-badge--progress { background: var(--color-deep-600); }
.order-badge--done    { background: var(--color-deep-500); }

.badge-num {
  font-size: 28px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.badge-check {
  width: 36px;
  height: 36px;
  color: #fff;
  stroke-width: 2.5;
}

/* Module body */
.module-body {
  display: grid;
  gap: var(--space-200);
  min-width: 0;
}

.module-body__title-row {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  flex-wrap: wrap;
}

.module-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.module-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
  line-height: 1.5;
}

/* Progress inside card */
.module-progress {
  display: grid;
  gap: 6px;
}

.prog-track {
  height: 10px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
  overflow: hidden;
}

.prog-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-500));
  transition: width 0.6s ease;
}

.prog-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-mirage-500);
}

.prog-pct {
  color: var(--color-deep-600);
  font-weight: 700;
}

/* Action column */
.module-action {
  display: grid;
  place-items: center;
}

/* Empty state */
.empty-state {
  display: grid;
  place-items: center;
  gap: var(--space-300);
  padding: var(--space-600) var(--space-400);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 16px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  text-align: center;
}

.empty-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-wild-200);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  display: grid;
  place-items: center;
}

.empty-icon {
  width: 28px;
  height: 28px;
  color: var(--color-mirage-500);
}

.empty-state h3 {
  margin: 0;
  font-size: 18px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-500);
}

.state-msg {
  font-weight: 600;
  color: var(--color-mirage-600);
}

.state-msg.error {
  color: #b13b3b;
}

/* ── RESPONSIVE ─────────────────────────────────── */
@media (max-width: 900px) {
  .book-hero {
    grid-template-columns: 1fr;
  }

  .book-hero__cover {
    display: none;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .module-card {
    grid-template-columns: 64px 1fr;
    grid-template-rows: auto auto;
  }

  .order-badge {
    width: 64px;
    height: 64px;
  }

  .badge-num {
    font-size: 22px;
  }

  .module-action {
    grid-column: 1 / -1;
    place-items: start;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
