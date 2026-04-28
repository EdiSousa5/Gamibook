<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import { fetchUserBooks } from '../services/books'
import {
    fetchDailyExercisesForBooks,
    fetchLatestUserDailyExercise,
    fetchAnsweredDailyExerciseIds,
    createUserDailyExercise,
} from '../services/exercises'
import { fetchUserById, updateUser } from '../services/auth'
import { getStoredUserId } from '../services/client'
import { getLevelProgressFromPoints } from '../utils/gamification'
import { FireIcon } from '@heroicons/vue/24/outline'
import type { DailyExercise, User } from '@/types'

const router = useRouter()

type ViewMode = 'loading' | 'answering' | 'done' | 'cooldown' | 'no-exercises' | 'error'

const mode = ref<ViewMode>('loading')
const exercise = ref<DailyExercise | null>(null)
const user = ref<User | null>(null)
const userId = ref<string | null>(null)
const selectedOption = ref<string | null>(null)
const attemptedOptions = ref<string[]>([])
const isLocked = ref(false)
const result = ref<'correct' | 'wrong' | null>(null)
const pointsEarned = ref(0)
const newStreak = ref(0)
const shuffledOptions = ref<string[]>([])
const attemptsUsed = ref(0)
const cooldownSeconds = ref(0)
const lastExerciseQuestion = ref('')
const errorMsg = ref('')
const QUESTION_TIME = 30
const timeLeft = ref(QUESTION_TIME)
let cooldownTimer: number | null = null
let timerId: number | null = null

const questionText = computed(() => {
    const content = exercise.value?.content || {}
    return content.pergunta || content.question || content.enunciado || content.frase || 'Pergunta indisponível'
})

const isTrueFalse = computed(() => exercise.value?.type === 'true-false')

const formatCooldown = computed(() => {
    const h = Math.floor(cooldownSeconds.value / 3600)
    const m = Math.floor((cooldownSeconds.value % 3600) / 60)
    const s = cooldownSeconds.value % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const currentStreak = computed(() => user.value?.exercises_daily_streak ?? 0)
const maxAttempts = computed(() => (isTrueFalse.value ? 1 : 2))
const attemptsLabel = computed(() =>
    isTrueFalse.value
        ? '1 tentativa'
        : `${Math.max(0, maxAttempts.value - attemptsUsed.value)} tentativa${maxAttempts.value - attemptsUsed.value === 1 ? '' : 's'}`,
)
const timerCircumference = 2 * Math.PI * 26
const timerDash = computed(() => {
    const ratio = Math.max(0, Math.min(1, timeLeft.value / QUESTION_TIME))
    return `${timerCircumference * ratio} ${timerCircumference}`
})

const toOptionArray = (value: any): string[] => {
    if (Array.isArray(value)) return value.map((item) => String(item))
    if (!value) return []
    return String(value).split(/\n|;/).map((item) => item.trim()).filter(Boolean)
}

const toBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value
    const normalized = String(value || '').trim().toLowerCase()
    return ['true', 'verdadeiro', 'v', 'sim', 'yes'].includes(normalized)
}

const shuffleArray = <T,>(arr: T[]): T[] => {
    const result = [...arr]
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = result[i] as T
        result[i] = result[j] as T
        result[j] = temp
    }
    return result
}

const getOptionLetter = (value: string) =>
    String(value || '').trim().match(/^([A-F])\)/i)?.[1]?.toUpperCase() || ''

const getOptionText = (value: string) =>
    String(value || '').trim().replace(/^[A-F]\)\s*/i, '')

const buildOptions = (ex: DailyExercise): string[] => {
    if (ex.type === 'true-false') return ['Falso', 'Verdadeiro']
    const rawOptions = toOptionArray(ex.content?.opcoes || ex.content?.options)
    if (rawOptions.length <= 4) return rawOptions
    const correctValue = String(ex.content?.resposta_correta || '').trim().toUpperCase()
    const correctOption =
        rawOptions.find((o) => getOptionLetter(o) === correctValue) ||
        rawOptions.find((o) => String(o || '').trim().toUpperCase() === correctValue)
    if (!correctOption) return shuffleArray(rawOptions).slice(0, 4)
    const wrongOptions = rawOptions.filter((o) => o !== correctOption)
    if (wrongOptions.length < 3) return shuffleArray(rawOptions).slice(0, 4)
    return shuffleArray([correctOption, ...shuffleArray(wrongOptions).slice(0, 3)])
}

const isOptionCorrect = (option: string): boolean => {
    if (!exercise.value) return false
    if (isTrueFalse.value) {
        const normalized = String(option || '').trim().toLowerCase()
        const expected = toBoolean(exercise.value.content?.resposta_correta)
        return expected ? normalized.startsWith('verd') : normalized.startsWith('fals')
    }
    const correct = String(exercise.value.content?.resposta_correta || '').trim()
    const optionLetter = getOptionLetter(option)
    if (optionLetter && correct.toUpperCase()) return optionLetter === correct.toUpperCase()
    return String(option || '').trim() === correct
}

