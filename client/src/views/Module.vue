<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import ExerciseOption from '@/components/ui/ExerciseOption.vue'
import BadgeUnlockModal from '@/components/ui/BadgeUnlockModal.vue'
import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'
import { BoltIcon, FireIcon, InboxStackIcon, XMarkIcon } from '@heroicons/vue/24/outline'
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
    fetchUserPointsFromHistory,
    createUserPointsHistory,
    updateUserExercise,
} from '../services/exercises'
import { getStoredUserId } from '../services/client'
import { checkAndUpdateBadge, fetchUserBook } from '../services/badges'
import { getLevelProgressFromPoints } from '../utils/gamification'
import { useAuthStore } from '@/stores/auth'
import { useExerciseRunner } from '@/composables/useExerciseRunner'
import type { Book, Exercise, Module, UserExercise } from '@/types'

const auth = useAuthStore()

const route = useRoute()
const bookId = computed(() => Number(route.params.bookId || 1))
const moduleId = computed(() => Number(route.params.moduleId || 1))

type SessionMode = 'normal' | 'retry' | 'review'

const book = ref<Book | null>(null)
const moduleData = ref<Module | null>(null)
const exercises = ref<Exercise[]>([])
const allExercises = ref<Exercise[]>([])
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
const streakDelta = ref(0)
const streakAnimState = ref<'idle' | 'up' | 'lost'>('idle')
const feedback = ref<null | { type: 'correct' | 'wrong'; points: number }>(null)
const feedbackTimer = ref<number | null>(null)
const existingRecords = ref<Record<number, UserExercise>>({})
const shuffledOptionsByExercise = ref<Record<number, string[]>>({})
const viewState = ref<'setup' | 'runner' | 'summary'>('setup')
const selectedMode = ref<SessionMode>('normal')
const sessionMode = ref<SessionMode>('normal')
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

const initialBadge = ref<string>('default')
const badgeQueue = ref<BookBadgeTier[]>([])
const showBadgeModal = computed(() => badgeQueue.value.length > 0)
const earnedBadgeTier = computed<BookBadgeTier | null>(() => badgeQueue.value[0] ?? null)
const isLevelUpQueued = ref(false)

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
    return exerciseCounts.value.correct === exerciseCounts.value.total && modeCounts.value.review > 0
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

const modeFromQuery = computed<SessionMode | null>(() => {
    const raw = String(route.query.mode || '')
    if (raw === 'normal' || raw === 'retry' || raw === 'review') return raw
    return null
})

const summary = computed(() => {
    const answered = pendingResults.value.length
    const correct = pendingResults.value.filter((item) => item.isCorrect).length
    const previouslyCorrect = pendingResults.value.filter((item) => item.previousStatus === 'correct').length
    const previouslyWrong = pendingResults.value.filter((item) => item.previousStatus === 'wrong').length
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
    const total = summary.value.total
    const correct = summary.value.correct
    const wrong = summary.value.wrong
    const points = summary.value.points
    const successRate = total ? Math.round((correct / total) * 100) : 0
    return { total, correct, wrong, points, successRate }
})

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
            previousStatus: result?.previousStatus ?? 'new',
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

watch(correctStreak, (newVal, oldVal) => {
    if (newVal > oldVal && newVal > 0) {
        streakAnimState.value = 'up'
        window.setTimeout(() => { streakAnimState.value = 'idle' }, 700)
    } else if (newVal === 0 && oldVal > 0) {
        streakAnimState.value = 'lost'
        window.setTimeout(() => { streakAnimState.value = 'idle' }, 600)
    }
})

const awardXp = (basePoints: number, bonusPoints = 0) => {
    const total = basePoints + bonusPoints
    if (total <= 0) return
    sessionPoints.value += total
    if (basePoints > 0) {
        xpDelta.value = basePoints
        xpPulse.value += 1
        window.setTimeout(() => { xpDelta.value = 0 }, 2200)
    }
    if (bonusPoints > 0) {
        streakDelta.value = bonusPoints
        window.setTimeout(() => { streakDelta.value = 0 }, 2200)
    }
}

const isPointsEligible = (exerciseId: number) =>
    sessionMode.value !== 'review' && getPreviousStatus(exerciseId) !== 'correct'

