<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import {
    fetchBook,
    fetchModule,
} from '../services/books'
import {
    createUserExercise,
    fetchExercisesByModule,
    fetchUserExercisesByModule,
    updateUserExercise,
} from '../services/exercises'
import { fetchUserById, updateUser } from '../services/auth'
import { getStoredUserId } from '../services/client'
import type { Book, Exercise, Module, UserExercise } from '@/types'

const route = useRoute()
const bookId = computed(() => Number(route.params.bookId || 1))
const moduleId = computed(() => Number(route.params.moduleId || 1))

const book = ref<Book | null>(null)
const moduleData = ref<Module | null>(null)
const exercises = ref<Exercise[]>([])
const error = ref('')
const isLoading = ref(false)
const currentIndex = ref(0)
const QUESTION_TIME = 20
const timeLeft = ref(QUESTION_TIME)
const attemptsUsed = ref(0)
const selectedOption = ref<string | null>(null)
const attemptedOptions = ref<string[]>([])
const isLocked = ref(false)
const isCompleted = ref(false)
const isSaving = ref(false)
const correctStreak = ref(0)
const userId = ref<string | null>(null)
const userPoints = ref(0)
const sessionPoints = ref(0)
const xpDelta = ref(0)
const xpPulse = ref(0)
const feedback = ref<null | { type: 'correct' | 'wrong'; points: number }>(null)
const feedbackTimer = ref<number | null>(null)
const timerId = ref<number | null>(null)
const existingRecords = ref<Record<number, UserExercise>>({})
const shuffledOptionsByExercise = ref<Record<number, string[]>>({})
const pendingResults = ref<
    Array<{
        exerciseId: number
        isCorrect: boolean
        attempts: number
        timeSpent: number
        pointsEarned: number
        alreadyAnswered: boolean
    }>
>([])

const currentExercise = computed(() => exercises.value[currentIndex.value] || null)

const currentQuestionText = computed(() => {
    const content = currentExercise.value?.content || {}
    return (
        (currentExercise.value as any)?.question_text ||
        content.pergunta ||
        content.question ||
        content.enunciado ||
        content.frase ||
        content.afirmacao ||
        'Pergunta indisponivel'
    )
})

const timerCircumference = 2 * Math.PI * 26
const timerDash = computed(() => {
    const ratio = Math.max(0, Math.min(1, timeLeft.value / QUESTION_TIME))
    return `${timerCircumference * ratio} ${timerCircumference}`
})

const isTrueFalse = computed(() => currentExercise.value?.type === 'true-false')

const options = computed(() => {
    if (!currentExercise.value?.exercise_id) return []
    return shuffledOptionsByExercise.value[currentExercise.value.exercise_id] || []
})

const maxAttempts = computed(() => (isTrueFalse.value ? 1 : 2))

const attemptsLabel = computed(() =>
    isTrueFalse.value
        ? '1 tentativa'
        : `${Math.max(0, maxAttempts.value - attemptsUsed.value)} tentativas`
)

const optionsLayout = computed(() => 'options-grid-2')

const summary = computed(() => {
    const answered = pendingResults.value.length
    const correct = pendingResults.value.filter((item) => item.isCorrect).length
    const alreadyAnswered = pendingResults.value.filter((item) => item.alreadyAnswered).length
    const points = pendingResults.value.reduce((sum, item) => sum + item.pointsEarned, 0)
    const timeSpent = pendingResults.value.reduce((sum, item) => sum + item.timeSpent, 0)
    return {
        total: exercises.value.length,
        answered,
        correct,
        wrong: Math.max(0, answered - correct),
        points,
        timeSpent,
        alreadyAnswered,
    }
})

const completionStats = computed(() => {
    const total = summary.value.total
    const correct = summary.value.correct
    const wrong = summary.value.wrong
    const points = summary.value.points
    const successRate = total ? Math.round((correct / total) * 100) : 0
    return { total, correct, wrong, points, successRate }
})

const isStreakActive = computed(() => correctStreak.value >= 2)

const currentXp = computed(() => sessionPoints.value)

