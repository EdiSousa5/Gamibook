<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchBooks, fetchModules, getAssetUrl } from '@/services/directus'
import { gerarQuiz } from '@/services/flowise'

const modules = ref([])
const books = ref([])
const selectedModuleId = ref(null)
const quiz = ref(null)
const loading = ref(false)
const error = ref('')
const isLoadingData = ref(false)

const selectedModule = computed(() =>
  modules.value.find((moduleItem) => moduleItem.modules_id === selectedModuleId.value)
)

const booksById = computed(() => {
  const map = new Map()
  books.value.forEach((book) => {
    map.set(book.book_id, book)
  })
  return map
})

const selectedBook = computed(() => {
  const moduleItem = selectedModule.value
  if (!moduleItem?.id_book) return null
  return booksById.value.get(moduleItem.id_book) || null
})

const getBookForModule = (moduleItem) => booksById.value.get(moduleItem.id_book) || null

onMounted(async () => {
  isLoadingData.value = true
  error.value = ''
  try {
    const [moduleList, bookList] = await Promise.all([fetchModules(), fetchBooks()])
    modules.value = moduleList
    books.value = bookList
  } catch {
    error.value = 'Nao foi possivel carregar os modulos.'
  } finally {
    isLoadingData.value = false
  }
})

async function handleGerar() {
  if (!selectedModule.value) return
  loading.value = true
  error.value = ''
  try {
    const titulo = selectedModule.value.module_title || 'Modulo'
    const descricao = selectedModule.value.additional_description || ''
    const livro = selectedBook.value?.title || ''
    const tituloCompleto = livro ? `${titulo} (${livro})` : titulo
    quiz.value = await gerarQuiz(tituloCompleto, descricao)
    console.log(quiz.value)
  } catch (e) {
    console.error(e)
    error.value = 'Erro ao gerar quiz.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flowise-test">
    <h1>Gerar quiz</h1>
    <p v-if="isLoadingData" class="state">A carregar modulos...</p>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <ul v-else class="module-grid">
      <li v-for="moduleItem in modules" :key="moduleItem.modules_id">
        <label class="module-card" :class="{ selected: moduleItem.modules_id === selectedModuleId }">
          <input
            type="radio"
            name="module"
            :value="moduleItem.modules_id"
            v-model.number="selectedModuleId"
            class="module-radio"
          />
          <div class="cover">
            <img
              v-if="getBookForModule(moduleItem)?.cover_img"
              :src="getAssetUrl(getBookForModule(moduleItem).cover_img)"
              alt=""
            />
            <span v-else>Livro</span>
          </div>
          <div class="module-info">
            <p class="module-title">
              {{ moduleItem.order_number ? `${moduleItem.order_number}.` : '' }}
              {{ moduleItem.module_title || 'Sem titulo' }}
            </p>
            <p class="module-book">
              Livro: {{ getBookForModule(moduleItem)?.title || 'Livro desconhecido' }}
            </p>
            <p class="module-desc">
              Modulo: {{ moduleItem.module_title || 'Sem titulo' }}
            </p>
            <p class="module-desc">
              Descricao: {{ moduleItem.additional_description || 'Sem descricao' }}
            </p>
          </div>
        </label>
      </li>
    </ul>

    <button @click="handleGerar" :disabled="loading || !selectedModuleId">
      {{ loading ? 'A gerar...' : 'Gerar Quiz' }}
    </button>

    <pre v-if="quiz">{{ JSON.stringify(quiz, null, 2) }}</pre>
  </div>
</template>

<style scoped>
.flowise-test {
  display: grid;
  gap: 12px;
  max-width: 860px;
}

.module-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.module-card {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 14px;
  padding: 14px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(12, 122, 90, 0.16);
}

.module-card.selected {
  border-color: #0c7a5a;
  box-shadow: 0 14px 28px rgba(12, 122, 90, 0.24);
}

.module-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.cover {
  width: 72px;
  height: 96px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(160deg, #0c7a5a, #6bd3b0);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.module-info {
  display: grid;
  gap: 6px;
}

.module-title {
  font-weight: 700;
}

.module-book {
  font-size: 12px;
  color: #6f6f6f;
}

.module-desc {
  font-size: 12px;
  color: #6f6f6f;
}

button {
  width: fit-content;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  background: #0c7a5a;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

pre {
  background: #f7fbf9;
  padding: 12px;
  border-radius: 12px;
  overflow: auto;
}

.state {
  font-weight: 600;
  color: #6f6f6f;
}

.error {
  color: #b13b3b;
}
</style>
