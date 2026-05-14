import { computed, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { Book, Exercise, Module, UserExercise } from '@/types'
import { shuffleArray, buildOptions, getQuestionText } from '@/utils/exerciseUtils'
import { fetchBook, fetchModule, fetchModulesByBook } from '@/services/books'
import {
  createUserExercise,
  fetchExercisesByModule,
  fetchUserExercisesByModule,
  fetchUserPointsFromHistory,
  createUserPointsHistory,
  updateUserExercise,
  fetchApprovedExerciseCountsByModule,
} from '@/services/exercises'
import { useToast } from '@/composables/useToast'
import { getStoredUserId } from '@/services/client'
import { fetchUserBook, TIER_ORDER, tierForPct, updateUserBookBadge } from '@/services/badges'
import { getLevelProgressFromPoints } from '@/utils/gamification'
import { FEEDBACK_DELAY_MS } from '@/utils/timing'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'

export type SessionMode = 'normal' | 'retry' | 'review'

export function useModuleSession(bookId: ComputedRef<number>, moduleId: ComputedRef<number>) {
  const auth = useAuthStore()
  const notifStore = useNotificationsStore()

  const book = ref<Book | null>(null)
  const moduleData = ref<Module | null>(null)
  const exercises = ref<Exercise[]>([])
  const allExercises = ref<Exercise[]>([])
  const error = ref('')
  const isLoading = ref(false)
  const currentIndex = ref(0)
  const isCompleted = ref(false)
  const isSaving = ref(false)
  const correctStreak = ref(0)
  const userId = ref<string | null>(null)
  const userPoints = ref(0)
  const sessionPoints = ref(0)
  const xpDelta = ref(0)
  const xpPulse = ref(0)
  const streakDelta = ref(0)
  const streakAnimState = ref<'idle' | 'up' | 'lost'>('idle')
  const feedback = ref<null | { type: 'correct' | 'wrong'; points: number }>(null)
  const feedbackTimer = ref<number | null>(null)
  const existingRecords = ref<Record<number, UserExercise>>({})
  const shuffledOptionsByExercise = ref<Record<number, string[]>>({})
  const viewState = ref<'setup' | 'runner' | 'summary'>('setup')
  const selectedMode = ref<SessionMode>('normal')
  const sessionMode = ref<SessionMode>('normal')
  const isLevelUpQueued = ref(false)
  const initialBadge = ref<string>('default')
  const pendingResults = ref<
    Array<{
      exerciseId: number
      isCorrect: boolean
      attempts: number
      timeSpent: number
      pointsEarned: number
      previousStatus: 'correct' | 'wrong' | 'new'
    }>
  >([])

  const currentExercise = computed(() => exercises.value[currentIndex.value] || null)
  const isReviewMode = computed(() => sessionMode.value === 'review')

  const getPreviousStatus = (exerciseId: number): 'correct' | 'wrong' | 'new' => {
    const record = existingRecords.value[exerciseId]
    if (record?.is_correct === true) return 'correct'
    if (record?.is_correct === false) return 'wrong'
    return 'new'
  }

  const exerciseCounts = computed(() => {
    let correct = 0
    let wrong = 0
    let fresh = 0
    for (const ex of allExercises.value) {
      const id = Number(ex.exercise_id)
      const status = Number.isFinite(id) ? getPreviousStatus(id) : 'new'
      if (status === 'correct') correct += 1
      else if (status === 'wrong') wrong += 1
      else fresh += 1
    }
    const total = allExercises.value.length
    const remaining = Math.max(0, total - (correct + wrong))
    return { total, correct, wrong, fresh, remaining }
  })

  const modeCounts = computed(() => ({
    normal: exerciseCounts.value.fresh + exerciseCounts.value.wrong,
    retry: exerciseCounts.value.wrong,
    review: exerciseCounts.value.total,
  }))

  const canStartMode = (mode: SessionMode) => {
    if (mode === 'normal') return modeCounts.value.normal > 0
    if (mode === 'retry') return modeCounts.value.retry > 0
    return (
      exerciseCounts.value.correct === exerciseCounts.value.total && modeCounts.value.review > 0
    )
  }

  const recommendedMode = computed<SessionMode>(() => {
    if (!exerciseCounts.value.total) return 'normal'
    if (exerciseCounts.value.correct === exerciseCounts.value.total) return 'review'
    if (exerciseCounts.value.wrong > 0) return 'retry'
    return 'normal'
  })

  const currentExerciseStatus = computed(() => {
    const id = currentExercise.value?.exercise_id
    if (!id) return 'new'
    return getPreviousStatus(Number(id))
  })

  const modeLabel = computed(() => {
    if (sessionMode.value === 'retry') return 'Repetir errados'
    if (sessionMode.value === 'review') return 'Rever exercicios'
    return 'Modo normal'
  })

  const summary = computed(() => {
    const answered = pendingResults.value.length
    const correct = pendingResults.value.filter((item) => item.isCorrect).length
    const previouslyCorrect = pendingResults.value.filter(
      (item) => item.previousStatus === 'correct',
    ).length
    const previouslyWrong = pendingResults.value.filter(
      (item) => item.previousStatus === 'wrong',
    ).length
    const points = pendingResults.value.reduce((sum, item) => sum + item.pointsEarned, 0)
    const timeSpent = pendingResults.value.reduce((sum, item) => sum + item.timeSpent, 0)
    return {
      total: exercises.value.length,
      answered,
      correct,
      wrong: Math.max(0, answered - correct),
      points,
      timeSpent,
      previouslyCorrect,
      previouslyWrong,
    }
  })

  const completionStats = computed(() => {
    const { total, correct, wrong, points } = summary.value
    const successRate = total ? Math.round((correct / total) * 100) : 0
    return { total, correct, wrong, points, successRate }
  })

  const exerciseResults = computed(() =>
    exercises.value.map((exercise, index) => {
      const exerciseId = Number(exercise.exercise_id)
      const result = pendingResults.value.find((item) => item.exerciseId === exerciseId)
      const isCorrect = result?.isCorrect
      const points = result?.pointsEarned ?? 0
      const status = isCorrect === true ? 'correct' : isCorrect === false ? 'wrong' : 'pending'
      return {
        index: index + 1,
        text: getQuestionText(exercise),
        status,
        points,
        previousStatus: result?.previousStatus ?? 'new',
      }
    }),
  )

  const showFeedback = (type: 'correct' | 'wrong', points: number) => {
    feedback.value = { type, points }
    if (feedbackTimer.value) window.clearTimeout(feedbackTimer.value)
    feedbackTimer.value = window.setTimeout(() => {
      feedback.value = null
      feedbackTimer.value = null
    }, FEEDBACK_DELAY_MS)
  }

  watch(correctStreak, (newVal, oldVal) => {
    if (newVal > oldVal && newVal > 0) {
      streakAnimState.value = 'up'
      window.setTimeout(() => {
        streakAnimState.value = 'idle'
      }, 700)
    } else if (newVal === 0 && oldVal > 0) {
      streakAnimState.value = 'lost'
      window.setTimeout(() => {
        streakAnimState.value = 'idle'
      }, 600)
    }
  })

  const awardXp = (basePoints: number, bonusPoints = 0) => {
    const total = basePoints + bonusPoints
    if (total <= 0) return
    sessionPoints.value += total
    if (basePoints > 0) {
      xpDelta.value = basePoints
      xpPulse.value += 1
      window.setTimeout(() => {
        xpDelta.value = 0
      }, FEEDBACK_DELAY_MS)
    }
    if (bonusPoints > 0) {
      streakDelta.value = bonusPoints
      window.setTimeout(() => {
        streakDelta.value = 0
      }, FEEDBACK_DELAY_MS)
    }
  }

  const isPointsEligible = (exerciseId: number) =>
    sessionMode.value !== 'review' && getPreviousStatus(exerciseId) !== 'correct'

  const updatePoints = async (points: number) => {
    if (!userId.value || points <= 0) return
    const oldLevel = getLevelProgressFromPoints(userPoints.value).level
    try {
      const totalPoints = await fetchUserPointsFromHistory(userId.value)
      userPoints.value = totalPoints
      auth.setPoints(totalPoints)
      const newLevel = getLevelProgressFromPoints(totalPoints).level
      if (newLevel > oldLevel) {
        isLevelUpQueued.value = true
        auth.triggerLevelUp(oldLevel, newLevel, totalPoints)
        if (userId.value) {
          notifStore.add({
            user: userId.value,
            title: `Subiste para o nível ${newLevel}!`,
            message: `Parabéns! Chegaste ao nível ${newLevel} com ${totalPoints} XP no total.`,
            type: 'achievement',
          })
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const recordResult = (
    isCorrect: boolean,
    attempts: number,
    points: number,
    timeSpent: number,
  ) => {
    if (!currentExercise.value?.exercise_id) return
    const exerciseId = currentExercise.value.exercise_id
    const previousStatus = getPreviousStatus(exerciseId)
    const pointsEarned = isPointsEligible(exerciseId) ? points : 0
    const entry = { exerciseId, isCorrect, attempts, timeSpent, pointsEarned, previousStatus }
    const existingIndex = pendingResults.value.findIndex((item) => item.exerciseId === exerciseId)
    if (existingIndex >= 0) {
      pendingResults.value.splice(existingIndex, 1, entry)
    } else {
      pendingResults.value.push(entry)
    }
  }

  const resetSessionState = () => {
    isCompleted.value = false
    currentIndex.value = 0
    correctStreak.value = 0
    pendingResults.value = []
    sessionPoints.value = 0
    xpDelta.value = 0
    xpPulse.value = 0
    feedback.value = null
    isSaving.value = false
    isLevelUpQueued.value = false
  }

  const buildSessionExercises = (mode: SessionMode) => {
    if (mode === 'normal') {
      return allExercises.value.filter((exercise) => {
        const id = Number(exercise.exercise_id)
        return !Number.isFinite(id) || getPreviousStatus(id) !== 'correct'
      })
    }
    if (mode === 'retry') {
      return allExercises.value.filter((exercise) => {
        const id = Number(exercise.exercise_id)
        return Number.isFinite(id) && getPreviousStatus(id) === 'wrong'
      })
    }
    return allExercises.value.filter((exercise) => {
      const id = Number(exercise.exercise_id)
      return Number.isFinite(id) && getPreviousStatus(id) === 'correct'
    })
  }

  const setSessionExercises = (list: Exercise[]) => {
    if (!list.length) {
      exercises.value = []
      shuffledOptionsByExercise.value = {}
      return
    }
    const shuffled = shuffleArray(list)
    exercises.value = shuffled
    shuffledOptionsByExercise.value = Object.fromEntries(
      shuffled
        .filter((item) => Number.isFinite(item.exercise_id))
        .map(
          (item) =>
            [
              Number(item.exercise_id),
              item.type === 'true-false' ? buildOptions(item) : shuffleArray(buildOptions(item)),
            ] as const,
        ),
    )
  }

  const startSession = (mode: SessionMode = selectedMode.value) => {
    if (!canStartMode(mode)) return
    sessionMode.value = mode
    viewState.value = 'runner'
    resetSessionState()
    const list = buildSessionExercises(mode)
    setSessionExercises(list)
    if (!list.length) viewState.value = 'setup'
  }

  const persistResults = async () => {
    if (!userId.value || isReviewMode.value) return
    const currentUserId = userId.value
    const updates = pendingResults.value.map(async (result) => {
      const existing = existingRecords.value[result.exerciseId]
      const timestamp = new Date().toISOString()
      if (existing?.is_correct === true) return
      const payload = {
        user_id: currentUserId,
        exercise_id: result.exerciseId,
        module_id: moduleId.value,
        is_correct: result.isCorrect,
        attempts: result.attempts,
        time_spent: result.timeSpent,
        date: timestamp,
      }
      let userExerciseRecord: UserExercise | null = null
      if (existing?.id_user_exercises) {
        userExerciseRecord = await updateUserExercise(existing.id_user_exercises, payload)
      } else {
        userExerciseRecord = await createUserExercise(payload)
      }
      if (userExerciseRecord && result.pointsEarned > 0) {
        await createUserPointsHistory({
          user_id: currentUserId,
          points: result.pointsEarned,
          source: 'exercise',
          reference_id: result.exerciseId,
        }).catch(() => console.error('Failed to save points history'))
      }
      return userExerciseRecord
    })
    const saved = (await Promise.all(updates)).filter(Boolean) as UserExercise[]
    for (const record of saved) {
      const exerciseId = Number(record.exercise_id)
      if (Number.isFinite(exerciseId)) existingRecords.value[exerciseId] = record
    }
    await updatePoints(summary.value.points)
  }

  const loadData = async (currentBookId: number, currentModuleId: number) => {
    error.value = ''
    isLoading.value = true
    viewState.value = 'setup'
    exercises.value = []
    shuffledOptionsByExercise.value = {}
    allExercises.value = []
    try {
      const storedId = getStoredUserId()
      userId.value = storedId
      const [bookInfo, moduleInfo, exerciseList, userBookInfo] = await Promise.all([
        fetchBook(currentBookId),
        fetchModule(currentModuleId),
        fetchExercisesByModule(currentModuleId),
        storedId ? fetchUserBook(storedId, currentBookId) : Promise.resolve(null),
      ])
      book.value = bookInfo
      moduleData.value = moduleInfo
      initialBadge.value = userBookInfo?.current_badge || 'default'
      allExercises.value = exerciseList
      if (storedId) {
        userPoints.value = await fetchUserPointsFromHistory(storedId).catch(() => 0)
        auth.setPoints(userPoints.value)
        const existing = await fetchUserExercisesByModule(storedId, currentModuleId)
        existingRecords.value = Object.fromEntries(
          existing
            .map((item) => [Number(item.exercise_id), item] as const)
            .filter((entry) => Number.isFinite(entry[0])),
        )

        // Mecanismo de Segurança: Recalcular a percentagem do livro e atualizar badge se for necessário
        if (userBookInfo?.user_book_id) {
          const modulesForBook = await fetchModulesByBook(currentBookId)
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
                fetchUserExercisesByModule(storedId, m.modules_id, true),
              ])
              return { total, correct: correctItems.length }
            })

          const stats = await Promise.all(statsPromises)
          stats.forEach((s) => {
            totalBookExercises += s.total
            correctBookExercises += s.correct
          })

          const currentPct =
            totalBookExercises === 0
              ? 0
              : Math.round((correctBookExercises / totalBookExercises) * 100)
          let expectedTier = tierForPct(currentPct)

          const currentBadge = userBookInfo.current_badge || 'default'

          if (currentBadge === 'galaxy' && currentPct >= 100) expectedTier = 'galaxy' // Impede a perda do badge galaxy se a percentagem continuar a 100%

          if (currentBadge !== expectedTier) {
            const oldRank = TIER_ORDER.indexOf(currentBadge as any)
            const newRank = TIER_ORDER.indexOf(expectedTier as any)
            
            await updateUserBookBadge(userBookInfo.user_book_id, expectedTier)
            userBookInfo.current_badge = expectedTier
            initialBadge.value = expectedTier // Ajusta na sessão atual para que a animação das vitórias funcione a partir do nível real
            
            const toast = useToast()
            if (newRank < oldRank) {
              toast.error(`Atenção: O teu progresso foi recalculado e desceste para o badge ${expectedTier}.`)
            } else if (newRank > oldRank) {
              toast.success(`Progresso sincronizado! Subiste para o badge ${expectedTier}.`)
            }
          }
        }
      } else {
        userPoints.value = 0
        auth.setPoints(0)
        existingRecords.value = {}
      }
      return userBookInfo
    } catch {
      error.value = 'Não foi possível carregar o módulo.'
      book.value = null
      moduleData.value = null
      exercises.value = []
      allExercises.value = []
      shuffledOptionsByExercise.value = {}
      existingRecords.value = {}
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Re-expose TIER_ORDER so useBadgeQueue can access initialBadge-based logic
  return {
    book,
    moduleData,
    exercises,
    allExercises,
    error,
    isLoading,
    currentIndex,
    isCompleted,
    isSaving,
    correctStreak,
    userId,
    userPoints,
    sessionPoints,
    xpDelta,
    xpPulse,
    streakDelta,
    streakAnimState,
    feedback,
    existingRecords,
    shuffledOptionsByExercise,
    viewState,
    selectedMode,
    sessionMode,
    isLevelUpQueued,
    pendingResults,
    initialBadge,
    currentExercise,
    isReviewMode,
    exerciseCounts,
    modeCounts,
    modeLabel,
    canStartMode,
    recommendedMode,
    currentExerciseStatus,
    summary,
    completionStats,
    exerciseResults,
    isPointsEligible,
    awardXp,
    recordResult,
    showFeedback,
    resetSessionState,
    startSession,
    persistResults,
    loadData,
  }
}