const getExerciseQuestionText = (exercise: Exercise) => {
    const content = exercise.content || {}
    return (
        (exercise as any)?.question_text ||
        content.pergunta ||
        content.question ||
        content.enunciado ||
        content.frase ||
        content.afirmacao ||
        'Pergunta indisponivel'
    )
}

const exerciseResults = computed(() =>
    exercises.value.map((exercise, index) => {
        const exerciseId = Number(exercise.exercise_id)
        const result = pendingResults.value.find((item) => item.exerciseId === exerciseId)
        const isCorrect = result?.isCorrect
        const points = result?.pointsEarned ?? 0
        const status = isCorrect === true ? 'correct' : isCorrect === false ? 'wrong' : 'pending'
        return {
            index: index + 1,
            text: getExerciseQuestionText(exercise),
            status,
            points,
        }
    }),
)

const getOptionLabel = (value: string) => String(value || '').trim()

const getOptionLetter = (value: string) => {
    const trimmed = getOptionLabel(value)
    const match = trimmed.match(/^([A-F])\)/i)
    return match?.[1] ? match[1].toUpperCase() : ''
}

const getOptionText = (value: string) => {
    const trimmed = getOptionLabel(value)
    return trimmed.replace(/^[A-F]\)\s*/i, '')
}

const toOptionArray = (value: any) => {
    if (Array.isArray(value)) return value.map((item) => String(item))
    if (!value) return []
    return String(value)
        .split(/\n|;/)
        .map((item) => item.trim())
        .filter(Boolean)
}

const toBoolean = (value: any) => {
    if (typeof value === 'boolean') return value
    const normalized = String(value || '').trim().toLowerCase()
    if (!normalized) return false
    if (['true', 'verdadeiro', 'v', 'sim', 'yes'].includes(normalized)) return true
    if (['false', 'falso', 'f', 'nao', 'no'].includes(normalized)) return false
    return false
}

const shuffleArray = <T,>(values: T[]) => {
    const result = [...values]
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = result[i] as T
        result[i] = result[j] as T
        result[j] = temp
    }
    return result
}

const buildOptions = (exercise: Exercise) => {
    if (exercise.type === 'true-false') return ['Verdadeiro', 'Falso']
    const rawOptions = toOptionArray(exercise.content?.opcoes || exercise.content?.options)
    if (rawOptions.length <= 4) return rawOptions
    const correctValue = String(exercise.content?.resposta_correta || '').trim().toUpperCase()
    const correctByLetter = rawOptions.find(
        (option) => getOptionLetter(option) === correctValue,
    )
    const correctByText = rawOptions.find(
        (option) => getOptionLabel(option).toUpperCase() === correctValue,
    )
    const correctOption = correctByLetter || correctByText
    if (!correctOption) return shuffleArray(rawOptions).slice(0, 4)
    const wrongOptions = rawOptions.filter((option) => option !== correctOption)
    if (wrongOptions.length < 3) return shuffleArray(rawOptions).slice(0, 4)
    const pickedWrongs = shuffleArray(wrongOptions).slice(0, 3)
    return shuffleArray([correctOption, ...pickedWrongs])
}

const isOptionCorrect = (option: string) => {
    if (!currentExercise.value) return false
    if (isTrueFalse.value) {
        const normalized = getOptionLabel(option).toLowerCase()
        const expected = toBoolean(currentExercise.value.content?.resposta_correta)
        return expected ? normalized.startsWith('verd') : normalized.startsWith('fals')
    }

    const correct = String(currentExercise.value.content?.resposta_correta || '').trim()
    const optionLetter = getOptionLetter(option)
    const correctLetter = correct.toUpperCase()
    if (optionLetter && correctLetter) return optionLetter === correctLetter
    return getOptionLabel(option) === correct
}

const resetTimer = () => {
    if (timerId.value) {
        window.clearInterval(timerId.value)
        timerId.value = null
    }
    timeLeft.value = QUESTION_TIME
    timerId.value = window.setInterval(() => {
        if (timeLeft.value <= 0) {
            window.clearInterval(timerId.value as number)
            timerId.value = null
            handleTimeout()
            return
        }
        timeLeft.value -= 1
    }, 1000)
}

const stopTimer = () => {
    if (timerId.value) {
        window.clearInterval(timerId.value)
        timerId.value = null
    }
}

