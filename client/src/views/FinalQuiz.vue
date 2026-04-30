<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import BookBadge from '@/components/ui/BookBadge.vue'
import { LockClosedIcon, TrophyIcon } from '@heroicons/vue/24/outline'
import { fetchBook } from '../services/books'
import {
  fetchUserBook,
  updateUserBookBadge,
  fetchExercisesForBook,
  selectFinalQuizQuestions,
} from '../services/badges'
import { getStoredUserId } from '../services/client'
import type { Book, Exercise, UserBook } from '@/types'

const route = useRoute()
const bookId = computed(() => Number(route.params.bookId || 1))

type QuizState = 'loading' | 'locked' | 'done' | 'quiz' | 'result'

const state = ref<QuizState>('loading')
const book = ref<Book | null>(null)
const userBook = ref<UserBook | null>(null)
const questions = ref<Exercise[]>([])
const currentIndex = ref(0)
const answers = ref<boolean[]>([])
const error = ref('')

const QUESTION_TIME = 45
const timeLeft = ref(QUESTION_TIME)
const timerId = ref<number | null>(null)
const selectedOption = ref<string | null>(null)
const attemptedOptions = ref<string[]>([])
const isLocked = ref(false)
const isSaving = ref(false)
const feedback = ref<null | { type: 'correct' | 'wrong' }>(null)
const feedbackTimer = ref<number | null>(null)

const userId = ref<string | null>(null)

const currentExercise = computed(() => questions.value[currentIndex.value] ?? null)

const isTrueFalse = computed(() => currentExercise.value?.type === 'true-false')

const maxAttempts = computed(() => (isTrueFalse.value ? 1 : 2))

const timerCircumference = 2 * Math.PI * 26
const timerDash = computed(() => {
  const ratio = Math.max(0, Math.min(1, timeLeft.value / QUESTION_TIME))
  return `${timerCircumference * ratio} ${timerCircumference}`
})

const score = computed(() => {
  const correct = answers.value.filter(Boolean).length
  const total = questions.value.length
  const pct = total ? Math.round((correct / total) * 100) : 0
  return { correct, total, pct }
})

const passed = computed(() => score.value.pct >= 75)

const shuffledOptionsByIndex = ref<Record<number, string[]>>({})

const options = computed(() => {
  return shuffledOptionsByIndex.value[currentIndex.value] ?? []
})

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = result[i] as T
    result[i] = result[j] as T
    result[j] = tmp
  }
  return result
}

const toOptionArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (!value) return []
  return String(value).split(/\n|;/).map((item) => item.trim()).filter(Boolean)
}

const toBoolean = (value: unknown): boolean => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['true', 'verdadeiro', 'v', 'sim', 'yes'].includes(normalized)) return true
  return false
}

const getOptionLetter = (value: string) => {
  const match = value.trim().match(/^([A-F])\)/i)
  return match?.[1] ? match[1].toUpperCase() : ''
}

const getOptionText = (value: string) => value.trim().replace(/^[A-F]\)\s*/i, '')

const buildOptions = (exercise: Exercise): string[] => {
  if (exercise.type === 'true-false') return ['Falso', 'Verdadeiro']
  const rawOptions = toOptionArray(exercise.content?.opcoes || exercise.content?.options)
  if (rawOptions.length <= 4) return rawOptions
  const correctValue = String(exercise.content?.resposta_correta || '').trim().toUpperCase()
  const correctByLetter = rawOptions.find((o) => getOptionLetter(o) === correctValue)
  const correctByText = rawOptions.find((o) => o.trim().toUpperCase() === correctValue)
  const correctOption = correctByLetter || correctByText
  if (!correctOption) return shuffleArray(rawOptions).slice(0, 4)
  const wrongs = rawOptions.filter((o) => o !== correctOption)
  if (wrongs.length < 3) return shuffleArray(rawOptions).slice(0, 4)
  return shuffleArray([correctOption, ...shuffleArray(wrongs).slice(0, 3)])
}

const isOptionCorrect = (option: string): boolean => {
  if (!currentExercise.value) return false
  if (isTrueFalse.value) {
    const normalized = option.trim().toLowerCase()
    const expected = toBoolean(currentExercise.value.content?.resposta_correta)
    return expected ? normalized.startsWith('verd') : normalized.startsWith('fals')
  }
  const correct = String(currentExercise.value.content?.resposta_correta ?? '').trim()
  const letter = getOptionLetter(option)
  const correctLetter = correct.toUpperCase()
  if (letter && correctLetter) return letter === correctLetter
  return option.trim() === correct
}

