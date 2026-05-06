<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import ExerciseOption from '@/components/ui/ExerciseOption.vue'
import { shuffleArray, buildOptions, isOptionCorrect as checkOptionCorrect } from '@/utils/exerciseUtils'
import { fetchUserBooks } from '../services/books'
import {
    fetchDailyExercisesForBooks,
    fetchLatestUserDailyExercise,
    fetchAnsweredDailyExerciseIds,
    createUserDailyExercise,
    createUserExercise,
    fetchUserPointsTotal,
} from '../services/exercises'
import { fetchUserById, updateUser } from '../services/auth'
import { getStoredUserId } from '../services/client'
import { getLevelProgressFromPoints } from '../utils/gamification'
import { useAuthStore } from '@/stores/auth'
import { useExerciseRunner } from '@/composables/useExerciseRunner'
import { CheckCircleIcon, FireIcon, XCircleIcon } from '@heroicons/vue/24/outline'
import type { DailyExercise, User } from '@/types'

const router = useRouter()
const auth = useAuthStore()

type ViewMode = 'loading' | 'answering' | 'done' | 'cooldown' | 'no-exercises' | 'error'

const mode = ref<ViewMode>('loading')
const exercise = ref<DailyExercise | null>(null)
const user = ref<User | null>(null)
const userId = ref<string | null>(null)
const result = ref<'correct' | 'wrong' | null>(null)
const pointsEarned = ref(0)
const newStreak = ref(0)
const shuffledOptions = ref<string[]>([])
const cooldownSeconds = ref(0)
const lastExerciseQuestion = ref('')
const errorMsg = ref('')
const QUESTION_TIME = 30
let cooldownTimer: number | null = null

const {
    timeLeft, selectedOption, attemptedOptions, isLocked, attemptsUsed,
    isTrueFalse, maxAttempts, attemptsLabel, timerDash,
    stopTimer, resetTimer,
} = useExerciseRunner(QUESTION_TIME, () => handleTimeout(), exercise)

const questionText = computed(() => {
    const content = exercise.value?.content ?? {}
    return String(content.pergunta ?? content.question ?? content.enunciado ?? content.frase ?? 'Pergunta indisponível')
})