const resetQuestionState = () => {
    attemptsUsed.value = 0
    selectedOption.value = null
    attemptedOptions.value = []
    isLocked.value = false
    resetTimer()
}

const showFeedback = (type: 'correct' | 'wrong', points: number) => {
    feedback.value = { type, points }
    if (feedbackTimer.value) {
        window.clearTimeout(feedbackTimer.value)
    }
    feedbackTimer.value = window.setTimeout(() => {
        feedback.value = null
        feedbackTimer.value = null
    }, 2200)
}

const awardXp = (points: number) => {
    if (points <= 0) return
    sessionPoints.value += points
    xpDelta.value = points
    xpPulse.value += 1
    window.setTimeout(() => {
        xpDelta.value = 0
    }, 2200)
}

const updatePoints = async (points: number) => {
    if (!userId.value) return
    if (points <= 0) return
    const nextPoints = userPoints.value + points
    try {
        const updated = await updateUser(userId.value, { points: nextPoints })
        userPoints.value = updated.points ?? nextPoints
        window.dispatchEvent(new Event('gb-auth-changed'))
    } catch (err) {
        console.error(err)
    }
}

const recordResult = (isCorrect: boolean, attempts: number, points: number) => {
    if (!currentExercise.value?.exercise_id) return
    const exerciseId = currentExercise.value.exercise_id
    const timeSpent = QUESTION_TIME - timeLeft.value
    const alreadyAnswered = Boolean(existingRecords.value[exerciseId])
    const pointsEarned = alreadyAnswered ? 0 : points
    const entry = {
        exerciseId,
        isCorrect,
        attempts,
        timeSpent,
        pointsEarned,
        alreadyAnswered,
    }
    const existingIndex = pendingResults.value.findIndex((item) => item.exerciseId === exerciseId)
    if (existingIndex >= 0) {
        pendingResults.value.splice(existingIndex, 1, entry)
    } else {
        pendingResults.value.push(entry)
    }
}

const persistResults = async () => {
    if (!userId.value) return
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
            points_earned: result.pointsEarned,
            time_spent: result.timeSpent,
            date: timestamp,
        }
        if (existing?.id_user_exercises) {
            await updateUserExercise(existing.id_user_exercises, payload)
        } else {
            await createUserExercise(payload)
        }
    })

    await Promise.all(updates)
    await updatePoints(summary.value.points)
}

const goNext = async () => {
    if (currentIndex.value + 1 >= exercises.value.length) {
        stopTimer()
        isSaving.value = true
        await persistResults()
        isSaving.value = false
        isCompleted.value = true
        return
    }
    currentIndex.value += 1
}

const handleCorrect = async () => {
    stopTimer()
    isLocked.value = true
    const alreadyAnswered = currentExercise.value?.exercise_id
        ? Boolean(existingRecords.value[currentExercise.value.exercise_id])
        : false
    let basePoints = 0
    let bonusPoints = 0
    if (attemptsUsed.value === 0) {
        correctStreak.value += 1
        basePoints = 10
        bonusPoints = correctStreak.value >= 2 ? 5 : 0
    } else {
        correctStreak.value = 0
        basePoints = 5
    }
    const points = alreadyAnswered ? 0 : basePoints + bonusPoints
    recordResult(true, attemptsUsed.value + 1, points)
    awardXp(points)
    showFeedback('correct', points)
    window.setTimeout(goNext, 2200)
}

const handleIncorrect = async () => {
    attemptsUsed.value += 1
    correctStreak.value = 0
    showFeedback('wrong', 0)
    if (attemptsUsed.value < maxAttempts.value) {
        return
    }
    stopTimer()
    isLocked.value = true
    recordResult(false, attemptsUsed.value, 0)
    window.setTimeout(goNext, 2200)
}

const handleTimeout = async () => {
    if (isLocked.value) return
    isLocked.value = true
    correctStreak.value = 0
    showFeedback('wrong', 0)
    recordResult(false, maxAttempts.value, 0)
    window.setTimeout(goNext, 2200)
}

