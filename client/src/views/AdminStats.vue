<script setup lang="ts">
import { onMounted, ref } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import { authFetch, getAssetUrl } from '@/services/client'
import { fetchBooks } from '@/services/books'
import type { Book } from '@/types'

type BookStat = {
  book: Book
  owners: number
  modules: number
  exercises: number
  dailyExercises: number
  answeredExercises: number
}

const loading = ref(true)
const stats = ref<BookStat[]>([])
const error = ref('')

onMounted(async () => {
  try {
    const [
      books,
      userBooksData,
      modulesData,
      exercisesData,
      dailyExData,
      userExData,
    ] = await Promise.all([
      fetchBooks(),
      authFetch('/items/user_books?fields=book_id&limit=-1').then(r => r.json()),
      authFetch('/items/modules?fields=modules_id,id_book&limit=-1').then(r => r.json()),
      authFetch('/items/exercises?fields=exercise_id,id_module&limit=-1').then(r => r.json()),
      authFetch('/items/daily_exercise?fields=daily_exercise_id,book_id&limit=-1').then(r => r.json()),
      authFetch('/items/user_exercises?fields=id_user_exercises,module_id&limit=-1').then(r => r.json()),
    ])

    const userBooksItems: Array<{ book_id: number }> = userBooksData?.data ?? []
    const allModules: Array<{ modules_id: number; id_book: number }> = modulesData?.data ?? []
    const exerciseItems: Array<{ exercise_id: number; id_module: number }> = exercisesData?.data ?? []
    const dailyExItems: Array<{ daily_exercise_id: number; book_id: number }> = dailyExData?.data ?? []
    const userExItems: Array<{ id_user_exercises: number; module_id: number }> = userExData?.data ?? []

    stats.value = books.map((book) => {
      const id = book.book_id

      const owners = userBooksItems.filter(r => Number(r.book_id) === id).length

      const bookModules = allModules.filter(m => Number(m.id_book) === id)
      const moduleIds = new Set(bookModules.map(m => m.modules_id))

      const exercises = exerciseItems.filter(r => moduleIds.has(Number(r.id_module))).length

      const dailyExercises = dailyExItems.filter(r => Number(r.book_id) === id).length

      const answeredExercises = userExItems.filter(r => moduleIds.has(Number(r.module_id))).length

      return {
        book,
        owners,
        modules: bookModules.length,
        exercises,
        dailyExercises,
        answeredExercises,
      }
    })
  } catch {
    error.value = 'Erro ao carregar as estatísticas.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="admin-stats">
    <header class="page-header">
      <p class="kicker">Painel de administração</p>
      <h1>Estatísticas</h1>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="spinner" />
      <p>A carregar estatísticas...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>

    <template v-else>
      <div class="summary-row">
        <UiCard class="summary-card">
          <span class="summary-label">Total de livros</span>
          <strong class="summary-value">{{ stats.length }}</strong>
        </UiCard>
        <UiCard class="summary-card">
          <span class="summary-label">Total de proprietários</span>
          <strong class="summary-value">{{ stats.reduce((s, b) => s + b.owners, 0) }}</strong>
        </UiCard>
        <UiCard class="summary-card">
          <span class="summary-label">Total de exercícios</span>
          <strong class="summary-value">{{ stats.reduce((s, b) => s + b.exercises + b.dailyExercises, 0) }}</strong>
        </UiCard>
        <UiCard class="summary-card">
          <span class="summary-label">Respostas dadas</span>
          <strong class="summary-value">{{ stats.reduce((s, b) => s + b.answeredExercises, 0) }}</strong>
        </UiCard>
      </div>

      <UiCard class="table-card">
        <div class="table-wrap">
          <table class="stats-table">
            <thead>
              <tr>
                <th class="col-book">Livro</th>
                <th class="col-num">Proprietários</th>
                <th class="col-num">Módulos</th>
                <th class="col-num">Exercícios<br><small>de módulo</small></th>
                <th class="col-num">Exercícios<br><small>diários</small></th>
                <th class="col-num">Respostas<br><small>dadas</small></th>
                <th class="col-rate">Taxa de resposta</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in stats" :key="s.book.book_id" class="stat-row">
                <td class="col-book">
                  <div class="book-cell">
                    <div class="book-cover">
                      <img
                        v-if="s.book.cover_img"
                        :src="getAssetUrl(s.book.cover_img)"
                        :alt="s.book.title"
                      />
                      <span v-else class="cover-initial">{{ (s.book.title ?? 'L').charAt(0) }}</span>
                    </div>
                    <div class="book-info">
                      <strong>{{ s.book.title ?? '—' }}</strong>
                      <span v-if="s.book.editora">{{ (s.book.editora as any).nome_editora }}</span>
                    </div>
                  </div>
                </td>
                <td class="col-num">
                  <span class="stat-num">{{ s.owners }}</span>
                </td>
                <td class="col-num">
                  <span class="stat-num">{{ s.modules }}</span>
                </td>
                <td class="col-num">
                  <span class="stat-num">{{ s.exercises }}</span>
                </td>
                <td class="col-num">
                  <span class="stat-num">{{ s.dailyExercises }}</span>
                </td>
                <td class="col-num">
                  <span class="stat-num">{{ s.answeredExercises }}</span>
                </td>
                <td class="col-rate">
                  <div class="rate-wrap">
                    <div class="rate-bar-track">
                      <div
                        class="rate-bar-fill"
                        :style="{
                          width: s.exercises > 0
                            ? `${Math.min(100, Math.round((s.answeredExercises / (s.exercises * Math.max(1, s.owners))) * 100))}%`
                            : '0%'
                        }"
                      />
                    </div>
                    <span class="rate-label">
                      {{
                        s.exercises > 0
                          ? `${Math.min(100, Math.round((s.answeredExercises / (s.exercises * Math.max(1, s.owners))) * 100))}%`
                          : '—'
                      }}
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-if="stats.length === 0">
                <td colspan="7" class="empty-row">Nenhum livro encontrado.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>
    </template>
  </section>
</template>

<style scoped>
.admin-stats {
  display: grid;
  gap: var(--space-500);
}

.page-header {
  display: grid;
  gap: var(--space-100);
}

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

/* Loading / error */
.loading-state,
.error-state {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  padding: var(--space-500);
  color: var(--color-mirage-500);
  font-size: 14px;
  font-weight: 600;
}

.spinner {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border: 3px solid var(--color-wild-400);
  border-top-color: var(--color-deep-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Summary row */
.summary-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-400);
}

.summary-card {
  display: grid;
  gap: var(--space-150);
}

.summary-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
}

.summary-value {
  font-size: 36px;
  font-weight: 800;
  color: var(--color-mirage-800);
  line-height: 1;
}

/* Table */
.table-card {
  padding: 0;
  overflow: hidden;
}

.table-wrap {
  overflow-x: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.stats-table thead tr {
  background: var(--color-wild-200);
  border-bottom: 2px solid var(--color-mirage-800);
}

.stats-table th {
  padding: 14px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-600);
  white-space: nowrap;
  line-height: 1.4;
}

.stats-table th small {
  font-size: 10px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
  color: var(--color-mirage-400);
  display: block;
}

.stat-row {
  border-bottom: 2px solid var(--color-wild-300);
  transition: background 0.12s ease;
}

.stat-row:last-child { border-bottom: none; }

.stat-row:hover { background: var(--color-wild-200); }

.col-book { width: 260px; padding: 14px 16px; }
.col-num  { padding: 14px 16px; text-align: center; vertical-align: middle; }
.col-rate { padding: 14px 16px; min-width: 160px; vertical-align: middle; }

/* Book cell */
.book-cell {
  display: flex;
  align-items: center;
  gap: var(--space-300);
}

.book-cover {
  width: 36px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 4px;
  border: 2px solid var(--color-mirage-800);
  overflow: hidden;
  background: var(--color-wild-300);
  display: grid;
  place-items: center;
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-initial {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-500);
}

.book-info {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.book-info strong {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
  display: block;
}

.book-info span {
  font-size: 11px;
  color: var(--color-mirage-400);
}

/* Stat number */
.stat-num {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-mirage-800);
  display: block;
}

/* Rate bar */
.rate-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-200);
}

.rate-bar-track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  overflow: hidden;
}

.rate-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-500));
  border-radius: inherit;
  transition: width 0.6s ease;
}

.rate-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-600);
  min-width: 36px;
  text-align: right;
}

.empty-row {
  padding: var(--space-600);
  text-align: center;
  color: var(--color-mirage-400);
  font-size: 13px;
}
</style>
