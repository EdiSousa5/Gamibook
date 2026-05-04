<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import ExerciseOption from '@/components/ui/ExerciseOption.vue'
import { BoltIcon, FireIcon } from '@heroicons/vue/24/outline'
import {
    shuffleArray,
    buildOptions,
    isOptionCorrect as checkOptionCorrect,
    getQuestionText,
} from '@/utils/exerciseUtils'
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
import { checkAndUpdateBadge } from '../services/badges'
import { getLevelProgressFromPoints } from '../utils/gamification'
import { useAuthStore } from '@/stores/auth'
import { useExerciseRunner } from '@/composables/useExerciseRunner'
import type { Book, Exercise, Module, UserExercise } from '@/types'

const auth = useAuthStore()

const route = useRoute()
const bookId = computed(() => Number(route.params.bookId || 1))
const moduleId = computed(() => Number(route.params.moduleId || 1))

const book = ref<Book | null>(null)
const moduleData = ref<Module | null>(null)
const exercises = ref<Exercise[]>([])
const error = ref('')
const isLoading = ref(false)
const currentIndex = ref(0)
const QUESTION_TIME = 30
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

const {
    timeLeft, selectedOption, attemptedOptions, isLocked, attemptsUsed,
    isTrueFalse, maxAttempts, attemptsLabel, timerDash,
    stopTimer, resetQuestionState,
} = useExerciseRunner(QUESTION_TIME, () => handleTimeout(), currentExercise)

const currentQuestionText = computed(() =>
    currentExercise.value ? getQuestionText(currentExercise.value) : '',
)

const options = computed(() => {
    if (!currentExercise.value?.exercise_id) return []
    return shuffledOptionsByExercise.value[currentExercise.value.exercise_id] || []
})


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
        }
    }),
)


const isOptionCorrect = (option: string) =>
    currentExercise.value ? checkOptionCorrect(currentExercise.value, option) : false

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
    const oldLevel = getLevelProgressFromPoints(userPoints.value).level
    const nextPoints = userPoints.value + points
    const newLevel = getLevelProgressFromPoints(nextPoints).level
    try {
        const updated = await updateUser(userId.value, { points: nextPoints })
        userPoints.value = updated.points ?? nextPoints
        await auth.loadUser()
        if (newLevel > oldLevel) {
            auth.triggerLevelUp(oldLevel, newLevel, nextPoints)
        }
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
        if (userId.value) {
            checkAndUpdateBadge(userId.value, bookId.value).catch(() => {})
        }
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
                        item.type === 'true-false' ? buildOptions(item) : shuffleArray(buildOptions(item)),
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


</script>

<template>
    <section class="module-runner">
        <header class="runner-header">
            <div class="runner-titles">
                <h1>{{ moduleData?.module_title || `Modulo ${moduleId}` }}</h1>
                <p class="meta">{{ book?.title || `Livro ${bookId}` }}</p>
            </div>
            <div class="runner-stats">
                <div class="runner-stat" :class="{ 'runner-stat--pulse': xpPulse % 2 === 1 }">
                    <BoltIcon class="stat-icon" aria-hidden="true" />
                    <div class="stat-body">
                        <span class="stat-label">XP da sessão</span>
                        <strong class="stat-value">{{ currentXp }}</strong>
                    </div>
                    <span v-if="xpDelta" class="stat-delta">+{{ xpDelta }}</span>
                </div>
                <div class="runner-stat" :class="{ 'runner-stat--streak': isStreakActive }">
                    <FireIcon class="stat-icon" aria-hidden="true" />
                    <div class="stat-body">
                        <span class="stat-label">Streak</span>
                        <strong class="stat-value">{{ isStreakActive ? `×${correctStreak}` : '—' }}</strong>
                    </div>
                </div>
                <div class="runner-stat">
                    <div class="stat-body">
                        <span class="stat-label">Progresso</span>
                        <strong class="stat-value">{{ Math.min(currentIndex + 1, exercises.length) }}<span class="stat-sep"> / {{ exercises.length }}</span></strong>
                    </div>
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
                            <span class="result-pill__label">{{ feedback.type === 'correct' ? 'Certo!' : 'Errado' }}</span>
                            <strong v-if="feedback.points > 0" class="result-pill__xp">+{{ feedback.points }} XP</strong>
                        </div>
                        <div v-else-if="!isTrueFalse" class="attempts-pill">{{ attemptsLabel }}</div>
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
    </section>
</template>

<style scoped>
.module-runner {
    display: grid;
    gap: var(--space-500);
}

.runner-header {
    display: grid;
    gap: var(--space-300);
}

.runner-titles {
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

.runner-stats {
    width: min(960px, 100%);
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-300);
}

.runner-stat {
    position: relative;
    padding: 12px 16px;
    border-radius: 14px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 4px 4px 0 var(--color-shadow);
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 700;
    overflow: visible;
    transition: background 0.2s ease;
}

.runner-stat--streak {
    background: var(--color-teal-200);
}

.runner-stat--pulse {
    animation: xp-pulse 0.7s ease;
}

.stat-icon {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    color: var(--color-mirage-600);
    stroke-width: 1.5;
}

.runner-stat--streak .stat-icon {
    color: var(--color-pumpkin-500);
}

.stat-body {
    display: grid;
    gap: 1px;
}

.stat-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-500);
    font-weight: 700;
}

.stat-value {
    font-size: 20px;
    color: var(--color-mirage-800);
    line-height: 1;
}

.stat-sep {
    font-size: 14px;
    color: var(--color-mirage-400);
    font-weight: 600;
}

.stat-delta {
    position: absolute;
    right: 8px;
    top: -10px;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--color-teal-200);
    border: 2px solid var(--color-mirage-800);
    font-size: 11px;
    font-weight: 700;
    color: var(--color-mirage-800);
    animation: xp-pop 1.4s ease;
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

.result-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    border: 2px solid var(--color-mirage-800);
    font-weight: 700;
    background: var(--color-wild-100);
    box-shadow: 3px 3px 0 var(--color-shadow);
    animation: feedback-pop 0.35s ease;
    white-space: nowrap;
}

.result-pill.correct {
    background: var(--color-deep-100);
}

.result-pill.wrong {
    background: #f7c4c4;
    border-color: #b13b3b;
}

.result-pill__label {
    font-size: 13px;
    color: var(--color-mirage-800);
}

.result-pill.wrong .result-pill__label {
    color: #7a1f1f;
}

.result-pill__xp {
    font-size: 12px;
    color: var(--color-deep-700);
}

.result-pill.wrong .result-pill__xp {
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