const formatCooldown = computed(() => {
    const h = Math.floor(cooldownSeconds.value / 3600)
    const m = Math.floor((cooldownSeconds.value % 3600) / 60)
    const s = cooldownSeconds.value % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const currentStreak = computed(() => user.value?.exercises_daily_streak ?? 0)

const isOptionCorrect = (option: string): boolean =>
    exercise.value ? checkOptionCorrect(exercise.value, option) : false

const handleTimeout = async () => {
    if (isLocked.value) return
    isLocked.value = true
    pointsEarned.value = 0
    newStreak.value = 0
    result.value = 'wrong'
    await saveResult(false)
    window.setTimeout(() => { mode.value = 'done' }, 1500)
}

const handleSelect = async (option: string) => {
    if (isLocked.value) return
    if (attemptedOptions.value.includes(option)) return
    selectedOption.value = option

    const correct = isOptionCorrect(option)

    if (correct) {
        stopTimer()
        isLocked.value = true
        if (attemptsUsed.value === 0) {
            const bonus = currentStreak.value >= 2 ? 10 : 0
            pointsEarned.value = 15 + bonus
            newStreak.value = currentStreak.value + 1
        } else {
            pointsEarned.value = 5
            newStreak.value = 0
        }
        result.value = 'correct'
        await saveResult(true)
        window.setTimeout(() => { mode.value = 'done' }, 1500)
        return
    }

    attemptsUsed.value += 1
    attemptedOptions.value = [...attemptedOptions.value, option]

    if (attemptsUsed.value >= maxAttempts.value) {
        stopTimer()
        isLocked.value = true
        pointsEarned.value = 0
        newStreak.value = 0
        result.value = 'wrong'
        await saveResult(false)
        window.setTimeout(() => { mode.value = 'done' }, 1500)
    }
}

const saveResult = async (isCorrect: boolean) => {
    if (!userId.value || !exercise.value?.daily_exercise_id) return

    await createUserDailyExercise({
        user_id: userId.value,
        daily_exercise_id: exercise.value.daily_exercise_id,
        is_correct: isCorrect,
    })

    const oldPoints = await fetchUserPointsTotal(userId.value).catch(() => auth.points)
    const oldLevel = getLevelProgressFromPoints(oldPoints).level

    const timestamp = new Date().toISOString()
    const recorded = await createUserExercise({
        user_id: userId.value,
        is_correct: isCorrect,
        attempts: attemptsUsed.value,
        points_earned: pointsEarned.value,
        time_spent: QUESTION_TIME - timeLeft.value,
        date: timestamp,
    }).then(() => true).catch((err) => {
        console.error(err)
        return false
    })

    const newPoints = recorded ? oldPoints + pointsEarned.value : oldPoints
    const newLevel = getLevelProgressFromPoints(newPoints).level

    await updateUser(userId.value, { exercises_daily_streak: newStreak.value })
    if (user.value) {
        user.value.exercises_daily_streak = newStreak.value
    }

    auth.setPoints(newPoints)
    if (newLevel > oldLevel) {
        auth.triggerLevelUp(oldLevel, newLevel, newPoints)
    }
}

const startCooldownTimer = (lastDate: string) => {
    const nextTime = new Date(lastDate).getTime() + 24 * 60 * 60 * 1000
    const update = () => {
        cooldownSeconds.value = Math.max(0, Math.floor((nextTime - Date.now()) / 1000))
        if (cooldownSeconds.value <= 0 && cooldownTimer !== null) {
            clearInterval(cooldownTimer)
            cooldownTimer = null
        }
    }
    update()
    cooldownTimer = window.setInterval(update, 1000)
}

onMounted(async () => {
    const storedId = getStoredUserId()
    if (!storedId) {
        router.push('/login')
        return
    }
    userId.value = storedId

    try {
        const [userInfo, userBooks, latestRecord] = await Promise.all([
            fetchUserById(storedId),
            fetchUserBooks(storedId),
            fetchLatestUserDailyExercise(storedId),
        ])
        user.value = userInfo

        if (latestRecord?.date_created) {
            const elapsed = Date.now() - new Date(latestRecord.date_created).getTime()
            if (elapsed < 24 * 60 * 60 * 1000) {
                const lastEx = latestRecord.daily_exercise_id as DailyExercise | null
                if (lastEx?.content) {
                    lastExerciseQuestion.value = String(
                        lastEx.content.pergunta ?? lastEx.content.question ?? lastEx.content.enunciado ?? '',
                    )
                }
                startCooldownTimer(latestRecord.date_created)
                mode.value = 'cooldown'
                return
            }
        }

        const bookIds = userBooks
            .map((ub) => {
                const book = ub.book_id
                return typeof book === 'object' ? book?.book_id : undefined
            })
            .filter((id): id is number => typeof id === 'number')

        if (!bookIds.length) {
            mode.value = 'no-exercises'
            return
        }

        const [dailyExercises, answeredIds] = await Promise.all([
            fetchDailyExercisesForBooks(bookIds),
            fetchAnsweredDailyExerciseIds(storedId),
        ])

        const answeredSet = new Set(answeredIds)
        const unanswered = dailyExercises.filter(
            (ex) => ex.daily_exercise_id != null && !answeredSet.has(ex.daily_exercise_id),
        )

        if (!unanswered.length) {
            mode.value = 'no-exercises'
            return
        }

        const chosen = unanswered[Math.floor(Math.random() * unanswered.length)]!
        exercise.value = chosen
        shuffledOptions.value = chosen.type === 'true-false' ? buildOptions(chosen) : shuffleArray(buildOptions(chosen))
        mode.value = 'answering'
        resetTimer()
    } catch (err) {
        console.error(err)
        errorMsg.value = 'Não foi possível carregar o exercício diário.'
        mode.value = 'error'
    }
})

onUnmounted(() => {
    if (cooldownTimer !== null) clearInterval(cooldownTimer)
})
</script>

<template>
    <section class="daily-runner">
        <header class="runner-header">
            <div class="header-left">
                <h1>Exercício Diário</h1>
                <p class="meta">Uma pergunta por dia para manter o teu streak!</p>
            </div>
            <div class="streak-badge" :class="{ active: currentStreak >= 2 }">
                <FireIcon class="fire-icon" aria-hidden="true" />
                <strong>{{ currentStreak }}</strong>
                <span>Streak</span>
            </div>
        </header>

        <p v-if="mode === 'loading'" class="state">A carregar exercício diário...</p>
        <p v-else-if="mode === 'error'" class="state error">{{ errorMsg }}</p>

        <div v-else-if="mode === 'no-exercises'" class="info-card">
            <h2>Sem exercícios disponíveis</h2>
            <p>Ainda não há exercícios diários para os teus livros. Volta mais tarde!</p>
            <RouterLink to="/app">
                <UiButton variant="outline">Voltar ao Dashboard</UiButton>
            </RouterLink>
        </div>

        <div v-else-if="mode === 'cooldown'" class="info-card cooldown-card">
            <div class="cooldown-timer">
                <span class="cooldown-label">Próximo exercício em</span>
                <strong class="cooldown-value">{{ formatCooldown }}</strong>
            </div>
            <div v-if="lastExerciseQuestion" class="last-question-preview">
                <p class="preview-label">Última pergunta respondida</p>
                <p class="preview-text">{{ lastExerciseQuestion }}</p>
            </div>
            <RouterLink to="/app">
                <UiButton variant="outline">Voltar ao Dashboard</UiButton>
            </RouterLink>
        </div>

        <div v-else-if="mode === 'done'" class="info-card result-card"
            :class="result === 'correct' ? 'result-correct' : 'result-wrong'">
            <div class="result-icon-wrap" :class="result === 'correct' ? 'result-icon--correct' : 'result-icon--wrong'">
                <CheckCircleIcon v-if="result === 'correct'" class="result-icon-svg" aria-hidden="true" />
                <XCircleIcon v-else class="result-icon-svg" aria-hidden="true" />
            </div>
            <h2>{{ result === 'correct' ? 'Resposta Certa!' : 'Resposta Errada' }}</h2>
            <p v-if="result === 'correct'">
                Ganhaste <strong>+{{ pointsEarned }} pontos</strong>!
                <span v-if="newStreak >= 2" class="streak-bonus">
                    Mais <strong>+10 pontos</strong> de bónus pelo streak!
                </span>
            </p>
            <p v-else>Não ganhaste pontos desta vez. O teu streak foi reiniciado.</p>
            <div class="result-streak">
                <FireIcon class="fire-icon" :class="{ active: newStreak >= 2 }" aria-hidden="true" />
                <span>Streak atual: <strong>{{ newStreak }}</strong></span>
            </div>
            <RouterLink to="/app">
                <UiButton variant="primary">Voltar ao Dashboard</UiButton>
            </RouterLink>
        </div>

        <template v-else-if="mode === 'answering' && exercise">
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
                        <div class="question-title">Exercício Diário</div>
                        <div v-if="result" class="result-pill" :class="result">
                            <span class="result-pill__label">{{ result === 'correct' ? 'Certo!' : 'Errado' }}</span>
                            <strong v-if="pointsEarned > 0" class="result-pill__xp">+{{ pointsEarned }} XP</strong>
                        </div>
                        <div v-else-if="!isTrueFalse" class="attempts-pill">{{ attemptsLabel }}</div>
                    </div>
                    <div class="question-divider"></div>
                    <p class="question-text">{{ questionText }}</p>
                </div>
            </div>

            <div class="options options-grid-2">
                <ExerciseOption v-for="(option, index) in shuffledOptions" :key="option" :value="option" :index="index"
                    :selected="selectedOption === option" :attempted="attemptedOptions.includes(option)"
                    :correct="selectedOption === option && isOptionCorrect(option)"
                    :wrong="(selectedOption === option || attemptedOptions.includes(option)) && !isOptionCorrect(option)"
                    :locked="isLocked" @select="handleSelect" />
            </div>
        </template>
    </section>
</template>

<style scoped>
.daily-runner {
    display: grid;
    gap: var(--space-500);
}

.runner-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-300);
    flex-wrap: wrap;
    padding-bottom: var(--space-300);
    border-bottom: 2px solid var(--color-wild-400);
}