const getQuestionText = (exercise: Exercise): string => {
  const c = exercise.content ?? {}
  return (
    (exercise as Record<string, unknown>).question_text as string ||
    c.pergunta as string ||
    c.question as string ||
    c.enunciado as string ||
    c.frase as string ||
    c.afirmacao as string ||
    'Pergunta indisponível'
  )
}

const currentQuestionText = computed(() =>
  currentExercise.value ? getQuestionText(currentExercise.value) : '',
)

const stopTimer = () => {
  if (timerId.value) {
    window.clearInterval(timerId.value)
    timerId.value = null
  }
}

const resetTimer = () => {
  stopTimer()
  timeLeft.value = QUESTION_TIME
  timerId.value = window.setInterval(() => {
    if (timeLeft.value <= 0) {
      stopTimer()
      handleTimeout()
      return
    }
    timeLeft.value -= 1
  }, 1000)
}

const resetQuestionState = () => {
  selectedOption.value = null
  attemptedOptions.value = []
  isLocked.value = false
  resetTimer()
}

const showFeedback = (type: 'correct' | 'wrong') => {
  feedback.value = { type }
  if (feedbackTimer.value) window.clearTimeout(feedbackTimer.value)
  feedbackTimer.value = window.setTimeout(() => {
    feedback.value = null
    feedbackTimer.value = null
  }, 2000)
}

const goNext = () => {
  if (currentIndex.value + 1 >= questions.value.length) {
    stopTimer()
    state.value = 'result'
    return
  }
  currentIndex.value += 1
}

const handleCorrect = () => {
  stopTimer()
  isLocked.value = true
  answers.value[currentIndex.value] = true
  showFeedback('correct')
  window.setTimeout(goNext, 2000)
}

const handleIncorrect = () => {
  attemptedOptions.value = [...attemptedOptions.value, selectedOption.value ?? '']
  if (attemptedOptions.value.length < maxAttempts.value) return
  stopTimer()
  isLocked.value = true
  answers.value[currentIndex.value] = false
  showFeedback('wrong')
  window.setTimeout(goNext, 2000)
}

const handleTimeout = () => {
  if (isLocked.value) return
  isLocked.value = true
  answers.value[currentIndex.value] = false
  showFeedback('wrong')
  window.setTimeout(goNext, 2000)
}

const handleSelect = (option: string) => {
  if (isLocked.value) return
  if (attemptedOptions.value.includes(option)) return
  selectedOption.value = option
  if (isOptionCorrect(option)) {
    handleCorrect()
  } else {
    handleIncorrect()
  }
}

const submitResult = async () => {
  if (!userBook.value?.user_book_id) return
  isSaving.value = true
  try {
    if (passed.value) {
      await updateUserBookBadge(userBook.value.user_book_id, 'galaxy')
      userBook.value = { ...userBook.value, current_badge: 'galaxy' }
    }
  } catch (err) {
    console.error('[FinalQuiz] submitResult failed', err)
  } finally {
    isSaving.value = false
  }
}

const startQuiz = () => {
  currentIndex.value = 0
  answers.value = []
  feedback.value = null
  state.value = 'quiz'
}

watch(
  bookId,
  async (id) => {
    state.value = 'loading'
    error.value = ''
    try {
      const storedId = getStoredUserId()
      userId.value = storedId

      const [bookData, userBookData] = await Promise.all([
        fetchBook(id),
        storedId ? fetchUserBook(storedId, id) : Promise.resolve(null),
      ])
      book.value = bookData
      userBook.value = userBookData

      if (!userBookData) {
        state.value = 'locked'
        return
      }

      if (userBookData.current_badge === 'galaxy') {
        state.value = 'done'
        return
      }

      if (!userBookData.final_quiz_unlocked) {
        state.value = 'locked'
        return
      }

      const exercisesByModule = await fetchExercisesForBook(id)
      const selected = selectFinalQuizQuestions(exercisesByModule, 10)

      if (!selected.length) {
        error.value = 'Não há exercícios disponíveis para o quiz.'
        state.value = 'locked'
        return
      }

      questions.value = selected
      shuffledOptionsByIndex.value = Object.fromEntries(
        selected.map((ex, i) => [i, buildOptions(ex)] as const),
      )
      state.value = 'quiz'
    } catch {
      error.value = 'Não foi possível carregar o quiz.'
      state.value = 'locked'
    }
  },
  { immediate: true },
)

