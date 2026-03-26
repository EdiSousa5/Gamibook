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
const tipoExercicio = ref('multiple-choice')
const trueFalseAnswers = ref({})
const textAnswers = ref({})
const matchingAnswers = ref({})
const orderingAnswers = ref({})
const submittedAnswers = ref({})

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

    quiz.value = await gerarQuiz(tituloLivro, moduloTitulo, descricao, tipoExercicio.value)
    selectedAnswers.value = {}
    trueFalseAnswers.value = {}
    textAnswers.value = {}
    matchingAnswers.value = {}
    orderingAnswers.value = {}
    submittedAnswers.value = {}
    const list = quiz.value?.exercicios || quiz.value?.quiz || []
    const quizType = getQuizType()
    if (list.length && quizType === 'multiple-choice') {
      const correctAnswers = list.map((item) => ({
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
  if (submittedAnswers.value[item.id]) return
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

const getQuizType = () => quiz.value?.tipo || tipoExercicio.value || 'multiple-choice'

const isChoiceType = () => getQuizType() === 'multiple-choice'

const getExerciseList = () => quiz.value?.exercicios || quiz.value?.quiz || []

const selectTrueFalse = (item, value) => {
  if (submittedAnswers.value[item.id]) return
  trueFalseAnswers.value = {
    ...trueFalseAnswers.value,
    [item.id]: value,
  }
}

const hasTrueFalse = (item) => typeof trueFalseAnswers.value[item.id] === 'boolean'

const isTrueFalseCorrect = (item) =>
  hasTrueFalse(item) && trueFalseAnswers.value[item.id] === item.resposta_correta

const updateTextAnswer = (item, value) => {
  if (submittedAnswers.value[item.id]) return
  textAnswers.value = {
    ...textAnswers.value,
    [item.id]: value,
  }
}

const hasTextAnswer = (item) => String(textAnswers.value[item.id] || '').trim().length > 0

const getExpectedText = (item) =>
  String(item.resposta_correta || item.resposta_esperada || '').trim()

const isTextCorrect = (item) => {
  if (!hasTextAnswer(item)) return false
  const expected = getExpectedText(item).toLowerCase()
  const provided = String(textAnswers.value[item.id]).trim().toLowerCase()
  return expected ? provided === expected : false
}

const normalizeList = (value) => {
  if (Array.isArray(value)) return value
  if (!value) return []
  return String(value)
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const getMatchingLeft = (item) => normalizeList(item.coluna_a)

const getMatchingRight = (item) => normalizeList(item.coluna_b)

const updateMatching = (item, index, value) => {
  if (submittedAnswers.value[item.id]) return
  const current = matchingAnswers.value[item.id] || {}
  matchingAnswers.value = {
    ...matchingAnswers.value,
    [item.id]: {
      ...current,
      [index]: value,
    },
  }
}

const isMatchingComplete = (item) => {
  const left = getMatchingLeft(item)
  const current = matchingAnswers.value[item.id] || {}
  return left.length > 0 && left.every((_, index) => current[index])
}

const isMatchingCorrect = (item) => {
  const left = getMatchingLeft(item)
  const right = getMatchingRight(item)
  const current = matchingAnswers.value[item.id] || {}
  return left.every((_, index) => current[index] === right[index])
}

const updateOrdering = (item, index, value) => {
  if (submittedAnswers.value[item.id]) return
  const current = orderingAnswers.value[item.id] || []
  const next = [...current]
  next[index] = value
  orderingAnswers.value = {
    ...orderingAnswers.value,
    [item.id]: next,
  }
}

const isOrderingComplete = (item) => {
  const list = item.itens_desordenados || []
  const current = orderingAnswers.value[item.id] || []
  return list.length > 0 && current.filter(Boolean).length === list.length
}

const isOrderingCorrect = (item) => {
  const list = item.itens_desordenados || []
  const current = orderingAnswers.value[item.id] || []
  const positions = list.map((_, index) => Number(current[index]))
  if (positions.some((value) => Number.isNaN(value))) return false
  const order = positions
    .map((value, index) => ({ value, index: index + 1 }))
    .sort((a, b) => a.value - b.value)
    .map((itemValue) => itemValue.index)
  const correct = item.ordem_correta || []
  return order.length === correct.length && order.every((value, index) => value === correct[index])
}

const isSubmitted = (item) => !!submittedAnswers.value[item.id]

const canSubmit = (item) => {
  if (isSubmitted(item)) return false
  const quizType = getQuizType()
  if (isChoiceType()) return hasAnswer(item)
  if (quizType === 'true-false') return hasTrueFalse(item)
  if (quizType === 'fill-blanks') return hasTextAnswer(item)
  if (quizType === 'matching') return isMatchingComplete(item)
  if (quizType === 'ordering') return isOrderingComplete(item)
  return false
}

const submitAnswer = (item) => {
  if (!canSubmit(item)) return
  submittedAnswers.value = {
    ...submittedAnswers.value,
    [item.id]: true,
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

    <div class="actions">
      <label class="select-field">
        Tipo de exercicio
        <select v-model="tipoExercicio">
          <option value="multiple-choice">Escolha multipla</option>
          <option value="true-false">Verdadeiro/Falso</option>
          <option value="fill-blanks">Completar espacos</option>
          <option value="matching">Correspondencias</option>
          <option value="ordering">Ordenar</option>
        </select>
      </label>
      <button @click="handleGerar" :disabled="loading || !selectedModuleId">
        {{ loading ? 'A gerar...' : 'Gerar Quiz' }}
      </button>
    </div>

    <section v-if="quiz" class="quiz">
      <header class="quiz-header">
        <h2>{{ quiz.modulo || quiz.capitulo || 'Quiz' }}</h2>
        <p>
          {{ getExerciseList().length ? `${getExerciseList().length} perguntas` : 'Sem perguntas' }}
        </p>
      </header>

      <p v-if="quiz.titulo_livro" class="quiz-subtitle">{{ quiz.titulo_livro }}</p>

      <ol class="quiz-list">
        <li v-for="item in getExerciseList()" :key="item.id" class="quiz-card">
          <div class="quiz-top">
            <span class="badge">Pergunta {{ item.id }}</span>
          </div>

          <template v-if="isChoiceType()">
            <h3 class="question">{{ item.pergunta }}</h3>

            <ul class="options">
              <li v-for="option in item.opcoes" :key="option">
                <button type="button" class="option-btn" :class="{
                  selected: isSelected(item, option),
                  correct: isSubmitted(item) && getOptionKey(option) === getCorrectKey(item),
                  wrong: isSubmitted(item) && isSelected(item, option) && !isAnswerCorrect(item),
                }" :disabled="isSubmitted(item)" @click="selectAnswer(item, option)">
                  {{ option }}
                </button>
              </li>
            </ul>

            <button class="submit-btn" type="button" :disabled="!canSubmit(item)" @click="submitAnswer(item)">
              Submeter
            </button>

            <p v-if="isSubmitted(item)" class="feedback" :class="{ correct: isAnswerCorrect(item) }">
              {{ isAnswerCorrect(item) ? 'Correto!' : 'Errado.' }}
            </p>
          </template>

          <template v-else-if="getQuizType() === 'true-false'">
            <h3 class="question">{{ item.afirmacao }}</h3>
            <div class="tf-actions">
              <button type="button" class="option-btn" :class="{ selected: trueFalseAnswers[item.id] === true }"
                :disabled="isSubmitted(item)" @click="selectTrueFalse(item, true)">
                Verdadeiro
              </button>
              <button type="button" class="option-btn" :class="{ selected: trueFalseAnswers[item.id] === false }"
                :disabled="isSubmitted(item)" @click="selectTrueFalse(item, false)">
                Falso
              </button>
            </div>

            <button class="submit-btn" type="button" :disabled="!canSubmit(item)" @click="submitAnswer(item)">
              Submeter
            </button>

            <p v-if="isSubmitted(item)" class="feedback" :class="{ correct: isTrueFalseCorrect(item) }">
              {{ isTrueFalseCorrect(item) ? 'Correto!' : 'Errado.' }}
            </p>
          </template>

          <template v-else-if="getQuizType() === 'fill-blanks'">
            <h3 class="question">{{ item.frase }}</h3>
            <input type="text" class="answer-input" :value="textAnswers[item.id] || ''"
              @input="updateTextAnswer(item, $event.target.value)" :disabled="isSubmitted(item)"
              placeholder="Resposta" />
            <button class="submit-btn" type="button" :disabled="!canSubmit(item)" @click="submitAnswer(item)">
              Submeter
            </button>
            <p v-if="isSubmitted(item)" class="feedback" :class="{ correct: isTextCorrect(item) }">
              {{ isTextCorrect(item) ? 'Correto!' : 'Errado.' }}
            </p>
          </template>


          <template v-else-if="getQuizType() === 'matching'">
            <h3 class="question">Relaciona os elementos</h3>
            <div class="match-grid">
              <div v-for="(leftItem, index) in getMatchingLeft(item)" :key="`${item.id}-${index}`" class="match-row">
                <span class="match-left">{{ leftItem }}</span>
                <select class="match-select" :value="(matchingAnswers[item.id] || {})[index] || ''"
                  :disabled="isSubmitted(item)" @change="updateMatching(item, index, $event.target.value)">
                  <option value="">Selecionar</option>
                  <option v-for="option in getMatchingRight(item)" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
              </div>
            </div>
            <button class="submit-btn" type="button" :disabled="!canSubmit(item)" @click="submitAnswer(item)">
              Submeter
            </button>
            <p v-if="isSubmitted(item)" class="feedback" :class="{ correct: isMatchingCorrect(item) }">
              {{ isMatchingCorrect(item) ? 'Correto!' : 'Errado.' }}
            </p>
          </template>

          <template v-else-if="getQuizType() === 'ordering'">
            <h3 class="question">{{ item.instrucao }}</h3>
            <ul class="order-list">
              <li v-for="(orderItem, index) in item.itens_desordenados" :key="orderItem">
                <span>{{ orderItem }}</span>
                <input type="number" min="1" :max="item.itens_desordenados.length" class="order-input"
                  :value="(orderingAnswers[item.id] || [])[index] || ''" :disabled="isSubmitted(item)"
                  @input="updateOrdering(item, index, $event.target.value)" placeholder="#" />
              </li>
            </ul>
            <button class="submit-btn" type="button" :disabled="!canSubmit(item)" @click="submitAnswer(item)">
              Submeter
            </button>
            <p v-if="isSubmitted(item)" class="feedback" :class="{ correct: isOrderingCorrect(item) }">
              {{ isOrderingCorrect(item) ? 'Correto!' : 'Errado.' }}
            </p>
          </template>
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

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}

.select-field {
  display: grid;
  gap: 6px;
  font-weight: 600;
  color: #1c1c1c;
}

select {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d7d7d7;
  background: #ffffff;
  font-weight: 600;
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

.quiz-subtitle {
  font-weight: 600;
  color: #6f6f6f;
  margin: -6px 0 4px;
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

.tf-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}

.answer-input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d7d7d7;
  font-weight: 600;
  width: 100%;
}

.match-grid {
  display: grid;
  gap: 10px;
}

.match-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: center;
}

.match-left {
  font-weight: 600;
}

.match-select {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid #d7d7d7;
  font-weight: 600;
}

.order-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.order-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.order-input {
  width: 64px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid #d7d7d7;
  font-weight: 600;
  text-align: center;
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

.submit-btn {
  width: fit-content;
  padding: 8px 14px;
  border: none;
  border-radius: 10px;
  background: #1c1c1c;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

.submit-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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