const updatePoints = async (points: number) => {
    if (!userId.value) return
    if (points <= 0) return
    const oldLevel = getLevelProgressFromPoints(userPoints.value).level
    try {
        const totalPoints = await fetchUserPointsFromHistory(userId.value)
        userPoints.value = totalPoints
        auth.setPoints(totalPoints)
        const newLevel = getLevelProgressFromPoints(totalPoints).level
        if (newLevel > oldLevel) {
            isLevelUpQueued.value = true
            auth.triggerLevelUp(oldLevel, newLevel, totalPoints)
        }
    } catch (err) {
        console.error(err)
    }
}

const recordResult = (isCorrect: boolean, attempts: number, points: number) => {
    if (!currentExercise.value?.exercise_id) return
    const exerciseId = currentExercise.value.exercise_id
    const timeSpent = QUESTION_TIME - timeLeft.value
    const previousStatus = getPreviousStatus(exerciseId)
    const pointsEarned = isPointsEligible(exerciseId) ? points : 0
    const entry = {
        exerciseId,
        isCorrect,
        attempts,
        timeSpent,
        pointsEarned,
        previousStatus,
    }
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
    stopTimer()
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
    return [...allExercises.value]
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
            .map((item) => [
                Number(item.exercise_id),
                item.type === 'true-false' ? buildOptions(item) : shuffleArray(buildOptions(item)),
            ] as const),
    )
}

const startSession = (mode: SessionMode = selectedMode.value) => {
    if (!canStartMode(mode)) return
    sessionMode.value = mode
    viewState.value = 'runner'
    resetSessionState()
    const list = buildSessionExercises(mode)
    setSessionExercises(list)
    if (!list.length) {
        viewState.value = 'setup'
    }
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
        if (Number.isFinite(exerciseId)) {
            existingRecords.value[exerciseId] = record
        }
    }
    await updatePoints(summary.value.points)
}

const goNext = async () => {
    if (currentIndex.value + 1 >= exercises.value.length) {
        stopTimer()
        isSaving.value = true
        await persistResults()
        isSaving.value = false
        isCompleted.value = true
        viewState.value = 'summary'
        await runBadgeCheck()
        return
    }
    currentIndex.value += 1
}

const handleBadgeModalClose = () => {
    badgeQueue.value = badgeQueue.value.slice(1)
}