watch(currentIndex, () => {
  if (state.value === 'quiz') resetQuestionState()
})

watch(
  () => state.value === 'result',
  (isResult) => {
    if (isResult) submitResult()
  },
)

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <section class="quiz-runner">
    <header class="runner-header">
      <div class="runner-titles">
        <h1>Quiz Final</h1>
        <p class="meta">{{ book?.title || `Livro ${bookId}` }}</p>
      </div>
    </header>

    <!-- Loading -->
    <p v-if="state === 'loading'" class="state-msg">A carregar quiz...</p>

    <!-- Locked -->
    <div v-else-if="state === 'locked'" class="info-card">
      <div class="info-card__icon info-card__icon--locked">
        <LockClosedIcon class="info-icon" aria-hidden="true" />
      </div>
      <div class="info-card__body">
        <h2>Quiz Bloqueado</h2>
        <p>{{ error || 'Conclui 100% dos exercícios do livro para desbloquear o quiz final.' }}</p>
      </div>
      <RouterLink :to="`/book/${bookId}`">
        <UiButton variant="outline">Voltar ao livro</UiButton>
      </RouterLink>
    </div>

    <!-- Already done -->
    <div v-else-if="state === 'done'" class="info-card info-card--done">
      <div class="info-card__icon info-card__icon--done">
        <TrophyIcon class="info-icon" aria-hidden="true" />
      </div>
      <div class="info-card__body">
        <h2>Quiz Concluído</h2>
        <p>Já completaste o quiz final e conquistaste o badge Galaxy.</p>
        <BookBadge tier="galaxy" size="md" />
      </div>
      <RouterLink :to="`/book/${bookId}`">
        <UiButton variant="outline">Voltar ao livro</UiButton>
      </RouterLink>
    </div>

    <!-- Result -->
    <div v-else-if="state === 'result'" class="complete-card">
      <div class="complete-header">
        <div>
          <h2>Resultado do Quiz Final</h2>
          <p>{{ passed ? 'Parabéns! Passaste no quiz.' : 'Não chegaste aos 75%. Podes tentar novamente.' }}</p>
        </div>
        <div class="summary-score" :class="passed ? 'summary-score--pass' : 'summary-score--fail'">
          <span>Resultado</span>
          <strong>{{ score.correct }}/{{ score.total }}</strong>
          <em>{{ score.pct }}%</em>
        </div>
      </div>

      <div v-if="passed" class="pass-badge">
        <p class="pass-badge__label">Badge conquistado</p>
        <BookBadge tier="galaxy" size="md" />
      </div>

      <div class="result-actions">
        <RouterLink :to="`/book/${bookId}`">
          <UiButton variant="outline">Voltar ao livro</UiButton>
        </RouterLink>
        <UiButton v-if="!passed" variant="primary" :disabled="isSaving" @click="startQuiz">
          Tentar novamente
        </UiButton>
      </div>
    </div>

    <!-- Quiz active -->
    <template v-else-if="state === 'quiz'">
      <div class="quiz-progress">
        <div class="prog-track">
          <div class="prog-fill" :style="{ width: `${((currentIndex + 1) / questions.length) * 100}%` }" />
        </div>
        <span class="prog-label">{{ currentIndex + 1 }} / {{ questions.length }}</span>
      </div>

      <div class="runner">
        <div class="question-card">
          <div class="question-card__shadow"></div>
          <div class="question-card__panel">
            <div class="question-timer">
              <svg class="timer-ring" viewBox="0 0 72 72" aria-hidden="true">
                <circle class="timer-ring__track" cx="36" cy="36" r="26" />
                <circle class="timer-ring__progress" cx="36" cy="36" r="26"
                  :style="{ strokeDasharray: timerDash }" />
              </svg>
              <span class="timer-value">{{ String(timeLeft).padStart(2, '0') }}</span>
            </div>
            <div class="question-top">
              <div class="question-title">
                Pergunta <span>{{ String(currentIndex + 1).padStart(2, '0') }}</span>
              </div>
              <div v-if="feedback" class="result-pill" :class="feedback.type">
                <span>{{ feedback.type === 'correct' ? 'Certo!' : 'Errado' }}</span>
              </div>
              <div v-else-if="!isTrueFalse" class="attempts-pill">
                {{ isTrueFalse ? '1 tentativa' : `${Math.max(0, maxAttempts - attemptedOptions.length)} tentativas` }}
              </div>
            </div>
            <div class="question-divider"></div>
            <p class="question-text">{{ currentQuestionText }}</p>
          </div>
        </div>

        <div class="options options-grid-2">
          <button
            v-for="(option, index) in options"
            :key="option"
            class="option"
            :class="{
              selected: selectedOption === option,
              attempted: attemptedOptions.includes(option),
              correct: selectedOption === option && isOptionCorrect(option),
              wrong: (selectedOption === option || attemptedOptions.includes(option)) && !isOptionCorrect(option),
              locked: isLocked,
            }"
            type="button"
            @click="handleSelect(option)"
          >
            <span class="option-shadow"></span>
            <span class="option-panel"></span>
            <span class="option-content">
              <span class="option-letter">
                <span class="letter-shadow"></span>
                <span class="letter-face"></span>
                <span class="letter-text">{{ String.fromCharCode(65 + index) }}</span>
              </span>
              <span class="option-text">{{ getOptionText(option) }}</span>
            </span>
          </button>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.quiz-runner {
  display: grid;
  gap: var(--space-500);
}