.header-left h1 {
    margin: 0 0 4px;
    font-size: 26px;
    font-weight: 800;
    color: var(--color-mirage-800);
}

.meta {
    color: var(--color-mirage-500);
    margin: 0;
    font-size: 13px;
}

.streak-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 14px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 4px 4px 0 rgba(46, 127, 123, 0.35);
    font-weight: 700;
}

.streak-badge.active {
    background: var(--color-teal-200);
}

.streak-badge strong {
    font-size: 20px;
    color: var(--color-mirage-800);
}

.streak-badge span {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-600);
}

.fire-icon {
    width: 20px;
    height: 20px;
    color: var(--color-mirage-500);
    stroke-width: 2;
}

.fire-icon.active {
    color: var(--color-pumpkin-500);
}

.state {
    font-weight: 600;
    color: var(--color-mirage-600);
}

.state.error {
    color: #b13b3b;
}

.info-card {
    border-radius: 16px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 6px 6px 0 rgba(46, 127, 123, 0.35);
    padding: 32px;
    display: grid;
    gap: var(--space-300);
    max-width: 600px;
}

.cooldown-card {
    gap: var(--space-400);
}

.cooldown-timer {
    display: grid;
    gap: 6px;
}

.cooldown-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-500);
    font-weight: 700;
}