const handleCorrect = async () => {
    stopTimer()
    isLocked.value = true
    const exerciseId = currentExercise.value?.exercise_id
    const eligibleForPoints = exerciseId ? isPointsEligible(exerciseId) : false
    let basePoints = 0
    let bonusPoints = 0
    if (!eligibleForPoints) {
        correctStreak.value = 0
    } else if (attemptsUsed.value === 0) {
        correctStreak.value += 1
        basePoints = 10
        bonusPoints = correctStreak.value >= 2 ? 5 : 0
    } else {
        correctStreak.value = 0
        basePoints = 5
    }
    const points = eligibleForPoints ? basePoints + bonusPoints : 0
    recordResult(true, attemptsUsed.value + 1, points)
    awardXp(eligibleForPoints ? basePoints : 0, eligibleForPoints ? bonusPoints : 0)
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
        viewState.value = 'setup'
        resetSessionState()
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
            const filtered = exerciseList.filter(
                (item) => item.type !== 'fill-blanks' && item.type !== 'ordering',
            )
            allExercises.value = filtered
            if (storedId) {
                userPoints.value = await fetchUserPointsFromHistory(storedId).catch(() => 0)
                auth.setPoints(userPoints.value)
            } else {
                userPoints.value = 0
                auth.setPoints(0)
            }
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
            if (!allExercises.value.length) {
                stopTimer()
            }
        } catch {
            error.value = 'Nao foi possivel carregar o modulo.'
            book.value = null
            moduleData.value = null
            exercises.value = []
            allExercises.value = []
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
    [isLoading, viewState],
    ([loading, state]) => {
        if (!loading && state === 'setup' && allExercises.value.length > 0) {
            const queryMode = modeFromQuery.value
            const modeToStart = (queryMode && canStartMode(queryMode))
                ? queryMode
                : recommendedMode.value

            selectedMode.value = modeToStart
            if (canStartMode(modeToStart)) {
                startSession(modeToStart)
            }
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

// ── Confirmation modal ─────────────────────────────────────
const confirmModal = ref<{
    title: string
    message: string
    confirmLabel: string
    resolve: (val: boolean) => void
} | null>(null)

const openConfirm = (title: string, message: string, confirmLabel = 'Confirmar') =>
    new Promise<boolean>((resolve) => {
        confirmModal.value = { title, message, confirmLabel, resolve }
    })

const handleModalConfirm = () => {
    confirmModal.value?.resolve(true)
    confirmModal.value = null
}

const handleModalCancel = () => {
    confirmModal.value?.resolve(false)
    confirmModal.value = null
}

const BADGE_TIER_ORDER = ['default', 'bronze', 'silver', 'gold', 'diamond', 'galaxy'] as const

const enqueueBadgeModals = (newBadge: string) => {
    if (newBadge === 'default' || newBadge === initialBadge.value) return
    const startRank = Math.max(0, BADGE_TIER_ORDER.indexOf(initialBadge.value as typeof BADGE_TIER_ORDER[number]))
    const endRank = BADGE_TIER_ORDER.indexOf(newBadge as typeof BADGE_TIER_ORDER[number])
    if (endRank <= startRank) return
    const earned: BookBadgeTier[] = []
    for (let r = startRank + 1; r <= endRank; r++) {
        const t = BADGE_TIER_ORDER[r]
        if (t && t !== 'default') earned.push(t as BookBadgeTier)
    }
    initialBadge.value = newBadge
    if (earned.length > 0) {
        const delay = isLevelUpQueued.value ? 6000 : 1000
        setTimeout(() => { badgeQueue.value = [...badgeQueue.value, ...earned] }, delay)
    }
}

const runBadgeCheck = async () => {
    if (!userId.value) return
    const newBadge = await checkAndUpdateBadge(userId.value, bookId.value).catch(() => initialBadge.value as string)
    enqueueBadgeModals(String(newBadge))
}

const quitSession = async () => {
    const ok = await openConfirm(
        'Terminar quiz',
        'Queres terminar o quiz agora? As respostas desta sessao serao guardadas.',
        'Terminar',
    )
    if (!ok) return
    stopTimer()
    isSaving.value = true
    await persistResults()
    isSaving.value = false
    isCompleted.value = true
    viewState.value = 'summary'
    await runBadgeCheck()
}

let resolveLeave: ((val: boolean) => void) | null = null
const showLeaveModal = ref(false)

const confirmLeave = () => {
    showLeaveModal.value = false
    resolveLeave?.(true)
    resolveLeave = null
}

const cancelLeave = () => {
    showLeaveModal.value = false
    resolveLeave?.(false)
    resolveLeave = null
}

onBeforeRouteLeave(() => {
    if (viewState.value !== 'runner' || !pendingResults.value.length) return true
    showLeaveModal.value = true
    return new Promise<boolean>((resolve) => {
        resolveLeave = resolve
    })
})


</script>

<template>
    <section class="module-runner">
        <header class="runner-header">
            <div class="runner-titles">
                <h1>{{ moduleData?.module_title || `Modulo ${moduleId}` }}</h1>
                <p class="meta">{{ book?.title || `Livro ${bookId}` }}</p>
                <span v-if="viewState !== 'setup'" class="mode-pill">{{ modeLabel }}</span>
            </div>
        </header>

        <p v-if="isLoading" class="state">A carregar exercicios...</p>
        <p v-else-if="error" class="state error">{{ error }}</p>
        <p v-else-if="!allExercises.length" class="state">Sem exercicios aprovados para este modulo.</p>

        <div v-else-if="viewState === 'setup'" class="setup-shell">
            <p>Seleciona um modo para começar.</p>
        </div>

        <div v-else-if="viewState === 'summary'" class="summary-screen">
            <!-- Hero score banner -->
            <div class="summary-hero">
                <div class="summary-hero__score-wrap">
                    <span class="summary-hero__label">Resultado</span>
                    <div class="summary-hero__score">
                        <span class="summary-hero__correct">{{ completionStats.correct }}</span>
                        <span class="summary-hero__sep">/</span>
                        <span class="summary-hero__total">{{ completionStats.total }}</span>
                    </div>
                    <span class="summary-hero__rate">{{ completionStats.successRate }}% de acerto</span>
                </div>
                <div class="summary-hero__meta">
                    <h2 class="summary-hero__title">Sessao concluida!</h2>
                    <p class="summary-hero__mode">{{ modeLabel }}</p>
                    <div class="summary-hero__points">
                        <BoltIcon class="summary-hero__bolt" aria-hidden="true" />
                        <strong>+{{ completionStats.points }} XP</strong>
                        <span>ganhos nesta sessao</span>
                    </div>
                </div>
            </div>

            <!-- Stat chips -->
            <div class="summary-chips">
                <div class="summary-chip summary-chip--correct">
                    <span class="summary-chip__value">{{ completionStats.correct }}</span>
                    <span class="summary-chip__label">Certas</span>
                </div>
                <div class="summary-chip" :class="completionStats.wrong > 0 ? 'summary-chip--wrong' : 'summary-chip--pending'">
                    <span class="summary-chip__value" :class="{ 'chip-value--wrong': completionStats.wrong > 0 }">{{ completionStats.wrong }}</span>
                    <span class="summary-chip__label">Erradas</span>
                </div>
                <div class="summary-chip summary-chip--pending">
                    <span class="summary-chip__value">{{ completionStats.total - summary.answered }}</span>
                    <span class="summary-chip__label">Sem resposta</span>
                </div>
            </div>

            <!-- Exercise list -->
            <ul class="summary-list">
                <li v-for="item in exerciseResults" :key="item.index" class="summary-item" :class="item.status">
                    <div class="summary-item__left">
                        <span class="summary-item__index">#{{ item.index }}</span>
                        <div class="summary-item__text">
                            <span class="summary-item__question">{{ item.text }}</span>
                            <div class="summary-item__tags">
                                <span v-if="item.previousStatus === 'correct'" class="summary-tag">Ja respondida</span>
                                <span v-else-if="item.previousStatus === 'wrong'" class="summary-tag summary-tag--warn">Falhada antes</span>
                            </div>
                        </div>
                    </div>
                    <div class="summary-item__right">
                        <span class="summary-item__status-badge" :class="item.status">
                            {{ item.status === 'correct' ? 'Certa' : item.status === 'wrong' ? 'Errada' : '—' }}
                        </span>
                        <strong v-if="item.points > 0" class="summary-item__pts">+{{ item.points }} XP</strong>
                    </div>
                </li>
            </ul>

            <div class="summary-actions">
                <UiButton v-if="exerciseCounts.wrong > 0 && sessionMode !== 'retry'" variant="primary" @click="startSession('retry')">
                    Repetir errados
                </UiButton>
                <UiButton v-else-if="exerciseCounts.remaining > 0 && sessionMode === 'normal'" variant="primary" @click="startSession('normal')">
                    Continuar
                </UiButton>
                <UiButton v-if="exerciseCounts.correct === exerciseCounts.total && exerciseCounts.total > 0 && sessionMode !== 'review'"
                    variant="outline" @click="startSession('review')">
                    Rever tudo
                </UiButton>
                <RouterLink :to="`/book/${bookId}`">
                    <UiButton variant="outline">Continua</UiButton>
                </RouterLink>
            </div>
        </div>

        <div v-else class="runner">
            <div class="runner-stats">
                <template v-if="sessionMode === 'normal'">
                    <div class="runner-stat" :key="xpPulse" :class="{ 'runner-stat--pulse': xpPulse > 0 }">
                        <BoltIcon class="stat-icon" aria-hidden="true" />
                        <div class="stat-body">
                            <span class="stat-label">XP nesta sessao</span>
                            <span class="stat-value">{{ sessionPoints }}</span>
                        </div>
                        <span v-if="xpDelta > 0" class="stat-delta">+{{ xpDelta }}</span>
                    </div>
                    <div class="runner-stat runner-stat--streak"
                        :class="{ 'streak--up': streakAnimState === 'up', 'streak--lost': streakAnimState === 'lost' }">
                        <FireIcon class="stat-icon stat-icon--fire" aria-hidden="true" />
                        <div class="stat-body">
                            <span class="stat-label">Streak</span>
                            <span class="stat-value">{{ correctStreak }}</span>
                        </div>
                        <span v-if="streakDelta > 0" class="stat-delta stat-delta--streak">+{{ streakDelta }}</span>
                    </div>
                </template>
                <div class="runner-stat">
                    <InboxStackIcon class="stat-icon" aria-hidden="true" />
                    <div class="stat-body">
                        <span class="stat-label">Pergunta</span>
                        <span class="stat-value">{{ currentIndex + 1 }}<span class="stat-sep"> / {{ exercises.length }}</span></span>
                    </div>
                </div>
            </div>

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
                        <div class="question-tags">
                            <span v-if="!isReviewMode && currentExerciseStatus === 'correct'"
                                class="status-pill done">Ja respondido</span>
                            <span v-else-if="!isReviewMode && currentExerciseStatus === 'wrong'"
                                class="status-pill warn">Falhou antes</span>
                            <span v-if="isReviewMode" class="status-pill review">Revisao</span>
                            <div v-if="feedback" class="result-pill" :class="feedback.type">
                                <span class="result-pill__label">{{ feedback.type === 'correct' ? 'Certo!' : 'Errado'
                                    }}</span>
                                <strong v-if="feedback.points > 0" class="result-pill__xp">+{{ feedback.points }}
                                    XP</strong>
                            </div>
                            <div v-else-if="!isTrueFalse" class="attempts-pill">{{ attemptsLabel }}</div>
                        </div>
                    </div>
                    <div class="question-divider"></div>
                    <p class="question-text">{{ currentQuestionText }}</p>
                </div>
            </div>

            <div class="options options-grid-2">
                <ExerciseOption v-for="(option, index) in options" :key="option" :value="option" :index="index"
                    :selected="selectedOption === option" :attempted="attemptedOptions.includes(option)"
                    :correct="selectedOption === option && isOptionCorrect(option)"
                    :wrong="(selectedOption === option || attemptedOptions.includes(option)) && !isOptionCorrect(option)"
                    :locked="isLocked" @select="handleSelect" />
            </div>

            <div class="runner-footer">
                <button class="quit-button" type="button" @click="quitSession">
                    <XMarkIcon class="quit-icon" aria-hidden="true" />
                    Terminar quiz
                </button>
            </div>

        </div>

        <BadgeUnlockModal :visible="showBadgeModal" :tier="earnedBadgeTier" :book-title="book?.title || 'Livro'"
            @close="handleBadgeModalClose" />

    </section>

    <!-- Quit confirmation modal -->
    <Teleport to="body">
        <Transition name="modal-fade">
            <div v-if="confirmModal" class="confirm-overlay" @click.self="handleModalCancel">
                <div class="confirm-modal">
                    <h3 class="confirm-title">{{ confirmModal.title }}</h3>
                    <p class="confirm-message">{{ confirmModal.message }}</p>
                    <div class="confirm-actions">
                        <button class="confirm-btn confirm-btn--cancel" type="button" @click="handleModalCancel">Cancelar</button>
                        <button class="confirm-btn confirm-btn--confirm" type="button" @click="handleModalConfirm">{{ confirmModal.confirmLabel }}</button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>

    <!-- Leave confirmation modal -->
    <Teleport to="body">
        <Transition name="modal-fade">
            <div v-if="showLeaveModal" class="confirm-overlay" @click.self="cancelLeave">
                <div class="confirm-modal">
                    <h3 class="confirm-title">Sair do quiz?</h3>
                    <p class="confirm-message">Se saíres agora, as respostas desta sessão não serão guardadas.</p>
                    <div class="confirm-actions">
                        <button class="confirm-btn confirm-btn--cancel" type="button" @click="cancelLeave">Ficar</button>
                        <button class="confirm-btn confirm-btn--confirm" type="button" @click="confirmLeave">Sair</button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
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

.mode-pill {
    width: fit-content;
    padding: 4px 10px;
    border-radius: 999px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-teal-100);
    font-size: 11px;
    font-weight: 700;
    color: var(--color-mirage-700);
    text-transform: uppercase;
    letter-spacing: 1px;
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

.setup-shell {
    padding: 24px;
    border-radius: 16px;
    border: 2px dashed var(--color-mirage-400);
    background: var(--color-wild-200);
    color: var(--color-mirage-600);
    font-weight: 600;
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
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-300);
}

.question-tags {
    display: grid;
    gap: 6px;
    justify-items: end;
    text-align: right;
}

.status-pill {
    padding: 4px 10px;
    border-radius: 999px;
    border: 2px solid var(--color-mirage-800);
    font-size: 11px;
    font-weight: 700;
    background: var(--color-wild-200);
    color: var(--color-mirage-700);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.status-pill.warn {
    background: #f7c4c4;
    border-color: #b13b3b;
    color: #7a1f1f;
}

.status-pill.done {
    background: var(--color-deep-100);
}

.status-pill.review {
    background: var(--color-teal-100);
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


/* Summary screen */
.summary-screen {
    display: grid;
    gap: var(--space-400);
    animation: card-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.summary-hero {
    display: flex;
    align-items: center;
    gap: var(--space-500);
    padding: 28px 32px;
    border-radius: 16px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-deep-100);
    box-shadow: 8px 8px 0 rgba(46, 127, 123, 0.35);
    flex-wrap: wrap;
}

.summary-hero__score-wrap {
    display: grid;
    gap: 4px;
    text-align: center;
    flex-shrink: 0;
}

.summary-hero__label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--color-mirage-500);
}

.summary-hero__score {
    display: flex;
    align-items: baseline;
    gap: 4px;
    line-height: 1;
}

.summary-hero__correct {
    font-size: 56px;
    font-weight: 800;
    color: var(--color-mirage-900);
}

.summary-hero__sep {
    font-size: 32px;
    font-weight: 400;
    color: var(--color-mirage-400);
}

.summary-hero__total {
    font-size: 32px;
    font-weight: 700;
    color: var(--color-mirage-500);
}

.summary-hero__rate {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-deep-700);
}

.summary-hero__meta {
    display: grid;
    gap: var(--space-150);
}

.summary-hero__title {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    color: var(--color-mirage-900);
}

.summary-hero__mode {
    margin: 0;
    font-size: 13px;
    color: var(--color-mirage-500);
    text-transform: capitalize;
}

.summary-hero__points {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
}

.summary-hero__points strong {
    font-size: 18px;
    font-weight: 800;
    color: var(--color-mirage-800);
}

.summary-hero__points span {
    font-size: 13px;
    color: var(--color-mirage-500);
}

.summary-hero__bolt {
    width: 18px;
    height: 18px;
    color: var(--color-deep-600);
    stroke-width: 2;
}

.summary-chips {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-300);
}