.runner-header {
  display: grid;
  gap: var(--space-100);
}

.runner-header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.meta {
  color: var(--color-mirage-500);
  margin: 0;
  font-size: 13px;
}

.state-msg {
  font-weight: 600;
  color: var(--color-mirage-600);
}

/* ── INFO CARDS (locked / done) ─────────────────── */
.info-card {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: var(--space-400);
  align-items: center;
  padding: var(--space-400);
  border: 2px solid var(--color-mirage-800);
  border-radius: 18px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  background: var(--color-wild-100);
}

.info-card--done {
  background: var(--color-deep-100);
}

.info-card__icon {
  width: 80px;
  height: 80px;
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  background: var(--color-mirage-800);
}

.info-card__icon--done { background: var(--color-deep-500); }

.info-icon {
  width: 36px;
  height: 36px;
  color: #fff;
}

.info-card__body {
  display: grid;
  gap: var(--space-100);
}

.info-card__body h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}

.info-card__body p {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-500);
}

/* ── PROGRESS BAR ───────────────────────────────── */
.quiz-progress {
  display: grid;
  gap: 8px;
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
  text-align: right;
}

/* ── RESULT CARD ────────────────────────────────── */
.complete-card {
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 6px 6px 0 rgba(46, 127, 123, 0.35);
  padding: 24px;
  display: grid;
  gap: var(--space-400);
}

.complete-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-300);
  flex-wrap: wrap;
}

.complete-header h2 { margin: 0; font-size: 22px; font-weight: 800; }
.complete-header p { margin: 0; font-size: 14px; color: var(--color-mirage-500); }

.summary-score {
  display: grid;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-deep-100);
  box-shadow: 4px 4px 0 rgba(46, 127, 123, 0.35);
  text-align: center;
  font-weight: 700;
}

.summary-score--fail {
  background: #f7c4c4;
  border-color: #b13b3b;
}

.summary-score span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-600);
}

.summary-score strong {
  font-size: 28px;
  color: var(--color-mirage-800);
  line-height: 1;
}

.summary-score em {
  font-style: normal;
  font-size: 13px;
  color: var(--color-mirage-600);
}

.pass-badge {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  padding: var(--space-300) var(--space-400);
  background: var(--color-deep-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 14px;
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.pass-badge__label {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-600);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.result-actions {
  display: flex;
  gap: var(--space-300);
  flex-wrap: wrap;
}

/* ── QUESTION RUNNER (reused from Module.vue) ───── */
.runner {
  display: grid;
  gap: var(--space-500);
  padding-top: var(--space-300);
  border-top: 2px solid var(--color-wild-400);
}

.question-card {
  position: relative;
  width: min(960px, 100%);
  margin: 0 auto;
}

.question-card__shadow {
  position: absolute;
  inset: 12px 0 0;
  background: var(--color-deep-600);
  border-radius: 16px;
  z-index: 0;
}

.question-card__panel {
  position: relative;
  z-index: 1;
  padding: 40px 32px 32px;
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 8px 8px 0 rgba(46, 127, 123, 0.35);
}

.question-timer {
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  width: 70px;
  height: 70px;
  border-radius: 999px;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--color-mirage-800);
  box-shadow: 0 6px 0 rgba(46, 127, 123, 0.35);
}

.timer-ring {
  width: 64px;
  height: 64px;
  transform: rotate(-90deg);
}

.timer-ring__track {
  fill: none;
  stroke: rgba(46, 127, 123, 0.2);
  stroke-width: 6;
}

.timer-ring__progress {
  fill: none;
  stroke: var(--color-deep-500);
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dasharray 0.9s ease-in-out;
}

.timer-value {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 16px;
}

.question-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-300);
}

