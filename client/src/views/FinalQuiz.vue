<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import BookBadge from '@/components/ui/BookBadge.vue'
import ExerciseOption from '@/components/ui/ExerciseOption.vue'
import BadgeUnlockModal from '@/components/ui/BadgeUnlockModal.vue'
import { buildOptions, isOptionCorrect as checkOptionCorrect, getQuestionText } from '@/utils/exerciseUtils'
import {
  LockClosedIcon,
  TrophyIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/vue/24/outline'
import UiStatCard from '@/components/ui/UiStatCard.vue'
import UiResultPill from '@/components/ui/UiResultPill.vue'
import QuestionCard from '@/components/ui/QuestionCard.vue'
import { fetchBook, fetchModulesByBook } from '../services/books'
import {
  fetchUserBook,
  updateUserBookBadge,
  buildFinalQuizQuestions,
  tierForPct,
  TIER_ORDER,
} from '../services/badges'
import { fetchApprovedExerciseCountsByModule, fetchUserExercisesByModule } from '../services/exercises'
import { useToast } from '@/composables/useToast'
import { getStoredUserId } from '../services/client'
import { useExerciseRunner } from '@/composables/useExerciseRunner'
import { FEEDBACK_DELAY_MS } from '@/utils/timing'
import {
  fetchFinalQuizAttempts,
  createFinalQuizAttempt,
} from '../services/finalQuiz'
import type { Book, Exercise, UserBook, FinalQuizAttempt } from '@/types'

const route = useRoute()
const bookId = computed(() => Number(route.params.bookId || 1))

type QuizState = 'loading' | 'locked' | 'done' | 'quiz' | 'result' | 'history'

const state = ref<QuizState>('loading')
const book = ref<Book | null>(null)
const userBook = ref<UserBook | null>(null)
const questions = ref<Exercise[]>([])
const currentIndex = ref(0)
const answers = ref<boolean[]>([])
const error = ref('')

const QUESTION_TIME = 30
const isSaving = ref(false)
const feedback = ref<null | { type: 'correct' | 'wrong' }>(null)
const feedbackTimer = ref<number | null>(null)

const userId = ref<string | null>(null)
const cooldownUntil = ref<Date | null>(null)
const historyFrom = ref<QuizState>('locked')
const quizHistory = ref<FinalQuizAttempt[]>([])
const showGalaxyModal = ref(false)

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

const answeredCorrect = computed(() => answers.value.filter(Boolean).length)
const answeredWrong = computed(() => answers.value.filter((a) => a === false).length)

const passed = computed(() => score.value.correct >= 8)

const shuffledOptionsByIndex = ref<Record<number, string[]>>({})

const options = computed(() => {
  return shuffledOptionsByIndex.value[currentIndex.value] ?? []
})

const isOptionCorrect = (option: string): boolean =>
  currentExercise.value ? checkOptionCorrect(currentExercise.value, option) : false

const currentQuestionText = computed(() =>
  currentExercise.value ? getQuestionText(currentExercise.value) : '',
)

const cooldownLabel = computed(() => {
  if (!cooldownUntil.value) return ''
  const diff = cooldownUntil.value.getTime() - Date.now()
  if (diff <= 0) return 'já podes tentar'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `em ${h}h ${m}m`
  return `em ${m}m`
})

const showFeedback = (type: 'correct' | 'wrong') => {
  feedback.value = { type }
  if (feedbackTimer.value) window.clearTimeout(feedbackTimer.value)
  feedbackTimer.value = window.setTimeout(() => {
    feedback.value = null
    feedbackTimer.value = null
  }, FEEDBACK_DELAY_MS)
}

const goNext = () => {
  if (currentIndex.value + 1 >= questions.value.length) {
    stopTimer()
    state.value = 'result'
    submitResult()
    return
  }
  currentIndex.value += 1
}

const handleCorrect = () => {
  stopTimer()
  isLocked.value = true
  answers.value[currentIndex.value] = true
  showFeedback('correct')
  window.setTimeout(goNext, FEEDBACK_DELAY_MS)
}

const handleIncorrect = () => {
  attemptedOptions.value = [...attemptedOptions.value, selectedOption.value ?? '']
  if (attemptedOptions.value.length < maxAttempts.value) return
  stopTimer()
  isLocked.value = true
  answers.value[currentIndex.value] = false
  showFeedback('wrong')
  window.setTimeout(goNext, FEEDBACK_DELAY_MS)
}

const handleTimeout = () => {
  if (isLocked.value) return
  isLocked.value = true
  answers.value[currentIndex.value] = false
  showFeedback('wrong')
  window.setTimeout(goNext, FEEDBACK_DELAY_MS)
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
  if (!userBook.value?.user_book_id || !userId.value) return
  isSaving.value = true
  try {
    const correctCount = score.value.correct
    const status: 'pass' | 'fail' = passed.value ? 'pass' : 'fail'

    await createFinalQuizAttempt({
      user_id: userId.value,
      book_id: bookId.value,
      score: correctCount,
      status,
      content: {
        questions: questions.value.map((q, i) => ({
          exercise_id: q.exercise_id ?? 0,
          question_text: getQuestionText(q),
          is_correct: answers.value[i] === true,
        })),
      },
    })

    if (passed.value) {
      await updateUserBookBadge(userBook.value.user_book_id, 'galaxy')
      userBook.value = { ...userBook.value, current_badge: 'galaxy' }
      window.setTimeout(() => { showGalaxyModal.value = true }, 800)
    } else {
      cooldownUntil.value = new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  } catch (err) {
    console.error('[FinalQuiz] submitResult failed', err)
  } finally {
    isSaving.value = false
  }
}

const openHistory = async (from: QuizState) => {
  historyFrom.value = from
  if (!userId.value) return
  quizHistory.value = await fetchFinalQuizAttempts(userId.value, bookId.value)
  state.value = 'history'
}

const closeHistory = () => {
  state.value = historyFrom.value
}

const formatAttemptDate = (dateStr?: string): string => {
  if (!dateStr) return ''
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

watch(
  bookId,
  async (id) => {
    state.value = 'loading'
    error.value = ''
    cooldownUntil.value = null
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

      // Mecanismo de segurança e sincronização de badge
      const modulesForBook = await fetchModulesByBook(id)
      let totalBookExercises = 0
      let correctBookExercises = 0

      const statsPromises = modulesForBook
        .filter((m) => {
          if (m.status === 'unapproved') return false
          if (m.order_number == null) return true
          const n = Number(m.order_number)
          return Number.isFinite(n) && Number.isInteger(n)
        })
        .map(async (m) => {
          const [total, correctItems] = await Promise.all([
            fetchApprovedExerciseCountsByModule(m.modules_id),
            fetchUserExercisesByModule(storedId!, m.modules_id, true),
          ])
          return { total, correct: correctItems.length }
        })

      const stats = await Promise.all(statsPromises)
      stats.forEach((s) => {
        totalBookExercises += s.total
        correctBookExercises += s.correct
      })

      const currentPct = totalBookExercises === 0 ? 0 : Math.round((correctBookExercises / totalBookExercises) * 100)
      let expectedTier = tierForPct(currentPct)
      const currentBadge = userBookData.current_badge || 'default'

      if (currentBadge === 'galaxy' && currentPct >= 100) expectedTier = 'galaxy'

      if (currentBadge !== expectedTier) {
        const oldRank = TIER_ORDER.indexOf(currentBadge as any)
        const newRank = TIER_ORDER.indexOf(expectedTier as any)

        await updateUserBookBadge(userBookData.user_book_id!, expectedTier)
        userBookData.current_badge = expectedTier

        const toast = useToast()
        if (newRank < oldRank) {
          toast.error(`Atenção: O teu progresso foi recalculado e desceste para o badge ${expectedTier}.`)
        } else if (newRank > oldRank) {
          toast.success(`Progresso sincronizado! Subiste para o badge ${expectedTier}.`)
        }
      }

      if (userBookData.current_badge === 'galaxy') {
        state.value = 'done'
        return
      }

      if (currentPct < 100 || !userBookData.final_quiz_unlocked) {
        error.value = 'Conclui 100% dos exercícios do livro para desbloquear o quiz final.'
        state.value = 'locked'
        return
      }

      const selected = await buildFinalQuizQuestions(id, 10)

      if (!selected.length) {
        error.value = 'Não há exercícios disponíveis para o quiz.'
        state.value = 'locked'
        return
      }

      questions.value = selected
      shuffledOptionsByIndex.value = Object.fromEntries(
        selected.map((ex, i) => [i, buildOptions(ex)] as const),
      )
      currentIndex.value = 0
      state.value = 'quiz'
      resetQuestionState()
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
      <div class="info-card__actions">
        <UiButton variant="outline" @click="openHistory('done')">Ver histórico</UiButton>
        <RouterLink :to="`/book/${bookId}`">
          <UiButton variant="outline">Voltar ao livro</UiButton>
        </RouterLink>
      </div>
    </div>

    <!-- Result -->
    <div v-else-if="state === 'result'" class="complete-card">
      <div class="complete-header">
        <div>
          <h2>Resultado do Quiz Final</h2>
          <p v-if="passed">Parabéns! Obtiveste {{ score.correct }}/10 e passaste no quiz.</p>
          <p v-else>
            Obtiveste {{ score.correct }}/10. Precisas de pelo menos 8 certas.
            <template v-if="cooldownUntil"> Podes tentar novamente {{ cooldownLabel }}.</template>
          </p>
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
        <UiButton variant="outline" :disabled="isSaving" @click="openHistory('result')">
          Ver histórico
        </UiButton>
      </div>
    </div>

    <!-- History -->
    <div v-else-if="state === 'history'" class="history-panel">
      <div class="history-header">
        <h2>Histórico do Quiz Final</h2>
        <UiButton variant="outline" @click="closeHistory">Voltar</UiButton>
      </div>

      <p v-if="!quizHistory.length" class="state-msg">Ainda não fizeste nenhuma tentativa.</p>

      <div v-for="attempt in quizHistory" :key="attempt.final_quiz_attempts_id" class="attempt-card">
        <div class="attempt-header">
          <div class="attempt-meta">
            <span class="attempt-date">{{ formatAttemptDate(attempt.date_created) }}</span>
            <span class="attempt-status"
              :class="attempt.status === 'pass' ? 'attempt-status--pass' : 'attempt-status--fail'">
              {{ attempt.status === 'pass' ? 'Passou' : 'Falhou' }}
            </span>
          </div>
          <span class="attempt-score">{{ attempt.score }}/10 certas</span>
        </div>

        <div v-if="attempt.content?.questions" class="attempt-questions">
          <div v-for="(q, i) in attempt.content.questions" :key="i" class="attempt-question"
            :class="q.is_correct ? 'attempt-question--correct' : 'attempt-question--wrong'">
            <CheckCircleIcon v-if="q.is_correct" class="q-icon q-icon--correct" aria-hidden="true" />
            <XCircleIcon v-else class="q-icon q-icon--wrong" aria-hidden="true" />
            <p class="q-text">{{ q.question_text }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quiz active -->
    <template v-else-if="state === 'quiz'">
      <div class="runner-stats">
        <UiStatCard label="Certas" :value="answeredCorrect">
          <template #icon><CheckCircleIcon class="stat-icon stat-icon--correct" aria-hidden="true" /></template>
        </UiStatCard>
        <UiStatCard label="Erradas" :value="answeredWrong">
          <template #icon><XCircleIcon class="stat-icon stat-icon--wrong" aria-hidden="true" /></template>
        </UiStatCard>
        <UiStatCard label="Pergunta" :value="currentIndex + 1">
          <template #value>{{ currentIndex + 1 }}<span class="stat-sep"> / {{ questions.length }}</span></template>
        </UiStatCard>
      </div>

      <div class="runner">
        <QuestionCard :question-text="currentQuestionText" :time-left="timeLeft" :timer-dash="timerDash">
          <template #label>
            Pergunta <span class="question-num">{{ String(currentIndex + 1).padStart(2, '0') }}</span>
          </template>
          <template #actions>
            <UiResultPill v-if="feedback" :result="feedback.type" />
            <div v-else-if="!isTrueFalse" class="attempts-pill">
              {{ `${Math.max(0, maxAttempts - attemptedOptions.length)} tentativas` }}
            </div>
          </template>
        </QuestionCard>

        <div class="options options-grid-2">
          <ExerciseOption v-for="(option, index) in options" :key="option" :value="option" :index="index"
            :selected="selectedOption === option" :attempted="attemptedOptions.includes(option)"
            :correct="selectedOption === option && isOptionCorrect(option)"
            :wrong="(selectedOption === option || attemptedOptions.includes(option)) && !isOptionCorrect(option)"
            :locked="isLocked" @select="handleSelect" />
        </div>
      </div>
    </template>
  </section>

  <BadgeUnlockModal :visible="showGalaxyModal" tier="galaxy" :book-title="book?.title"
    @close="showGalaxyModal = false" />
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

/* ── INFO CARDS (locked / done) ────────────────────── */
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

.info-card__icon--done {
  background: var(--color-deep-500);
}

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

.info-card__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
}

/* ── RUNNER STATS ────────────────────────────────── */
.runner-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-300);
}

.stat-sep {
  font-size: 14px;
  color: var(--color-mirage-400);
  font-weight: 600;
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

.complete-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}

.complete-header p {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-500);
}

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
  background: var(--color-error-muted);
  border-color: var(--color-red-500);
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

/* ── HISTORY ────────────────────────────────────── */
.history-panel {
  display: grid;
  gap: var(--space-400);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-300);
}

.history-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.attempt-card {
  border: 2px solid var(--color-mirage-800);
  border-radius: 14px;
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  overflow: hidden;
}

.attempt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  gap: var(--space-300);
}

