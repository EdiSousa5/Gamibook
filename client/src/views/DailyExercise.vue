<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import ExerciseOption from '@/components/ui/ExerciseOption.vue'
import { shuffleArray, buildOptions, isOptionCorrect as checkOptionCorrect } from '@/utils/exerciseUtils'
import { fetchUserBooks, fetchModulesByBooks } from '../services/books'
import {
    fetchLatestUserDailyExercise,
    fetchUsedDailyExerciseIds,
    fetchUserAttemptedExerciseIds,
    fetchExercisesByIds,
    createUserDailyExercise,
    fetchUserPointsFromHistory,
    createUserPointsHistory,
} from '../services/exercises'
import { fetchUserById, updateUser } from '../services/auth'
import { getStoredUserId } from '../services/client'
import { getLevelProgressFromPoints } from '../utils/gamification'
import { useAuthStore } from '@/stores/auth'
import { useExerciseRunner } from '@/composables/useExerciseRunner'
import { FEEDBACK_DELAY_MS } from '@/utils/timing'
import { CheckCircleIcon, ExclamationTriangleIcon, FireIcon, LockClosedIcon, XCircleIcon } from '@heroicons/vue/24/outline'
import UiResultPill from '@/components/ui/UiResultPill.vue'
import QuestionCard from '@/components/ui/QuestionCard.vue'
import type { Exercise, User } from '@/types'
import { useToast } from '@/composables/useToast'
import { useNotificationsStore } from '@/stores/notifications'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const notifStore = useNotificationsStore()

const DAILY_UNLOCK_LEVEL = 3

type ViewMode = 'loading' | 'answering' | 'done' | 'cooldown' | 'locked' | 'no-exercises' | 'error'

const mode = ref<ViewMode>('loading')
const exercise = ref<Exercise | null>(null)
const user = ref<User | null>(null)
const userId = ref<string | null>(null)
const result = ref<'correct' | 'wrong' | null>(null)
const pointsEarned = ref(0)
const newStreak = ref(0)
const shuffledOptions = ref<string[]>([])
const cooldownSeconds = ref(0)
const lastExerciseQuestion = ref('')
const errorMsg = ref('')
const exerciseBookTitle = ref('')
const streakWasReset = ref(false)
const elapsedTimeLabel = ref('')
const leaveModalOpen = ref(false)
const pendingNavTarget = ref('/app')
const QUESTION_TIME = 30
let cooldownTimer: number | null = null

const buildElapsedLabel = (dateStr: string): string => {
    const elapsed = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(elapsed / 60_000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    if (days >= 2) return `há ${days} dias`
    if (days === 1) return 'ontem'
    if (hours >= 1) return `há ${hours}h ${minutes % 60}min`
    if (minutes >= 1) return `há ${minutes} min`
    return 'agora mesmo'
}

const {
    timeLeft, selectedOption, attemptedOptions, isLocked, attemptsUsed,
    isTrueFalse, maxAttempts, attemptsLabel, timerDash,
    stopTimer, resetTimer,
} = useExerciseRunner(QUESTION_TIME, () => handleTimeout(), exercise)

const questionText = computed(() => {
    const content = exercise.value?.content ?? {}
    return String(content.pergunta ?? content.question ?? content.enunciado ?? content.frase ?? 'Pergunta indisponível')
})

const correctAnswer = computed(() =>
    shuffledOptions.value.find(opt => exercise.value ? checkOptionCorrect(exercise.value, opt) : false) ?? '—'
)

const formatCooldown = computed(() => {
    const h = Math.floor(cooldownSeconds.value / 3600)
    const m = Math.floor((cooldownSeconds.value % 3600) / 60)
    const s = cooldownSeconds.value % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const currentStreak = computed(() => user.value?.exercises_daily_streak ?? 0)

const isStreakAnimating = ref(false)
watch(currentStreak, (newVal: number, oldVal: number) => {
    if (newVal > oldVal) {
        isStreakAnimating.value = true
        window.setTimeout(() => { isStreakAnimating.value = false }, 800)
    }
})

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
            const bonus = currentStreak.value >= 2 ? 5 : 0
            pointsEarned.value = 10 + bonus
            newStreak.value = currentStreak.value + 1
        } else {
            pointsEarned.value = 5
            newStreak.value = currentStreak.value
        }
        result.value = 'correct'
        await saveResult(true)
        window.setTimeout(() => { mode.value = 'done' }, FEEDBACK_DELAY_MS)
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
        window.setTimeout(() => { mode.value = 'done' }, FEEDBACK_DELAY_MS)
    }
}