const handleSelect = (option: string) => {
    if (isLocked.value) return
    if (attemptedOptions.value.includes(option)) return
    if (selectedOption.value === option) return
    selectedOption.value = option
    if (isOptionCorrect(option)) {
        handleCorrect()
    } else {
        attemptedOptions.value = [...attemptedOptions.value, option]
        handleIncorrect()
    }
}

watch(
    [bookId, moduleId],
    async ([currentBookId, currentModuleId]) => {
        error.value = ''
        isLoading.value = true
        isCompleted.value = false
        currentIndex.value = 0
        correctStreak.value = 0
        pendingResults.value = []
        sessionPoints.value = 0
        xpDelta.value = 0
        xpPulse.value = 0
        feedback.value = null
        try {
            const storedId = getStoredUserId()
            userId.value = storedId
            const [bookInfo, moduleInfo, exerciseList, userInfo] = await Promise.all([
                fetchBook(currentBookId),
                fetchModule(currentModuleId),
                fetchExercisesByModule(currentModuleId),
                storedId ? fetchUserById(storedId) : Promise.resolve(null),
            ])
            book.value = bookInfo
            moduleData.value = moduleInfo
            const filtered = exerciseList.filter(
                (item) => item.type !== 'fill-blanks' && item.type !== 'ordering',
            )
            exercises.value = shuffleArray(filtered)
            shuffledOptionsByExercise.value = Object.fromEntries(
                exercises.value
                    .filter((item) => Number.isFinite(item.exercise_id))
                    .map((item) => [
                        Number(item.exercise_id),
                        shuffleArray(buildOptions(item)),
                    ] as const),
            )
            userPoints.value = userInfo?.points ?? 0
            if (storedId) {
                const existing = await fetchUserExercisesByModule(storedId, currentModuleId)
                existingRecords.value = Object.fromEntries(
                    existing
                        .map((item) => [
                            Number(item.exercise_id),
                            item,
                        ] as const)
                        .filter((entry) => Number.isFinite(entry[0])),
                )
            } else {
                existingRecords.value = {}
            }
            if (!exercises.value.length) {
                stopTimer()
            }
        } catch {
            error.value = 'Nao foi possivel carregar o modulo.'
            book.value = null
            moduleData.value = null
            exercises.value = []
            shuffledOptionsByExercise.value = {}
            existingRecords.value = {}
            stopTimer()
        } finally {
            isLoading.value = false
        }
    },
    { immediate: true },
)

watch(
    currentExercise,
    (nextExercise, previousExercise) => {
        if (!nextExercise || nextExercise === previousExercise) return
        resetQuestionState()
    },
)

onBeforeRouteLeave(() => {
    if (isCompleted.value || !pendingResults.value.length) return true
    return window.confirm('Se saires agora, as respostas desta sessao nao serao guardadas. Queres sair?')
})

onUnmounted(() => {
    stopTimer()
})
</script>

