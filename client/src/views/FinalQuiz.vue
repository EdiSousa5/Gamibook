<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import BookBadge from '@/components/ui/BookBadge.vue'
import ExerciseOption from '@/components/ui/ExerciseOption.vue'
import { buildOptions, isOptionCorrect as checkOptionCorrect, getQuestionText } from '@/utils/exerciseUtils'
import { LockClosedIcon, TrophyIcon } from '@heroicons/vue/24/outline'
import { fetchBook } from '../services/books'
import {
  fetchUserBook,
  updateUserBookBadge,
  fetchExercisesForBook,
  selectFinalQuizQuestions,
} from '../services/badges'
import { getStoredUserId } from '../services/client'
import { useExerciseRunner } from '@/composables/useExerciseRunner'
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
const isSaving = ref(false)
const feedback = ref<null | { type: 'correct' | 'wrong' }>(null)
const feedbackTimer = ref<number | null>(null)

const userId = ref<string | null>(null)

const currentExercise = computed(() => questions.value[currentIndex.value] ?? null)

const {
  timeLeft, selectedOption, attemptedOptions, isLocked,
  isTrueFalse, maxAttempts, timerDash,
  stopTimer, resetQuestionState,
} = useExerciseRunner(QUESTION_TIME, () => handleTimeout(), currentExercise)

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

const isOptionCorrect = (option: string): boolean =>
  currentExercise.value ? checkOptionCorrect(currentExercise.value, option) : false

const currentQuestionText = computed(() =>
  currentExercise.value ? getQuestionText(currentExercise.value) : '',
)

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
          <ExerciseOption
            v-for="(option, index) in options"
            :key="option"
            :value="option"
            :index="index"
            :selected="selectedOption === option"
            :attempted="attemptedOptions.includes(option)"
            :correct="selectedOption === option && isOptionCorrect(option)"
            :wrong="(selectedOption === option || attemptedOptions.includes(option)) && !isOptionCorrect(option)"
            :locked="isLocked"
            @select="handleSelect"
          />
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