const stopTimer = () => {
    if (timerId !== null) {
        window.clearInterval(timerId)
        timerId = null
    }
}

const resetTimer = () => {
    stopTimer()
    timeLeft.value = QUESTION_TIME
    timerId = window.setInterval(() => {
        if (timeLeft.value <= 0) {
            stopTimer()
            handleTimeout()
            return
        }
        timeLeft.value -= 1
    }, 1000)
}

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

    const oldPoints = user.value?.points ?? 0
    const newPoints = oldPoints + pointsEarned.value
    const oldLevel = getLevelProgressFromPoints(oldPoints).level
    const newLevel = getLevelProgressFromPoints(newPoints).level

    await updateUser(userId.value, { points: newPoints, exercises_daily_streak: newStreak.value })
    if (user.value) {
        user.value.points = newPoints
        user.value.exercises_daily_streak = newStreak.value
    }

    window.dispatchEvent(new Event('gb-auth-changed'))
    if (newLevel > oldLevel) {
        window.dispatchEvent(new CustomEvent('gb-level-up', { detail: { oldLevel, newLevel, currentPoints: newPoints } }))
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
                    lastExerciseQuestion.value =
                        lastEx.content.pergunta || lastEx.content.question || lastEx.content.enunciado || ''
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
    stopTimer()
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
            <div class="result-icon">{{ result === 'correct' ? '✓' : '✗' }}</div>
            <h2>{{ result === 'correct' ? 'Resposta Certa!' : 'Resposta Errada' }}</h2>
            <p v-if="result === 'correct'">
                Ganhaste <strong>+{{ pointsEarned }} pontos</strong>!
                <span v-if="newStreak >= 2" class="streak-bonus">
                    (ganhas-te mais <strong>+10 pontos</strong> graças ao teu streak!)
                </span>
            </p>
            <p v-else>Não ganhaste pontos. O teu streak foi reiniciado.</p>
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
                    <div v-if="result" class="question-feedback" :class="result">
                        <span class="feedback-title">
                            {{ result === 'correct' ? 'Certo!' : 'Errado' }}
                        </span>
                        <span class="feedback-points">
                            {{ pointsEarned > 0 ? `+${pointsEarned} XP` : '0 XP' }}
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
                        <div class="question-title">Exercício Diário</div>
                        <div v-if="!isTrueFalse" class="attempts-pill">{{ attemptsLabel }}</div>
                    </div>
                    <div class="question-divider"></div>
                    <p class="question-text">{{ questionText }}</p>
                </div>
            </div>

            <div class="options options-grid-2">
                <button v-for="(option, index) in shuffledOptions" :key="option" class="option" :class="{
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
        </template>
    </section>
</template>

<style scoped>
.daily-runner {
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

.header-left h1 {
    margin: 0 0 4px;
    font-size: 26px;
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

.result-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 2px solid var(--color-mirage-800);
    display: grid;
    place-items: center;
    font-size: 28px;
    font-weight: 700;
    background: var(--color-wild-100);
    box-shadow: 4px 4px 0 rgba(46, 127, 123, 0.35);
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

/* Options (same as Module.vue) */
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
.option.attempted .letter-shadow {
    opacity: 0;
}

.option:active .letter-face,
.option.selected .letter-face,
.option.attempted .letter-face {
    transform: translate(var(--option-press-x), var(--option-press-y));
}

.option:active .letter-text,
.option.selected .letter-text,
.option.attempted .letter-text {
    transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.selected .option-panel { background: var(--color-teal-500); }
.option.selected .option-shadow { background: var(--color-deep-1000); }
.option.selected .letter-face { background: var(--color-deep-200); }
.option.selected .option-text { color: var(--color-wild-100); }

.option.correct .option-panel { background: var(--color-deep-600); }

.option.wrong .option-panel { background: #f7c4c4; border-color: #b13b3b; }
.option.wrong .letter-face { background: #fbe1e1; border-color: #b13b3b; }
.option.wrong .letter-shadow { background: #b13b3b; }
.option.wrong .letter-text { color: #7a1f1f; }
.option.wrong .option-text { color: #7a1f1f; }

.option.locked { cursor: not-allowed; }

.option.attempted .option-panel { transform: translate(var(--option-press-x), var(--option-press-y)); }

@keyframes feedback-pop {
    0% { transform: translateY(-6px) scale(0.95); opacity: 0; }
    60% { transform: translateY(0) scale(1.02); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
}

@media (max-width: 720px) {
    .options-grid-2 {
        grid-template-columns: 1fr;
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
}
</style>
