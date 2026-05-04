import { computed, onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'
import type { ExerciseLike } from '@/utils/exerciseUtils'

export function useExerciseRunner(
  questionTime: number,
  onTimeout: () => void | Promise<void>,
  currentExercise: Ref<ExerciseLike | null>,
) {
  const timeLeft = ref(questionTime)
  const timerId = ref<number | null>(null)
  const selectedOption = ref<string | null>(null)
  const attemptedOptions = ref<string[]>([])
  const isLocked = ref(false)
  const attemptsUsed = ref(0)

  const isTrueFalse = computed(() => currentExercise.value?.type === 'true-false')
  const maxAttempts = computed(() => (isTrueFalse.value ? 1 : 2))
  const attemptsLabel = computed(() => {
    const remaining = Math.max(0, maxAttempts.value - attemptsUsed.value)
    return isTrueFalse.value ? '1 tentativa' : `${remaining} tentativa${remaining === 1 ? '' : 's'}`
  })

  const timerCircumference = 2 * Math.PI * 26
  const timerDash = computed(() => {
    const ratio = Math.max(0, Math.min(1, timeLeft.value / questionTime))
    return `${timerCircumference * ratio} ${timerCircumference}`
  })

  const stopTimer = () => {
    if (timerId.value !== null) {
      window.clearInterval(timerId.value)
      timerId.value = null
    }
  }

  const resetTimer = () => {
    stopTimer()
    timeLeft.value = questionTime
    timerId.value = window.setInterval(() => {
      if (timeLeft.value <= 0) {
        stopTimer()
        onTimeout()
        return
      }
      timeLeft.value -= 1
    }, 1000)
  }

  const resetQuestionState = () => {
    attemptsUsed.value = 0
    selectedOption.value = null
    attemptedOptions.value = []
    isLocked.value = false
    resetTimer()
  }

  onUnmounted(stopTimer)

  return {
    timeLeft,
    selectedOption,
    attemptedOptions,
    isLocked,
    attemptsUsed,
    isTrueFalse,
    maxAttempts,
    attemptsLabel,
    timerCircumference,
    timerDash,
    stopTimer,
    resetTimer,
    resetQuestionState,
  }
}