.question-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--color-mirage-800);
}

.question-title span { color: var(--color-teal-600); }

.attempts-pill {
  padding: 6px 12px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-teal-100);
  font-weight: 700;
  font-size: 12px;
  color: var(--color-mirage-800);
}

.result-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  font-weight: 700;
  font-size: 13px;
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.result-pill.correct { background: var(--color-deep-100); }
.result-pill.wrong { background: #f7c4c4; border-color: #b13b3b; color: #7a1f1f; }

.question-divider {
  height: 1px;
  background: var(--color-mirage-800);
  margin: 18px 0;
}

.question-text {
  margin: 0;
  font-size: 22px;
  line-height: 30px;
  color: var(--color-mirage-800);
}

.options {
  display: grid;
  gap: 18px;
  width: min(960px, 100%);
  margin: 0 auto;
}

.options-grid-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.option {
  position: relative;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  --option-press-x: clamp(3px, 0.6vw, 4px);
  --option-press-y: clamp(4px, 0.9vw, 6px);
  --option-shadow-x: clamp(12px, 2.6vw, 20px);
  --option-shadow-y: clamp(10px, 2.2vw, 16px);
}

.option-shadow {
  position: absolute;
  inset: var(--option-shadow-y) 0 0 var(--option-shadow-x);
  background: var(--color-shadow);
  border-radius: 12px;
  z-index: 0;
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option-panel {
  position: absolute;
  inset: 0;
  background: var(--color-wild-100);
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  z-index: 1;
  transition: transform 0.15s ease, background 0.2s ease;
}

.option-content {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 16px;
  padding: 24px 22px;
  transition: transform 0.15s ease;
}

.option-letter {
  position: relative;
  width: 56px;
  height: 56px;
}

.letter-shadow {
  position: absolute;
  inset: 0;
  background: var(--color-shadow);
  border-radius: 999px;
  transform: translate(var(--option-press-x), var(--option-press-y));
  transition: opacity 0.2s ease;
}

.letter-face {
  position: absolute;
  inset: 0;
  background: var(--color-wild-100);
  border-radius: 999px;
  border: 2px solid #373737;
  transition: background 0.2s ease, transform 0.2s ease;
}

.letter-text {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 28px;
  font-weight: 600;
  color: var(--color-mirage-800);
  transition: color 0.2s ease, transform 0.2s ease;
}

.option-text {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-mirage-800);
}

.option:hover .option-panel { background: var(--color-teal-300); }
.option:hover .option-shadow { background: var(--color-deep-600); }
.option:hover .letter-shadow { background: var(--color-deep-600); }
.option:hover .letter-face { background: var(--color-teal-100); }

.option:active .option-panel,
.option.selected .option-panel {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option:active .option-content,
.option.selected .option-content,
.option.attempted .option-content {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option:active .letter-shadow,
.option.selected .letter-shadow,
.option.attempted .letter-shadow { opacity: 0; }

.option.selected .option-panel { background: var(--color-teal-500); }
.option.selected .option-shadow { background: var(--color-deep-1000); }
.option.selected .letter-face {
  background: var(--color-deep-200);
  transform: translate(var(--option-press-x), var(--option-press-y));
}
.option.selected .letter-text { transform: translate(var(--option-press-x), var(--option-press-y)); }
.option.selected .option-text { color: var(--color-wild-100); }

.option.correct .option-panel { background: var(--color-deep-600); }

.option.wrong .option-panel { background: #f7c4c4; border-color: #b13b3b; }
.option.wrong .letter-face { background: #fbe1e1; border-color: #b13b3b; }
.option.wrong .letter-shadow { background: #b13b3b; }
.option.wrong .letter-text { color: #7a1f1f; }
.option.wrong .option-text { color: #7a1f1f; }

.option.locked { cursor: not-allowed; }

@media (max-width: 720px) {
  .info-card {
    grid-template-columns: 1fr;
  }

  .options-grid-2 {
    grid-template-columns: 1fr;
  }

  .question-text {
    font-size: 18px;
  }
}
</style>
