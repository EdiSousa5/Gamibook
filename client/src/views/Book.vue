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
    <div class="header">
      <div class="cover">
        <img v-if="book?.cover_img" :src="getAssetUrl(book.cover_img)" alt="" />
        <span v-else>--</span>
      </div>
      <div>
        <h1>{{ book?.title || 'Sem titulo' }}</h1>
        <p class="meta">Publisher: {{ book?.publisher || 'Sem editora' }}</p>
      </div>
    </div>

    <div class="panel">
      <h2>Modulos do livro</h2>
      <p v-if="isLoading" class="state">A carregar modulos...</p>
      <p v-else-if="error" class="state error">{{ error }}</p>
      <ul v-else-if="modules.length">
        <li v-for="module in modules" :key="module.modules_id">
          <div>
            <p class="title">
              {{ module.order_number ? `Modulo ${module.order_number}` : 'Modulo' }}
            </p>
            <p class="meta">{{ module.module_title || 'Sem titulo' }}</p>
            <p v-if="module.additional_description" class="meta">
              {{ module.additional_description }}
            </p>
          </div>
          <RouterLink :to="`/book/${bookId}/module/${module.modules_id}`" class="action">
            Abrir
          </RouterLink>
        </li>
      </ul>
      <p v-else class="state">Sem modulos para este livro.</p>
    </div>
  </section>
</template>

<style scoped>
.book {
  display: grid;
  gap: 24px;
}

.header {
  display: flex;
  gap: 18px;
  align-items: center;
}

.cover {
  width: 80px;
  height: 110px;
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

.panel {
  background: #ffffff;
  padding: 22px;
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}

ul {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: grid;
  gap: 12px;
}

li {
  display: grid;
  gap: 6px;
}

.title {
  font-weight: 700;
}

.action {
  text-decoration: none;
  color: #0c7a5a;
  font-weight: 600;
  justify-self: start;
}


.state {
  margin-top: 12px;
  font-weight: 600;
}

.error {
  color: #b13b3b;
}
</style>