const saveResult = async (isCorrect: boolean) => {
    if (!userId.value || !exercise.value?.exercise_id) return

    await createUserDailyExercise({
        user_id: userId.value,
        exercise_id: exercise.value.exercise_id,
        is_correct: isCorrect,
    })

    const oldPoints = await fetchUserPointsFromHistory(userId.value).catch(() => auth.points)
    const oldLevel = getLevelProgressFromPoints(oldPoints).level

    if (pointsEarned.value > 0) {
        await createUserPointsHistory({
            user_id: userId.value,
            points: pointsEarned.value,
            source: 'daily',
            reference_id: exercise.value.exercise_id,
        }).catch(() => console.error('Failed to save points history'))
    }

    const newPoints = oldPoints + pointsEarned.value
    const newLevel = getLevelProgressFromPoints(newPoints).level

    const streakChanged = newStreak.value !== currentStreak.value
    if (streakChanged) {
        const currentBest = user.value?.best_exercises_daily_streak ?? 0
        const newBest = newStreak.value > currentBest ? newStreak.value : currentBest
        const userPatch: Record<string, unknown> = { exercises_daily_streak: newStreak.value }
        if (newBest > currentBest) userPatch.best_exercises_daily_streak = newBest

        await updateUser(userId.value, userPatch)
        if (user.value) {
            user.value.exercises_daily_streak = newStreak.value
            if (newBest > currentBest) user.value.best_exercises_daily_streak = newBest
        }
        if (auth.user) {
            auth.user.exercises_daily_streak = newStreak.value
            if (newBest > currentBest) auth.user.best_exercises_daily_streak = newBest
        }
    }

    auth.setPoints(newPoints)
    if (newLevel > oldLevel) {
        auth.triggerLevelUp(oldLevel, newLevel, newPoints)
        notifStore.add({
            user: userId.value!,
            title: `Subiste para o nível ${newLevel}!`,
            message: `Parabéns! Chegaste ao nível ${newLevel} com ${newPoints} XP no total.`,
            type: 'achievement',
        })
    }

    if (isCorrect) {
        const streakMsg = newStreak.value > 0
            ? ` Streak atual: ${newStreak.value} ${newStreak.value === 1 ? 'dia' : 'dias'}.`
            : ''
        toast.success(`+${pointsEarned.value} XP ganhos no desafio diário!${streakMsg}`)
        notifStore.add({
            user: userId.value!,
            title: 'Desafio diário concluído!',
            message: `Ganhaste ${pointsEarned.value} XP.${newStreak.value >= 2 ? ` Streak de ${newStreak.value} dias!` : ''}`,
            type: 'achievement',
        })
    } else {
        toast.info('Sem sorte desta vez. Tenta novamente amanhã.')
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

const confirmLeave = async () => {
    leaveModalOpen.value = false
    stopTimer()
    isLocked.value = true
    pointsEarned.value = 0
    newStreak.value = 0
    result.value = 'wrong'
    await saveResult(false)
    router.push(pendingNavTarget.value)
}

const cancelLeave = () => {
    leaveModalOpen.value = false
}

onBeforeRouteLeave((to, _from, next) => {
    if (mode.value === 'answering' && !isLocked.value) {
        pendingNavTarget.value = to.fullPath
        leaveModalOpen.value = true
        next(false)
        return
    }
    next()
})

onMounted(async () => {
    const storedId = getStoredUserId()
    if (!storedId) {
        router.push('/login')
        return
    }
    userId.value = storedId

    try {
        const [userInfo, userBooks] = await Promise.all([
            fetchUserById(storedId),
            fetchUserBooks(storedId),
        ])
        user.value = userInfo

        // Verificar se o utilizador atingiu o nível mínimo para desbloquear o desafio diário
        const userLevel = getLevelProgressFromPoints(auth.points).level
        if (userLevel < DAILY_UNLOCK_LEVEL) {
            mode.value = 'locked'
            return
        }

        // Verificar se já fez o desafio nas últimas 24h
        const latestRecord = await fetchLatestUserDailyExercise(storedId)
        const lastDateStr = latestRecord?.date_created ?? null

        if (lastDateStr) {
            elapsedTimeLabel.value = buildElapsedLabel(lastDateStr)
            const elapsed = Date.now() - new Date(lastDateStr).getTime()
            const ONE_DAY = 24 * 60 * 60 * 1000

            if (elapsed < ONE_DAY) {
                // Ainda em cooldown — mostrar a última pergunta
                const lastEx = latestRecord?.exercise_id as Exercise | null
                if (lastEx?.content) {
                    lastExerciseQuestion.value = String(
                        lastEx.content.pergunta ?? lastEx.content.question ?? lastEx.content.enunciado ?? '',
                    )
                }
                startCooldownTimer(lastDateStr)
                mode.value = 'cooldown'
                return
            } else if (elapsed >= 2 * ONE_DAY) {
                // Faltou mais de um dia — reset streak
                const currentStreakVal = userInfo.exercises_daily_streak ?? 0
                if (currentStreakVal > 0) {
                    await updateUser(storedId, { exercises_daily_streak: 0 })
                    userInfo.exercises_daily_streak = 0
                    if (user.value) user.value.exercises_daily_streak = 0
                    if (auth.user) auth.user.exercises_daily_streak = 0
                    streakWasReset.value = true
                    toast.warning('O teu streak foi reiniciado por não teres feito o desafio diário a tempo.')
                }
            }
        }

        // Obter livros e módulos do utilizador
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

        const modules = await fetchModulesByBooks(bookIds)
        const moduleIds = modules.map((m) => m.modules_id).filter((id): id is number => id != null)

        if (!moduleIds.length) {
            mode.value = 'no-exercises'
            return
        }

        // Exercícios tentados pelo utilizador nos módulos dos seus livros
        const attemptedIds = await fetchUserAttemptedExerciseIds(storedId, moduleIds)

        if (!attemptedIds.length) {
            mode.value = 'no-exercises'
            return
        }

        // IDs já usados como diário
        const usedDailyIds = await fetchUsedDailyExerciseIds(storedId)
        const usedSet = new Set(usedDailyIds)

        // Pool: tentados menos os já usados como diário
        // Se todos já foram usados, recomeçar o ciclo
        let pool = attemptedIds.filter((id) => !usedSet.has(id))
        if (!pool.length) {
            pool = attemptedIds
        }

        // Buscar detalhes dos exercícios do pool e escolher aleatório
        const exercises = await fetchExercisesByIds(pool)

        if (!exercises.length) {
            mode.value = 'no-exercises'
            return
        }

        const chosen = exercises[Math.floor(Math.random() * exercises.length)]!
        exercise.value = chosen

        const chosenModule = modules.find(m => m.modules_id === chosen.id_module)
        if (chosenModule) {
            const matchingUb = userBooks.find(ub => {
                const bid = typeof ub.book_id === 'object' ? (ub.book_id as any)?.book_id : ub.book_id
                return bid === chosenModule.id_book
            })
            if (matchingUb && typeof matchingUb.book_id === 'object') {
                exerciseBookTitle.value = (matchingUb.book_id as any)?.title ?? ''
            }
        }

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
            <div class="streak-area">
                <div class="streak-badge" :class="{ active: currentStreak >= 2, 'streak-animate-fire': isStreakAnimating }">
                    <FireIcon class="fire-icon" :class="{ active: currentStreak >= 2 }" aria-hidden="true" />
                    <strong>{{ currentStreak }}</strong>
                    <span>Streak</span>
                </div>
                <p v-if="elapsedTimeLabel" class="last-attempt-label">Última vez: {{ elapsedTimeLabel }}</p>
            </div>
        </header>

        <div v-if="streakWasReset" class="streak-reset-banner">
            <ExclamationTriangleIcon class="streak-reset-icon" aria-hidden="true" />
            O teu streak foi reiniciado. Faz o exercício de hoje para recomeçar!
        </div>

        <p v-if="mode === 'loading'" class="state">A carregar exercício diário...</p>
        <p v-else-if="mode === 'error'" class="state error">{{ errorMsg }}</p>

        <div v-else-if="mode === 'locked'" class="info-card locked-card">
            <div class="locked-icon-wrap">
                <LockClosedIcon class="locked-icon" aria-hidden="true" />
            </div>
            <h2>Desafio Diário Bloqueado</h2>
            <p>Os desafios diários desbloqueiam ao atingir o <strong>nível {{ DAILY_UNLOCK_LEVEL }}</strong>. Completa exercícios nos módulos dos teus livros para subir de nível!</p>
            <div class="locked-progress">
                <span class="locked-progress-label">Nível atual: {{ auth.progress.level }} / {{ DAILY_UNLOCK_LEVEL }}</span>
            </div>
            <RouterLink to="/collection">
                <UiButton variant="primary">Ver Livros</UiButton>
            </RouterLink>
        </div>

        <div v-else-if="mode === 'no-exercises'" class="info-card">
            <h2>Sem exercícios disponíveis</h2>
            <p>Ainda não tens exercícios suficientes para o desafio diário. Completa alguns módulos dos teus livros primeiro!</p>
            <RouterLink to="/collection">
                <UiButton variant="outline">Explorar Livros</UiButton>
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

        <div v-else-if="mode === 'done'" class="done-wrapper">
            <!-- Esquerda: recap da pergunta e resposta -->
            <div class="done-recap">
                <span class="done-recap__kicker">Pergunta de hoje</span>
                <p class="done-recap__question">{{ questionText }}</p>
                <div class="done-recap__answer" :class="result === 'correct' ? 'done-recap__answer--correct' : 'done-recap__answer--wrong'">
                    <span class="done-recap__answer-label">Resposta correta</span>
                    <strong class="done-recap__answer-text">{{ correctAnswer }}</strong>
                </div>
                <div v-if="result === 'wrong' && selectedOption" class="done-recap__yours">
                    <span class="done-recap__answer-label">A tua resposta</span>
                    <strong class="done-recap__yours-text">{{ selectedOption }}</strong>
                </div>
            </div>

            <!-- Direita: cartão de resultado -->
            <div class="done-card" :class="result === 'correct' ? 'done-correct' : 'done-wrong'">
                <div class="done-result-header">
                    <div class="done-icon-wrap" :class="result === 'correct' ? 'done-icon--correct' : 'done-icon--wrong'">
                        <CheckCircleIcon v-if="result === 'correct'" class="done-icon-svg" aria-hidden="true" />
                        <XCircleIcon v-else class="done-icon-svg" aria-hidden="true" />
                    </div>
                    <div class="done-verdict">
                        <h2 class="done-title">{{ result === 'correct' ? 'Resposta Certa!' : 'Resposta Errada' }}</h2>
                        <p class="done-desc" v-if="result === 'correct'">Continua assim e mantém o teu streak!</p>
                        <p class="done-desc" v-else>Não foi desta vez. Amanhã é outro dia!</p>
                    </div>
                </div>

                <div class="done-stats">
                    <div class="done-stat" :class="{ 'done-stat--highlight': pointsEarned > 0 }">
                        <span class="done-stat__label">Pontos ganhos</span>
                        <strong class="done-stat__value">+{{ pointsEarned }}</strong>
                    </div>
                    <div class="done-stat done-stat--streak" :class="{ 'done-stat--active': newStreak >= 2 }">
                        <FireIcon class="done-stat__icon" :class="{ active: newStreak >= 2 }" aria-hidden="true" />
                        <span class="done-stat__label">Streak atual</span>
                        <strong class="done-stat__value">{{ newStreak }}</strong>
                    </div>
                </div>

                <div v-if="result === 'correct' && newStreak >= 2" class="streak-bonus-banner">
                    <FireIcon class="streak-bonus-icon" aria-hidden="true" />
                    Bónus de streak: <strong>+5 pontos extra</strong> por {{ newStreak }} dias seguidos!
                </div>

                <RouterLink to="/app">
                    <UiButton variant="primary" size="lg">Voltar ao Dashboard</UiButton>
                </RouterLink>
            </div>
        </div>

        <!-- Modal de aviso ao sair -->
        <div v-if="leaveModalOpen" class="leave-overlay" @click.self="cancelLeave">
            <div class="leave-modal" role="dialog" aria-modal="true">
                <div class="leave-modal-icon">
                    <ExclamationTriangleIcon class="leave-warn-icon" aria-hidden="true" />
                </div>
                <h3>Tens a certeza que queres sair?</h3>
                <p>Se saíres agora, o exercício ficará marcado como <strong>errado</strong> e o teu streak será <strong>quebrado</strong>.</p>
                <div class="leave-actions">
                    <UiButton variant="outline" size="sm" @click="cancelLeave">Ficar</UiButton>
                    <UiButton variant="primary" size="sm" @click="confirmLeave">Sair mesmo assim</UiButton>
                </div>
            </div>
        </div>

        <template v-else-if="mode === 'answering' && exercise">
            <QuestionCard :question-text="questionText" :time-left="timeLeft" :timer-dash="timerDash">
                <template #label>{{ exerciseBookTitle || 'Exercício Diário' }}</template>
                <template #actions>
                    <UiResultPill v-if="result" :result="result" :points="pointsEarned" />
                    <div v-else-if="!isTrueFalse" class="attempts-pill">{{ attemptsLabel }}</div>
                </template>
            </QuestionCard>

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

.meta {
    color: var(--color-mirage-500);
    margin: 0;
    font-size: 13px;
}

.streak-area {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
}

.last-attempt-label {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-mirage-500);
    text-align: right;
}

.streak-reset-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    border-radius: 12px;
    border: 2px solid var(--color-amber-500, #f59e0b);
    background: var(--color-amber-50, #fffbeb);
    font-size: 14px;
    font-weight: 600;
    color: var(--color-mirage-800);
    box-shadow: 4px 4px 0 rgba(245, 158, 11, 0.25);
}

.streak-reset-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: var(--color-amber-500, #f59e0b);
    stroke-width: 2;
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
    color: var(--color-error-strong);
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

/* Locked state */
.locked-card {
    place-items: center;
    text-align: center;
}

.locked-icon-wrap {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-200);
    display: grid;
    place-items: center;
    box-shadow: 4px 4px 0 var(--color-shadow);
}

.locked-icon {
    width: 36px;
    height: 36px;
    color: var(--color-mirage-500);
    stroke-width: 1.5;
}

.locked-progress {
    padding: 10px 20px;
    border-radius: 10px;
    background: var(--color-wild-200);
    border: 2px solid var(--color-mirage-300);
}

.locked-progress-label {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-mirage-700);
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

/* Done wrapper */
.done-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-400);
    align-items: start;
}

.done-recap {
    border-radius: 16px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-200);
    box-shadow: 8px 8px 0 rgba(46, 127, 123, 0.35);
    padding: 28px;
    display: grid;
    gap: var(--space-300);
}

.done-recap__kicker {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--color-mirage-500);
}

.done-recap__question {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--color-mirage-900);
    line-height: 1.45;
}