<template>
    <section class="module-runner">
        <header class="runner-header">
            <div class="header-left">
                <div>
                    <h1>{{ moduleData?.module_title || `Modulo ${moduleId}` }}</h1>
                    <p class="meta">{{ book?.title || `Livro ${bookId}` }}</p>
                </div>
            </div>
            <div class="runner-stats">
                <div class="runner-xp" :class="{ pulse: xpPulse % 2 === 1 }">
                    <span class="runner-xp__label">XP</span>
                    <strong class="runner-xp__value">{{ currentXp }}</strong>
                    <span v-if="xpDelta" class="runner-xp__delta">+{{ xpDelta }}</span>
                </div>
                <div class="runner-streak" :class="{ active: isStreakActive }">
                    <span class="runner-streak__label">Streak</span>
                    <strong class="runner-streak__value">
                        {{ isStreakActive ? `x${correctStreak}` : '0' }}
                    </strong>
                </div>
                <div class="runner-meta">
                    <span>Pergunta</span>
                    <strong>{{ Math.min(currentIndex + 1, exercises.length) }} / {{ exercises.length }}</strong>
                </div>
            </div>
        </header>

        <p v-if="isLoading" class="state">A carregar exercicios...</p>
        <p v-else-if="error" class="state error">{{ error }}</p>
        <p v-else-if="!exercises.length" class="state">Sem exercicios aprovados para este modulo.</p>

        <div v-else-if="isCompleted" class="complete-card">
            <div class="complete-header">
                <div>
                    <h2>Resumo do modulo</h2>
                    <p>Terminaste todas as perguntas. Aqui esta o teu resultado.</p>
                </div>
                <div class="summary-score">
                    <span>Score final</span>
                    <strong>{{ completionStats.correct }}/{{ completionStats.total }}</strong>
                    <em>{{ completionStats.successRate }}% de sucesso</em>
                </div>
            </div>
            <div class="summary-grid">
                <div>
                    <span>Total</span>
                    <strong>{{ completionStats.total }}</strong>
                </div>
                <div>
                    <span>Certas</span>
                    <strong>{{ completionStats.correct }}</strong>
                </div>
                <div>
                    <span>Erradas</span>
                    <strong>{{ completionStats.wrong }}</strong>
                </div>
                <div>
                    <span>Pontos</span>
                    <strong>+{{ completionStats.points }}</strong>
                </div>
            </div>
            <ul class="summary-list">
                <li v-for="item in exerciseResults" :key="item.index" class="summary-item" :class="item.status">
                    <div class="summary-item__text">
                        <span class="summary-item__index">#{{ item.index }}</span>
                        <span class="summary-item__question">{{ item.text }}</span>
                    </div>
                    <div class="summary-item__result">
                        <span class="summary-item__status">
                            {{ item.status === 'correct' ? 'Certa' : item.status === 'wrong' ? 'Errada' : 'Sem resposta'
                            }}
                        </span>
                        <strong class="summary-item__points">+{{ item.points }}</strong>
                    </div>
                </li>
            </ul>
            <p class="summary-note" v-if="summary.alreadyAnswered">
                {{ summary.alreadyAnswered }} perguntas ja tinham resposta anterior e nao contaram pontos.
            </p>
            <RouterLink :to="`/book/${bookId}`">
                <UiButton variant="outline">Voltar aos modulos</UiButton>
            </RouterLink>
        </div>

        <div v-else class="runner">
            <div class="question-card">
                <div class="question-card__shadow"></div>
                <div class="question-card__panel">
                    <div v-if="feedback" class="question-feedback" :class="feedback.type">
                        <span class="feedback-title">
                            {{ feedback.type === 'correct' ? 'Certo!' : 'Errado' }}
                        </span>
                        <span class="feedback-points">
                            {{ feedback.points > 0 ? `+${feedback.points} XP` : '0 XP' }}
                        </span>
                    </div>
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
                        <div v-if="!isTrueFalse" class="attempts-pill">{{ attemptsLabel }}</div>
                    </div>
                    <div class="question-divider"></div>
                    <p class="question-text">{{ currentQuestionText }}</p>
                </div>
            </div>

            <div class="options" :class="optionsLayout">
                <button v-for="(option, index) in options" :key="option" class="option" :class="{
                    selected: selectedOption === option,
                    attempted: attemptedOptions.includes(option),
                    correct: selectedOption === option && isOptionCorrect(option),
                    wrong: (selectedOption === option || attemptedOptions.includes(option)) && !isOptionCorrect(option),
                    locked: isLocked,
                }" type="button" @click="handleSelect(option)">
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
    </section>
</template>

<style scoped>
.module-runner {
    display: grid;
    gap: var(--space-400);
}

.runner-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-300);
    flex-wrap: wrap;
}

.runner-stats {
    width: min(960px, 100%);
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--space-200);
}

.runner-xp {
    position: relative;
    padding: 10px 16px;
    border-radius: 14px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-deep-100);
    box-shadow: 4px 4px 0 rgba(46, 127, 123, 0.35);
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    font-weight: 700;
    min-width: 160px;
    justify-content: center;
    overflow: visible;
}

.runner-streak {
    padding: 10px 16px;
    border-radius: 14px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 4px 4px 0 rgba(46, 127, 123, 0.35);
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    font-weight: 700;
    min-width: 160px;
    justify-content: center;
}

.runner-streak.active {
    background: var(--color-teal-200);
    box-shadow: 4px 4px 0 rgba(46, 127, 123, 0.5);
}

.runner-streak__label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-600);
}