.attempt-meta {
  display: flex;
  align-items: center;
  gap: var(--space-300);
}

.attempt-date {
  font-size: 14px;
  color: var(--color-mirage-600);
}

.attempt-status {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 2px solid currentColor;
}

.attempt-status--pass {
  color: var(--color-deep-600);
  background: var(--color-deep-100);
}

.attempt-status--fail {
  color: var(--color-error-strong);
  background: var(--color-error-muted);
}

.attempt-score {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-mirage-700);
  white-space: nowrap;
}

.stat-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.stat-icon--correct { color: var(--color-deep-600); }
.stat-icon--wrong   { color: var(--color-error-strong); }

.attempt-questions {
  border-top: 2px solid var(--color-mirage-200, var(--color-wild-300));
  padding: 12px 16px;
  display: grid;
  gap: 10px;
}

.attempt-question {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--color-mirage-800);
}

.attempt-question--correct {
  background: var(--color-deep-100);
}

.attempt-question--wrong {
  background: var(--color-error-muted);
}

.q-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.q-icon--correct {
  color: var(--color-deep-600);
}

.q-icon--wrong {
  color: var(--color-error-strong);
}

.q-text {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-800);
  line-height: 1.4;
}

.runner {
  display: grid;
  gap: var(--space-500);
  padding-top: var(--space-300);
  border-top: 2px solid var(--color-wild-400);
}

.question-num {
  color: var(--color-teal-600);
}

.attempts-pill {
  padding: 6px 12px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-teal-100);
  font-weight: 700;
  font-size: 12px;
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
}
</style>
