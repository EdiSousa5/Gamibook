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
const selectedAnswers = ref({})

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
    const tituloLivro = selectedBook.value?.title || 'Sem título de livro'
    const moduloTitulo = selectedModule.value.module_title || 'Sem título de módulo'
    const descricao = selectedModule.value.additional_description || ''

    quiz.value = await gerarQuiz(tituloLivro, moduloTitulo, descricao)
    selectedAnswers.value = {}
    if (quiz.value?.quiz?.length) {
      const correctAnswers = quiz.value.quiz.map((item) => ({
        id: item.id,
        correta: getCorrectOption(item),
      }))
      console.log('[Quiz] Respostas corretas', correctAnswers)
    }
    console.log(quiz.value)
  } catch (e) {
    console.error(e)
    error.value = 'Erro ao gerar quiz.'
  } finally {
    loading.value = false
  }
}

const getOptionKey = (option) => {
  const match = String(option).trim().match(/^([A-Z])/i)
  return match ? match[1].toUpperCase() : String(option).trim().toUpperCase()
}

const getCorrectKey = (item) =>
  String(item?.resposta_correta || '').trim().toUpperCase().replace(/[^A-Z]/g, '').charAt(0)

const getCorrectOption = (item) => {
  const correctKey = getCorrectKey(item)
  return item?.opcoes?.find((option) => getOptionKey(option) === correctKey) || ''
}

const selectAnswer = (item, option) => {
  selectedAnswers.value = {
    ...selectedAnswers.value,
    [item.id]: option,
  }
}

const isSelected = (item, option) => selectedAnswers.value[item.id] === option

const hasAnswer = (item) => !!selectedAnswers.value[item.id]

const isAnswerCorrect = (item) => {
  const selected = selectedAnswers.value[item.id]
  if (!selected) return false
  return getOptionKey(selected) === getCorrectKey(item)
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
          <input type="radio" name="module" :value="moduleItem.modules_id" v-model.number="selectedModuleId"
            class="module-radio" />
          <div class="cover">
            <img v-if="getBookForModule(moduleItem)?.cover_img"
              :src="getAssetUrl(getBookForModule(moduleItem).cover_img)" alt="" />
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

    <section v-if="quiz" class="quiz">
      <header class="quiz-header">
        <h2>{{ quiz.capitulo || 'Quiz' }}</h2>
        <p>
          {{ quiz.quiz && quiz.quiz.length ? `${quiz.quiz.length} perguntas` : 'Sem perguntas' }}
        </p>
      </header>

      <ol class="quiz-list">
        <li v-for="item in quiz.quiz" :key="item.id" class="quiz-card">
          <div class="quiz-top">
            <span class="badge">Pergunta {{ item.id }}</span>
          </div>

          <h3 class="question">{{ item.pergunta }}</h3>

          <ul class="options">
            <li v-for="option in item.opcoes" :key="option">
              <button type="button" class="option-btn" :class="{
                selected: isSelected(item, option),
                correct: hasAnswer(item) && getOptionKey(option) === getCorrectKey(item),
                wrong: isSelected(item, option) && !isAnswerCorrect(item),
              }" @click="selectAnswer(item, option)">
                {{ option }}
              </button>
            </li>
          </ul>

          <p v-if="hasAnswer(item)" class="feedback" :class="{ correct: isAnswerCorrect(item) }">
            {{ isAnswerCorrect(item) ? 'Correto!' : `Errado. Correta: ${getCorrectOption(item)}` }}
          </p>
        </li>
      </ol>
    </section>
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

.quiz {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  background: #ffffff;
  padding: 14px 16px;
  border-radius: 14px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
}

.quiz-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 16px;
}

.quiz-card {
  background: #ffffff;
  padding: 16px;
  border-radius: 16px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
  display: grid;
  gap: 10px;
}

.quiz-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #6f6f6f;
}

.badge {
  background: #e9f6f1;
  color: #0c7a5a;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 700;
}

.answer {
  font-weight: 600;
}

.question {
  margin: 0;
  font-size: 16px;
}

.options {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 6px;
}

.options li {
  list-style: none;
}

.option-btn {
  width: 100%;
  text-align: left;
  background: #f5faf8;
  padding: 8px 10px;
  border-radius: 10px;
  font-weight: 600;
  border: 2px solid transparent;
  cursor: pointer;
  color: #111111;
}

.option-btn.selected {
  border-color: #0c7a5a;
  background: #e9f6f1;
}

.option-btn.correct {
  border-color: #2c8a5a;
  background: #e2f6ec;
}

.option-btn.wrong {
  border-color: #b13b3b;
  background: #fdecec;
}

.feedback {
  font-size: 12px;
  font-weight: 700;
  color: #b13b3b;
}

.feedback.correct {
  color: #2c8a5a;
}

.state {
  font-weight: 600;
  color: #6f6f6f;
}

.error {
  color: #b13b3b;
}
</style>