.done-recap__answer,
.done-recap__yours {
    padding: 14px 16px;
    border-radius: 12px;
    border: 2px solid var(--color-mirage-800);
    display: grid;
    gap: 4px;
}

.done-recap__answer--correct {
    background: var(--color-deep-100);
    border-color: var(--color-deep-600);
}

.done-recap__answer--wrong {
    background: var(--color-deep-100);
    border-color: var(--color-deep-600);
}

.done-recap__yours {
    background: var(--color-error-muted);
    border-color: var(--color-red-500);
}

.done-recap__answer-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-500);
}

.done-recap__answer-text {
    font-size: 16px;
    font-weight: 800;
    color: var(--color-deep-800, #0f4f4c);
}

.done-recap__yours-text {
    font-size: 16px;
    font-weight: 800;
    color: var(--color-error-strong);
}

.done-card {
    border-radius: 16px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 8px 8px 0 rgba(46, 127, 123, 0.35);
    padding: 32px;
    display: grid;
    gap: var(--space-400);
    max-width: 560px;
    animation: card-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.done-correct {
    border-color: var(--color-deep-600);
    background: var(--color-deep-200, #b8e8e4);
}

.done-wrong {
    border-color: var(--color-red-500);
    background: var(--color-error-muted);
}

.done-result-header {
    display: flex;
    align-items: center;
    gap: var(--space-400);
}

.done-icon-wrap {
    flex-shrink: 0;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    border: 2px solid var(--color-mirage-800);
    display: grid;
    place-items: center;
    box-shadow: 4px 4px 0 var(--color-shadow);
}

.done-icon--correct {
    background: var(--color-deep-200, #b8e8e4);
}

.done-icon--wrong {
    background: var(--color-error-muted);
    border-color: var(--color-red-500);
}

.done-icon-svg {
    width: 36px;
    height: 36px;
    stroke-width: 1.5;
    color: var(--color-deep-700);
}

.done-icon--wrong .done-icon-svg {
    color: var(--color-error-strong);
}

.done-verdict {
    display: grid;
    gap: 4px;
}

.done-title {
    margin: 0;
    font-size: 24px;
    font-weight: 800;
    color: var(--color-mirage-900);
}

.done-desc {
    margin: 0;
    font-size: 14px;
    color: var(--color-mirage-500);
}

.done-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-300);
}

.done-stat {
    padding: 16px;
    border-radius: 14px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 4px 4px 0 var(--color-shadow);
    display: grid;
    gap: 4px;
    position: relative;
}

.done-stat--highlight {
    background: var(--color-deep-100);
}

.done-stat--streak {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.done-stat--active {
    background: var(--color-teal-100);
}

.done-stat__icon {
    width: 20px;
    height: 20px;
    color: var(--color-mirage-400);
    stroke-width: 2;
    margin-bottom: 4px;
}

.done-stat__icon.active {
    color: var(--color-pumpkin-500);
}

.done-stat__label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-500);
}

.done-stat__value {
    font-size: 32px;
    font-weight: 800;
    color: var(--color-mirage-800);
    line-height: 1;
}

.streak-bonus-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 12px;
    border: 2px solid var(--color-deep-600);
    background: var(--color-deep-200, #b8e8e4);
    font-size: 13px;
    font-weight: 600;
    color: var(--color-mirage-800);
}

.streak-bonus-icon {
    width: 18px;
    height: 18px;
    color: var(--color-deep-700);
    stroke-width: 2;
    flex-shrink: 0;
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

.leave-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 29, 32, 0.4);
    display: grid;
    place-items: center;
    z-index: 9999;
}