.runner-streak__value {
    font-size: 18px;
    color: var(--color-mirage-800);
}

.runner-xp__label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-600);
}

.runner-xp__value {
    font-size: 18px;
    color: var(--color-mirage-800);
}

.runner-xp__delta {
    position: absolute;
    right: 6px;
    top: -12px;
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--color-teal-200);
    border: 2px solid var(--color-mirage-800);
    font-size: 12px;
    font-weight: 700;
    color: var(--color-mirage-800);
    animation: xp-pop 1.4s ease;
}

.runner-xp.pulse {
    animation: xp-pulse 0.7s ease;
}

.header-left {
    display: grid;
    gap: var(--space-200);
}

.runner-header h1 {
    margin: 6px 0 0;
    font-size: 26px;
}

.meta {
    color: var(--color-mirage-500);
    margin: 6px 0 0;
}

.runner-meta {
    padding: 10px 16px;
    border-radius: 14px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 4px 4px 0 rgba(46, 127, 123, 0.35);
    display: grid;
    gap: 2px;
    text-align: center;
    font-weight: 700;
    min-width: 160px;
}

.runner-meta span {
    font-size: 11px;
    color: var(--color-mirage-600);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.state {
    font-weight: 600;
    color: var(--color-mirage-600);
}

.state.error {
    color: #b13b3b;
}

.runner {
    display: grid;
    gap: var(--space-400);
    margin-top: var(--space-400);
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

.question-feedback {
    position: absolute;
    top: 16px;
    right: 16px;
    padding: 10px 14px;
    border-radius: 12px;
    border: 2px solid var(--color-mirage-800);
    display: grid;
    gap: 2px;
    font-weight: 700;
    background: var(--color-wild-100);
    box-shadow: 4px 4px 0 rgba(46, 127, 123, 0.35);
    animation: feedback-pop 0.6s ease;
}

.question-feedback.correct {
    background: var(--color-deep-100);
}

.question-feedback.wrong {
    background: #f7c4c4;
    border-color: #b13b3b;
}

.feedback-title {
    font-size: 14px;
    color: var(--color-mirage-800);
}

.question-feedback.wrong .feedback-title {
    color: #7a1f1f;
}

.feedback-points {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-600);
}

.question-feedback.wrong .feedback-points {
    color: #7a1f1f;
}

@keyframes xp-pop {
    0% {
        transform: translateY(10px) scale(0.9);
        opacity: 0;
    }

    55% {
        transform: translateY(-4px) scale(1.06);
        opacity: 1;
    }

    100% {
        transform: translateY(0) scale(1);
        opacity: 1;
    }
}

@keyframes xp-pulse {
    0% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.05);
    }

    100% {
        transform: scale(1);
    }
}

@keyframes feedback-pop {
    0% {
        transform: translateY(-6px) scale(0.95);
        opacity: 0;
    }

    60% {
        transform: translateY(0) scale(1.02);
        opacity: 1;
    }

    100% {
        transform: translateY(0) scale(1);
        opacity: 1;
    }
}

.question-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-300);
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

.question-title {
    text-align: left;
    font-size: 28px;
    font-weight: 600;
    color: var(--color-mirage-800);
}

.question-title span {
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
    transition: color 0.15s ease;
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
    transform: translate(0, 0);
}

.option-content {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 16px;
    padding: 24px 22px;
    transform: translate(0, 0);
    transition: transform 0.15s ease;
}

.option-letter {
    position: relative;
    width: 56px;
    height: 56px;
    transition: transform 0.2s ease;
}

.letter-shadow {
    position: absolute;
    inset: 0;
    background: var(--color-shadow);
    border-radius: 999px;
    transition: transform 0.2s ease, background 0.2s ease, opacity 0.2s ease;
    transform: translate(var(--option-press-x), var(--option-press-y));
}

.letter-face {
    position: absolute;
    inset: 0;
    background: var(--color-wild-100);
    border-radius: 999px;
    border: 2px solid #373737;
    transition: transform 0.2s ease, background 0.2s ease;
}

.letter-text {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 28px;
    font-weight: 600;
    color: var(--color-mirage-800);
    transition: transform 0.2s ease, color 0.2s ease;
}

