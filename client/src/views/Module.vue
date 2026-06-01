<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiConfirmModal from '@/components/ui/UiConfirmModal.vue'
import ExerciseOption from '@/components/ui/ExerciseOption.vue'
import BadgeUnlockModal from '@/components/ui/BadgeUnlockModal.vue'
import ConfettiOverlay from '@/components/ui/ConfettiOverlay.vue'
import { BoltIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useToast } from '@/composables/useToast'
import { FireIcon } from '@heroicons/vue/24/solid'
import QuestionCard from '@/components/ui/QuestionCard.vue'
import { isOptionCorrect as checkOptionCorrect, getQuestionText } from '@/utils/exerciseUtils'
import { useExerciseRunner } from '@/composables/useExerciseRunner'
import UiResultPill from '@/components/ui/UiResultPill.vue'
import UiStatCard from '@/components/ui/UiStatCard.vue'
import { useModuleSession } from '@/composables/useModuleSession'
import type { SessionMode } from '@/composables/useModuleSession'
import { FEEDBACK_DELAY_MS } from '@/utils/timing'
import { useBadgeQueue } from '@/composables/useBadgeQueue'

const route = useRoute()
const bookId = computed(() => Number(route.params.bookId || 1))
const moduleId = computed(() => Number(route.params.moduleId || 1))
const QUESTION_TIME = 30

const {
    book, moduleData, exercises, allExercises, error, isLoading,
    currentIndex, isCompleted, isSaving, correctStreak, userId,
    sessionPoints, xpDelta, xpPulse, streakDelta, streakAnimState,
    feedback, shuffledOptionsByExercise,
    viewState, selectedMode, isLevelUpQueued, pendingResults, initialBadge,
    currentExercise,
    modeLabel,
    canStartMode, recommendedMode, currentExerciseStatus,
    summary, completionStats, exerciseResults,
    awardXp, recordResult, showFeedback,
    resetSessionState, startSession, persistResults,
    loadData,
} = useModuleSession(bookId, moduleId)

const {
    timeLeft, selectedOption, attemptedOptions, isLocked, attemptsUsed,
    isTrueFalse, maxAttempts, attemptsLabel, timerDash,
    stopTimer, resetQuestionState,
} = useExerciseRunner(QUESTION_TIME, () => handleTimeout(), currentExercise)

const { showBadgeModal, earnedBadgeTier, runBadgeCheck, handleBadgeModalClose } =
    useBadgeQueue(userId, bookId, isLevelUpQueued, initialBadge)

const currentQuestionText = computed(() =>
    currentExercise.value ? getQuestionText(currentExercise.value) : '',
)

const isCurrentEligible = computed(() => currentExerciseStatus.value === 'new')

const toast = useToast()
const showConfetti = computed(() => completionStats.value.successRate >= 70)

watch(viewState, (state) => {
    if (state !== 'summary') return
    const rate = completionStats.value.successRate
    if (rate >= 90) toast.success('Incrível! Dominaste este módulo!')
    else if (rate >= 70) toast.success('Muito bem! Continua assim!')
    else if (rate >= 50) toast.info('Bom esforço! Podes melhorar!')
    else toast.info('Não desistas! A prática leva à perfeição.')
})

const options = computed(() => {
    if (!currentExercise.value?.exercise_id) return []
    return shuffledOptionsByExercise.value[currentExercise.value.exercise_id] || []
})

const modeFromQuery = computed<SessionMode | null>(() => {
    const raw = String(route.query.mode || '')
    if (raw === 'normal' || raw === 'retry' || raw === 'fresh') return raw
    return null
})

const isOptionCorrect = (option: string) =>
    currentExercise.value ? checkOptionCorrect(currentExercise.value, option) : false

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

const handleCorrect = async () => {
    stopTimer()
    isLocked.value = true
    const eligible = isCurrentEligible.value
    let basePoints = 0
    let bonusPoints = 0
    if (eligible) {
        if (attemptsUsed.value === 0) {
            correctStreak.value += 1
            basePoints = 10
            bonusPoints = correctStreak.value >= 2 ? 5 : 0
        } else {
            correctStreak.value = 0
            basePoints = 5
        }
    }
    const points = eligible ? basePoints + bonusPoints : 0
    recordResult(true, attemptsUsed.value + 1, points, QUESTION_TIME - timeLeft.value)
    awardXp(eligible ? basePoints : 0, eligible ? bonusPoints : 0)
    showFeedback('correct', points)
    window.setTimeout(goNext, FEEDBACK_DELAY_MS)
}