.summary-chip {
    padding: 16px;
    border-radius: 14px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 4px 4px 0 var(--color-shadow);
    display: grid;
    gap: 4px;
    text-align: center;
}

.summary-chip--correct { background: var(--color-deep-100); }

.summary-chip--wrong { background: #fbe1e1; border-color: #b13b3b; }

.summary-chip--pending { background: var(--color-wild-200); }

.summary-chip__value {
    font-size: 28px;
    font-weight: 800;
    color: var(--color-mirage-800);
    line-height: 1;
}

.summary-chip--wrong .summary-chip__value { color: #b13b3b; }

.summary-chip__label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-500);
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
    align-items: center;
    justify-content: space-between;
    gap: var(--space-300);
    padding: 14px 16px;
    border-radius: 12px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 3px 3px 0 rgba(46, 127, 123, 0.2);
}

.summary-item.correct { background: var(--color-deep-100); }
.summary-item.wrong { background: #fbe1e1; border-color: #b13b3b; }
.summary-item.pending { background: var(--color-wild-200); opacity: 0.65; }

.summary-item__left {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex: 1;
    min-width: 0;
}

.summary-item__index {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-500);
    padding-top: 2px;
}

.summary-item__text {
    display: grid;
    gap: 4px;
    min-width: 0;
}