.leave-modal {
    width: min(440px, 92vw);
    background: var(--color-wild-100);
    border: 2px solid var(--color-mirage-800);
    border-radius: 18px;
    box-shadow: 6px 6px 0 var(--color-shadow);
    padding: var(--space-500);
    display: grid;
    gap: var(--space-300);
    text-align: center;
    place-items: center;
}

.leave-modal-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--color-amber-50, #fffbeb);
    border: 2px solid var(--color-amber-500, #f59e0b);
    box-shadow: 3px 3px 0 rgba(245, 158, 11, 0.25);
    display: grid;
    place-items: center;
}

.leave-warn-icon {
    width: 32px;
    height: 32px;
    color: var(--color-amber-500, #f59e0b);
    stroke-width: 1.8;
}

.leave-modal h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    color: var(--color-mirage-900);
}

.leave-modal p {
    margin: 0;
    font-size: 14px;
    color: var(--color-mirage-600);
    line-height: 1.5;
    max-width: 320px;
}

.leave-actions {
    display: flex;
    gap: var(--space-300);
    justify-content: center;
    margin-top: var(--space-100);
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

@keyframes badge-fire-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.1) rotate(-2deg); filter: drop-shadow(0 0 8px rgba(255, 138, 80, 0.6)); border-color: var(--color-pumpkin-500); }
    100% { transform: scale(1); }
}
@keyframes icon-fire-pop {
    0% { transform: scale(1) rotate(0deg); }
    40% { transform: scale(1.5) rotate(-15deg); color: var(--color-amber-500); }
    70% { transform: scale(1.2) rotate(10deg); color: var(--color-pumpkin-500); }
    100% { transform: scale(1) rotate(0deg); }
}
.streak-animate-fire {
    animation: badge-fire-pop 0.6s ease;
}
.streak-animate-fire .fire-icon {
    animation: icon-fire-pop 0.6s ease;
}

@media (max-width: 860px) {
    .done-wrapper {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 720px) {
    .options-grid-2 {
        grid-template-columns: 1fr;
    }
}
</style>