.cooldown-value {
    font-size: 40px;
    color: var(--color-mirage-800);
    font-variant-numeric: tabular-nums;
}

.last-question-preview {
    padding: var(--space-300);
    border-radius: 12px;
    background: var(--color-wild-200);
    border: 2px solid var(--color-mirage-800);
    display: grid;
    gap: 8px;
}

.preview-label {
    margin: 0;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-500);
    font-weight: 700;
}

.preview-text {
    margin: 0;
    font-size: 15px;
    color: var(--color-mirage-800);
    font-weight: 600;
}

.result-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    border: 2px solid var(--color-mirage-800);
    font-size: 12px;
    font-weight: 700;
}

.result-badge.correct {
    background: var(--color-deep-100);
    color: var(--color-mirage-800);
}

.result-badge.wrong {
    background: #f7c4c4;
    color: #7a1f1f;
    border-color: #b13b3b;
}

.result-card {
    text-align: center;
    justify-items: center;
}

.result-correct {
    background: var(--color-deep-100);
}

.result-wrong {
    background: #fdf0f0;
}

.result-icon-wrap {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 2px solid var(--color-mirage-800);
    display: grid;
    place-items: center;
    background: var(--color-wild-100);
    box-shadow: 4px 4px 0 var(--color-shadow);
}

.result-icon--correct {
    background: var(--color-deep-100);
}

.result-icon--wrong {
    background: #fbe1e1;
    border-color: #b13b3b;
}

.result-icon-svg {
    width: 32px;
    height: 32px;
    color: var(--color-deep-700);
    stroke-width: 1.5;
}

.result-icon--wrong .result-icon-svg {
    color: #b13b3b;
}

.result-streak {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--color-mirage-600);
}

.streak-bonus {
    font-size: 13px;
    color: var(--color-teal-600);
    font-weight: 700;
}

/* Question card (same as Module.vue) */
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

@media (max-width: 720px) {
    .options-grid-2 {
        grid-template-columns: 1fr;
    }

    .question-text {
        font-size: 18px;
    }
}
</style>