.option-text {
    font-size: 22px;
    font-weight: 600;
    color: var(--color-mirage-800);
}

.option:hover .option-panel {
    background: var(--color-teal-300);
}

.option:active .option-panel {
    transform: translate(var(--option-press-x), var(--option-press-y));
}

.option:active .option-content {
    transform: translate(var(--option-press-x), var(--option-press-y));
}

.option:hover .option-shadow {
    background: var(--color-deep-600);
}

.option:hover .letter-shadow {
    background: var(--color-deep-600);
}

.option:hover .letter-face {
    background: var(--color-teal-100);
}

.option:active .letter-face,
.option:active .letter-text {
    transform: translate(var(--option-press-x), var(--option-press-y));
}

.option:active .letter-shadow,
.option.selected .letter-shadow,
.option.attempted .letter-shadow {
    opacity: 0;
}

.option.selected .option-panel {
    background: var(--color-teal-500);
    transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.selected .option-shadow {
    background: var(--color-deep-1000);
}

.option.selected .letter-face {
    background: var(--color-deep-200);
    transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.attempted .option-panel,
.option.attempted .option-content,
.option.attempted .letter-face,
.option.attempted .letter-text {
    transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.selected .option-content {
    transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.selected .letter-text {
    transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.selected .option-text {
    color: var(--color-wild-100);
}

.option.correct .option-panel {
    background: var(--color-deep-600);
}

.option.wrong .option-panel {
    background: #f7c4c4;
    border-color: #b13b3b;
}

.option.wrong .letter-face {
    background: #fbe1e1;
    border-color: #b13b3b;
}

.option.wrong .letter-shadow {
    background: #b13b3b;
}

.option.wrong .letter-text {
    color: #7a1f1f;
}

.option.wrong .option-text {
    color: #7a1f1f;
}

.option.locked {
    cursor: not-allowed;
}


.complete-card {
    border-radius: 16px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 6px 6px 0 rgba(46, 127, 123, 0.35);
    padding: 24px;
    display: grid;
    gap: var(--space-300);
}

.complete-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-300);
    flex-wrap: wrap;
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

.summary-score span {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-600);
}

.summary-score strong {
    font-size: 24px;
    color: var(--color-mirage-800);
}

.summary-score em {
    font-style: normal;
    font-size: 12px;
    color: var(--color-mirage-600);
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--space-200);
    padding: var(--space-200);
    border-radius: 12px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-200);
}

.summary-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-200);
}

.summary-item {
    display: flex;
    justify-content: space-between;
    gap: var(--space-200);
    padding: 12px 14px;
    border-radius: 12px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 3px 3px 0 rgba(46, 127, 123, 0.3);
}

.summary-item.correct {
    background: var(--color-deep-100);
}

.summary-item.wrong {
    background: #f7c4c4;
    border-color: #b13b3b;
}

.summary-item__text {
    display: grid;
    gap: 4px;
}

.summary-item__index {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-600);
}

.summary-item__question {
    font-size: 14px;
    color: var(--color-mirage-800);
}

.summary-item__result {
    text-align: right;
    display: grid;
    gap: 4px;
    align-content: center;
}

.summary-item__status {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-mirage-800);
}

.summary-item.wrong .summary-item__status,
.summary-item.wrong .summary-item__question {
    color: #7a1f1f;
}

.summary-item__points {
    font-size: 14px;
    color: var(--color-mirage-800);
}

.summary-grid span {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-500);
}

.summary-grid strong {
    font-size: 24px;
    color: var(--color-mirage-800);
}

.summary-note {
    margin: 0;
    font-size: 12px;
    color: var(--color-mirage-600);
}

@media (max-width: 720px) {
    .question-top {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: var(--space-200);
    }

    .question-title {
        font-size: 22px;
    }

    .question-text {
        font-size: 18px;
    }

    .option-content {
        grid-template-columns: 1fr;
        justify-items: center;
        text-align: center;
    }

    .option-text {
        font-size: 18px;
    }

    .runner-footer {
        flex-direction: column;
        align-items: flex-start;
    }

    .options-grid-2 {
        grid-template-columns: 1fr;
    }
}
</style>