.summary-item__question {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-mirage-800);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.summary-item.wrong .summary-item__question { color: #7a1f1f; }

.summary-item__tags {
    display: flex;
    gap: 6px;
}

.summary-tag {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-mirage-500);
}

.summary-tag--warn { color: #b13b3b; }

.summary-item__right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
}

.summary-item__status-badge {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 3px 8px;
    border-radius: 999px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-200);
    color: var(--color-mirage-700);
}

.summary-item__status-badge.correct {
    background: var(--color-deep-200, #b8e8e4);
    color: var(--color-deep-800, #0f4f4c);
    border-color: var(--color-deep-600);
}

.summary-item__status-badge.wrong {
    background: #f7c4c4;
    color: #7a1f1f;
    border-color: #b13b3b;
}

.summary-item__pts {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-deep-700);
}

.summary-actions {
    display: flex;
    gap: var(--space-200);
    flex-wrap: wrap;
}

@keyframes card-in {
    from {
        transform: translateY(16px) scale(0.97);
        opacity: 0;
    }
    to {
        transform: translateY(0) scale(1);
        opacity: 1;
    }
}

.runner-footer {
    display: flex;
    justify-content: flex-end;
    width: min(960px, 100%);
    margin: 0 auto;
}

.quit-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 14px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-200);
    box-shadow: 4px 4px 0 var(--color-shadow);
    font-size: 13px;
    font-weight: 700;
    color: var(--color-mirage-700);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.quit-button:hover {
    transform: translateY(-2px);
    box-shadow: 4px 6px 0 var(--color-shadow);
    background: var(--color-wild-300, var(--color-wild-200));
}

