<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchBook, fetchModulesByBook, getAssetUrl, type Book, type Module } from '../services/directus'

const route = useRoute()
const bookId = computed(() => Number(route.params.id || 1))

const book = ref<Book | null>(null)
const modules = ref<Module[]>([])
const error = ref('')
const isLoading = ref(false)

watch(
  bookId,
  async (id) => {
    error.value = ''
    isLoading.value = true
    try {
      const [bookData, moduleList] = await Promise.all([
        fetchBook(id),
        fetchModulesByBook(id),
      ])
      book.value = bookData
      modules.value = moduleList
    } catch {
      error.value = 'Nao foi possivel carregar o livro.'
      book.value = null
      modules.value = []
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
        <p class="kicker">Biblioteca</p>
        <h1>{{ book?.title || 'Sem titulo' }}</h1>
        <p class="meta">{{ book?.publisher || 'Sem editora' }}</p>
        <p class="description">{{ book?.description || 'Sem descricao.' }}</p>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <h2>Escolhe um modulo</h2>
        <p>Seleciona o modulo para ver os exercicios.</p>
      </div>
      <p v-if="isLoading" class="state">A carregar modulos...</p>
      <p v-else-if="error" class="state error">{{ error }}</p>
      <div v-else-if="modules.length" class="module-grid">
        <RouterLink v-for="module in modules" :key="module.modules_id" class="module-card"
          :to="`/book/${bookId}/module/${module.modules_id}`">
          <div class="module-order">{{ module.order_number || '-' }}</div>
          <div>
            <h3>{{ module.module_title || 'Sem titulo' }}</h3>
            <p>{{ module.additional_description || 'Sem descricao' }}</p>
          </div>
        </RouterLink>
      </div>
      <p v-else class="state">Sem modulos para este livro.</p>
    </section>
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
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.08);
}

.hero-info {
  display: grid;
  gap: 6px;
}

.kicker {
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #0c7a5a;
  font-weight: 700;
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
  background: #ffffff;
  padding: 22px;
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
  display: grid;
  gap: 14px;
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
  grid-template-columns: auto 1fr;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  border: 2px solid transparent;
  background: #ffffff;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.module-card:hover {
  transform: translateY(-2px);
  border-color: #0c7a5a;
  box-shadow: 0 16px 28px rgba(12, 122, 90, 0.16);
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

.module-order {
  min-width: 36px;
  height: 36px;
  border-radius: 12px;
  background: #0c7a5a;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-weight: 700;
}

.state {
  margin-top: 12px;
  font-weight: 600;
}

.error {
  color: #b13b3b;
}
</style>