const handleIncorrect = async () => {
    attemptsUsed.value += 1
    if (isCurrentEligible.value) correctStreak.value = 0
    showFeedback('wrong', 0)
    if (attemptsUsed.value < maxAttempts.value) return
    stopTimer()
    isLocked.value = true
    recordResult(false, attemptsUsed.value, 0, QUESTION_TIME - timeLeft.value)
    window.setTimeout(goNext, FEEDBACK_DELAY_MS)
}

const handleTimeout = async () => {
    if (isLocked.value) return
    isLocked.value = true
    if (isCurrentEligible.value) correctStreak.value = 0
    showFeedback('wrong', 0)
    recordResult(false, maxAttempts.value, 0, QUESTION_TIME)
    window.setTimeout(goNext, FEEDBACK_DELAY_MS)
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

const confirmModal = ref<{
    title: string
    message: string
    confirmLabel: string
    cancelLabel?: string
    resolve: (val: boolean) => void
} | null>(null)

const openConfirm = (title: string, message: string, confirmLabel = 'Confirmar', cancelLabel?: string) =>
    new Promise<boolean>((resolve) => {
        confirmModal.value = { title, message, confirmLabel, cancelLabel, resolve }
    })

const handleModalConfirm = () => {
    confirmModal.value?.resolve(true)
    confirmModal.value = null
}

const handleModalCancel = () => {
    confirmModal.value?.resolve(false)
    confirmModal.value = null
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

watch(
    [bookId, moduleId],
    async ([currentBookId, currentModuleId]) => {
        stopTimer()
        resetSessionState()
        await loadData(currentBookId, currentModuleId)
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

onBeforeRouteLeave(() => {
    if (viewState.value !== 'runner' || !pendingResults.value.length) return true
    return openConfirm(
        'Sair do quiz?',
        'Se saíres agora, as respostas desta sessão não serão guardadas.',
        'Sair',
        'Ficar',
    )
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
                <RouterLink :to="`/book/${bookId}`">
                    <UiButton variant="primary">Continuar</UiButton>
                </RouterLink>
            </div>
        </div>

        <div v-else class="runner">
            <div class="runner-stats">
                <UiStatCard
                    :key="xpPulse"
                    label="XP nesta sessao"
                    :value="sessionPoints"
                    :delta="xpDelta > 0 ? `+${xpDelta}` : undefined"
                    :class="{ 'runner-stat--pulse': xpPulse > 0, 'runner-stat--inactive': !isCurrentEligible }"
                >
                    <template #icon><BoltIcon class="stat-icon" aria-hidden="true" /></template>
                </UiStatCard>
                <UiStatCard
                    label="Streak"
                    :value="correctStreak"
                    :delta="streakDelta > 0 ? `+${streakDelta}` : undefined"
                    delta-variant="streak"
                    class="runner-stat--streak"
                    :class="{ 'streak--up': streakAnimState === 'up', 'streak--lost': streakAnimState === 'lost', 'runner-stat--inactive': !isCurrentEligible }"
                >
                    <template #icon><FireIcon class="stat-icon stat-icon--fire" aria-hidden="true" /></template>
                </UiStatCard>
                <UiStatCard label="Pergunta" :value="currentIndex + 1">
                    <template #value>{{ currentIndex + 1 }}<span class="stat-sep"> / {{ exercises.length }}</span></template>
                </UiStatCard>
            </div>

            <QuestionCard :question-text="currentQuestionText" :time-left="timeLeft" :timer-dash="timerDash">
                <template #label>
                    Pergunta <span class="question-num">{{ String(currentIndex + 1).padStart(2, '0') }}</span>
                </template>
                <template #actions>
                    <div class="question-tags">
                        <span v-if="currentExerciseStatus === 'correct'"
                            class="status-pill done">Ja respondido</span>
                        <span v-else-if="currentExerciseStatus === 'wrong'"
                            class="status-pill warn">Falhou antes</span>
                        <span v-if="!isCurrentEligible" class="status-pill no-xp">Sem XP · sem streak</span>
                        <UiResultPill v-if="feedback" :result="feedback.type" :points="feedback.points" />
                        <div v-else-if="!isTrueFalse" class="attempts-pill">{{ attemptsLabel }}</div>
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

            <div class="runner-footer">
                <UiButton variant="outline" @click="quitSession">
                    <XMarkIcon class="quit-icon" aria-hidden="true" />
                    Terminar quiz
                </UiButton>
            </div>

        </div>

        <BadgeUnlockModal :visible="showBadgeModal" :tier="earnedBadgeTier" :book-title="book?.title || 'Livro'"
            @close="handleBadgeModalClose" />

    </section>

    <ConfettiOverlay :active="viewState === 'summary' && showConfetti" />

    <UiConfirmModal
        :visible="!!confirmModal"
        :title="confirmModal?.title ?? ''"
        :message="confirmModal?.message ?? ''"
        :confirm-label="confirmModal?.confirmLabel"
        :cancel-label="confirmModal?.cancelLabel"
        @confirm="handleModalConfirm"
        @cancel="handleModalCancel"
    />
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

.runner-stat--streak {
    background: var(--color-teal-200);
}

.runner-stat--pulse {
    animation: streak-up 0.4s ease-out;
}

.runner-stat--inactive {
    opacity: 0.35;
    filter: grayscale(0.6);
    transition: opacity 0.3s ease, filter 0.3s ease;
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

.stat-sep {
    font-size: 14px;
    color: var(--color-mirage-400);
    font-weight: 600;
}

.state {
    font-weight: 600;
    color: var(--color-mirage-600);
}

.state.error {
    color: var(--color-error-strong);
}

.runner {
    display: grid;
    gap: var(--space-500);
    padding-top: var(--space-300);
    border-top: 2px solid var(--color-wild-400);
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
    background: var(--color-error-muted);
    border-color: var(--color-red-500);
    color: var(--color-error-strong);
}

.status-pill.done {
    background: var(--color-deep-100);
}

.status-pill.no-xp {
    background: var(--color-wild-300);
    border-color: var(--color-mirage-400);
    color: var(--color-mirage-500);
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

.summary-chip--wrong { background: var(--color-error-muted); border-color: var(--color-red-500); }

.summary-chip--pending { background: var(--color-wild-200); }

.summary-chip__value {
    font-size: 28px;
    font-weight: 800;
    color: var(--color-mirage-800);
    line-height: 1;
}

.summary-chip--wrong .summary-chip__value { color: var(--color-error-strong); }

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
.summary-item.wrong { background: var(--color-error-muted); border-color: var(--color-red-500); }
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

.summary-item.wrong .summary-item__question { color: var(--color-error-strong); }

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

.summary-tag--warn { color: var(--color-pumpkin-700); }

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
    background: var(--color-error-muted);
    color: var(--color-error-strong);
    border-color: var(--color-red-500);
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

.quit-icon {
    width: 16px;
    height: 16px;
    stroke-width: 2.5;
}

@media (max-width: 720px) {
    .question-tags {
        justify-items: center;
        text-align: center;
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
    40% { transform: scale(1.04); }
    100% { transform: scale(1); }
}

@keyframes streak-lost {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    75% { transform: translateX(3px); }
}

@keyframes fire-up {
    0% { transform: scale(1); }
    40% { transform: scale(1.25) rotate(-6deg); color: var(--color-amber-500); }
    100% { transform: scale(1) rotate(0deg); }
}

@keyframes fire-lost {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
}

.runner-stat--streak.streak--up {
    animation: streak-up 0.4s ease-out;
}

.runner-stat--streak.streak--lost {
    animation: streak-lost 0.4s ease;
}

.runner-stat--streak.streak--up .stat-icon--fire {
    animation: fire-up 0.4s ease-out;
}

.runner-stat--streak.streak--lost .stat-icon--fire {
    animation: fire-lost 0.4s ease;
}

.chip-value--wrong {
    color: var(--color-error-strong);
}
</style>