.quit-button:active {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 var(--color-shadow);
}

.quit-icon {
    width: 16px;
    height: 16px;
    stroke-width: 2.5;
}

/* Confirmation modals */
.confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 29, 32, 0.55);
    backdrop-filter: blur(4px);
    display: grid;
    place-items: center;
    z-index: 9999;
    padding: 16px;
}

.confirm-modal {
    background: var(--color-wild-100);
    border: 2px solid var(--color-mirage-800);
    border-radius: 20px;
    box-shadow: 8px 8px 0 var(--color-shadow);
    padding: 32px;
    width: min(420px, 100%);
    display: grid;
    gap: var(--space-300);
}

.confirm-title {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    color: var(--color-mirage-900);
}

.confirm-message {
    margin: 0;
    font-size: 14px;
    color: var(--color-mirage-600);
    line-height: 1.55;
}

.confirm-actions {
    display: flex;
    gap: var(--space-200);
    justify-content: flex-end;
    margin-top: var(--space-100);
}

.confirm-btn {
    padding: 10px 22px;
    border-radius: 12px;
    border: 2px solid var(--color-mirage-800);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.confirm-btn--cancel {
    background: var(--color-wild-200);
    color: var(--color-mirage-700);
    box-shadow: 3px 3px 0 var(--color-shadow);
}

.confirm-btn--cancel:hover {
    transform: translateY(-1px);
    box-shadow: 3px 4px 0 var(--color-shadow);
}

.confirm-btn--confirm {
    background: var(--color-deep-100);
    color: var(--color-mirage-800);
    border-color: var(--color-deep-600);
    box-shadow: 3px 3px 0 var(--color-shadow);
}

.confirm-btn--confirm:hover {
    transform: translateY(-1px);
    box-shadow: 3px 4px 0 var(--color-shadow);
    background: var(--color-deep-200, var(--color-deep-100));
}

.confirm-btn:active {
    transform: translate(1px, 1px);
    box-shadow: none;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

@media (max-width: 720px) {
    .question-top {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: var(--space-200);
    }

    .question-tags {
        justify-items: center;
        text-align: center;
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

/* Streak animations */
@keyframes streak-up {
    0% { transform: scale(1); }
    35% { transform: scale(1.1); }
    65% { transform: scale(0.95); }
    100% { transform: scale(1); }
}

@keyframes streak-lost {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-5px); }
    40% { transform: translateX(5px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
}

@keyframes fire-up {
    0% { transform: scale(1) rotate(0deg); }
    40% { transform: scale(1.5) rotate(-12deg); color: #ff6b00; }
    70% { transform: scale(1.2) rotate(6deg); }
    100% { transform: scale(1) rotate(0deg); }
}

@keyframes fire-lost {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
    100% { opacity: 1; transform: scale(1); }
}

.runner-stat--streak.streak--up {
    animation: streak-up 0.65s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.runner-stat--streak.streak--lost {
    animation: streak-lost 0.55s ease;
}

.runner-stat--streak.streak--up .stat-icon--fire {
    animation: fire-up 0.65s ease;
}

.runner-stat--streak.streak--lost .stat-icon--fire {
    animation: fire-lost 0.55s ease;
}

.stat-delta--streak {
    background: var(--color-pumpkin-100, #fff0e0);
    border-color: var(--color-pumpkin-500, #f07c00);
    color: var(--color-pumpkin-700, #a34d00);
}

.chip-value--wrong {
    color: #b13b3b;
}
</style>
