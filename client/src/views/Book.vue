<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiCard from '@/components/ui/UiCard.vue'
import UiChip from '@/components/ui/UiChip.vue'
import UiButton from '@/components/ui/UiButton.vue'
import {
  fetchApprovedExerciseCountsByModule,
  fetchBook,
  fetchModulesByBook,
  fetchUserExerciseCountsByModule,
  getAssetUrl,
  getStoredUserId,
  type Book,
  type Module,
} from '../services/directus'

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
  const total = values.reduce((sum, item) => sum + item.total, 0)
  const done = values.reduce((sum, item) => sum + item.done, 0)
  const correct = values.reduce((sum, item) => sum + item.correct, 0)
  const remaining = Math.max(0, total - done)
  return { total, done, correct, remaining }
})

const isMainChapter = (moduleItem: Module) => {
  if (moduleItem.order_number == null) return true
  const orderValue = Number(moduleItem.order_number)
  return Number.isFinite(orderValue) && Number.isInteger(orderValue)
}

watch(
  bookId,
  async (id) => {
    error.value = ''
    isLoading.value = true
    try {
      const userId = getStoredUserId()
      const [bookData, moduleList] = await Promise.all([
        fetchBook(id),
        fetchModulesByBook(id),
      ])
      book.value = bookData
      modules.value = moduleList
        .filter(isMainChapter)
        .filter((moduleItem) => moduleItem.status !== 'unapproved')
      approvedModules.value = modules.value
      if (userId && approvedModules.value.length) {
        const statsEntries = await Promise.all(
          approvedModules.value.map(async (moduleItem) => {
            const total = await fetchApprovedExerciseCountsByModule(moduleItem.modules_id)
            const done = await fetchUserExerciseCountsByModule(userId, moduleItem.modules_id)
            const correct = await fetchUserExerciseCountsByModule(
              userId,
              moduleItem.modules_id,
              true,
            )
            const remaining = Math.max(0, total - done)
            return [moduleItem.modules_id, { total, done, correct, remaining }] as const
          }),
        )
        moduleStats.value = Object.fromEntries(statsEntries)
      } else {
        moduleStats.value = {}
      }
    } catch {
      error.value = 'Nao foi possivel carregar o livro.'
      book.value = null
      modules.value = []
      approvedModules.value = []
      moduleStats.value = {}
    } finally {
      isLoading.value = false
    }
  },
  { immediate: true }
)
</script>

<template>
  <section class="book">
    <header class="hero">
      <div class="cover">
        <img v-if="book?.cover_img" :src="getAssetUrl(book.cover_img)" alt="" />
        <span v-else>Livro</span>
      </div>
      <div class="hero-info">
        <UiChip label="Biblioteca" variant="outline" />
        <h1>{{ book?.title || 'Sem titulo' }}</h1>
        <p class="meta">{{ book?.publisher || 'Sem editora' }}</p>
        <p class="description">{{ book?.description || 'Sem descricao.' }}</p>
      </div>
    </header>

    <UiCard class="panel">
      <div class="panel-header">
        <h2>Escolhe um modulo</h2>
        <p>Seleciona o modulo para iniciar os exercicios.</p>
      </div>
      <div v-if="approvedModules.length" class="module-overview">
        <div class="overview-card">
          <span>Total de exercicios</span>
          <strong>{{ moduleSummary.total }}</strong>
        </div>
        <div class="overview-card">
          <span>Feitos</span>
          <strong>{{ moduleSummary.done }}</strong>
        </div>
        <div class="overview-card">
          <span>Certos</span>
          <strong>{{ moduleSummary.correct }}</strong>
        </div>
        <div class="overview-card">
          <span>Faltam</span>
          <strong>{{ moduleSummary.remaining }}</strong>
        </div>
      </div>
      <p v-if="isLoading" class="state">A carregar modulos...</p>
      <p v-else-if="error" class="state error">{{ error }}</p>
      <div v-else-if="approvedModules.length" class="module-grid">
        <article v-for="module in approvedModules" :key="module.modules_id" class="module-card">
          <div class="module-top">
            <UiChip :label="String(module.order_number || '-')" variant="filled" />
            <div>
              <h3>{{ module.module_title || 'Sem titulo' }}</h3>
              <p>{{ module.additional_description || 'Sem descricao' }}</p>
            </div>
          </div>
          <div class="module-stats">
            <div>
              <span>Total</span>
              <strong>{{ moduleStats[module.modules_id]?.total ?? 0 }}</strong>
            </div>
            <div>
              <span>Feitos</span>
              <strong>{{ moduleStats[module.modules_id]?.done ?? 0 }}</strong>
            </div>
            <div>
              <span>Certos</span>
              <strong>{{ moduleStats[module.modules_id]?.correct ?? 0 }}</strong>
            </div>
            <div>
              <span>Faltam</span>
              <strong>{{ moduleStats[module.modules_id]?.remaining ?? 0 }}</strong>
            </div>
          </div>
          <RouterLink :to="`/book/${bookId}/module/${module.modules_id}`" class="module-action">
            <UiButton size="sm" variant="outline">Fazer exercicios</UiButton>
          </RouterLink>
        </article>
      </div>
      <p v-else class="state">Sem modulos aprovados para este livro.</p>
    </UiCard>
  </section>
</template>

<style scoped>
.book {
  display: grid;
  gap: 24px;
}

.hero {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 18px;
  padding: 20px;
  border-radius: 20px;
  background: linear-gradient(140deg, #f7f8ff, #f3fff4);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 6px 6px 0 rgba(46, 127, 123, 0.35);
}

.hero-info {
  display: grid;
  gap: 6px;
}


.cover {
  width: 110px;
  height: 150px;
  border-radius: 16px;
  background: linear-gradient(160deg, #0c7a5a, #6bd3b0);
  color: #fff;
  font-weight: 800;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meta {
  color: #6f6f6f;
}

.description {
  color: #4a4a4a;
  max-width: 520px;
}

.panel {
  display: grid;
  gap: 14px;
}

.module-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 rgba(46, 127, 123, 0.25);
}

.overview-card {
  padding: 12px;
  border-radius: 12px;
  background: var(--color-deep-100);
  border: 1px solid var(--color-mirage-800);
  display: grid;
  gap: 4px;
}

.overview-card span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-mirage-500);
}

.overview-card strong {
  font-size: 18px;
  color: var(--color-mirage-800);
}

.panel-header {
  display: grid;
  gap: 6px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.module-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 16px;
  color: inherit;
  border: 2px solid var(--color-mirage-800);
  background: #ffffff;
  box-shadow: 4px 4px 0 rgba(46, 127, 123, 0.35);
}

.module-top {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
}

.module-card h3 {
  margin: 0;
  font-size: 16px;
}

.module-card p {
  margin: 6px 0 0;
  color: #6f6f6f;
  font-size: 12px;
}

.module-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: var(--color-wild-200);
  border: 1px solid var(--color-mirage-800);
}

.module-stats span {
  font-size: 11px;
  color: var(--color-mirage-500);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.module-stats strong {
  font-size: 16px;
  color: var(--color-mirage-800);
}

.module-action {
  justify-self: flex-start;
}


.state {
  margin-top: 12px;
  font-weight: 600;
}

.error {
  color: #b13b3b;
}
</style>
