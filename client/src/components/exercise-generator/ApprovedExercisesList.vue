<script setup lang="ts">
import { computed, ref } from 'vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import type { Exercise } from '@/types'
import { TrashIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'

type ExerciseType = 'multiple-choice' | 'true-false'

type Props = {
    exercises: Exercise[]
    typeLabels: Record<ExerciseType, string>
    maxCount?: number
    minRequired?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ remove: [Exercise] }>()

const confirmOpen = ref(false)
const pendingExercise = ref<Exercise | null>(null)

const count = computed(() => props.exercises.length)
const hasLimits = computed(() => props.maxCount !== undefined)

const minPercent = computed(() => {
    if (!props.maxCount || !props.minRequired) return 0
    return Math.round((props.minRequired / props.maxCount) * 100)
})

const fillPercent = computed(() => {
    if (!props.maxCount) return 0
    return Math.min(100, Math.round((count.value / props.maxCount) * 100))
})

const isAtMax = computed(() => props.maxCount !== undefined && count.value >= props.maxCount)
const isAtMin = computed(() => props.minRequired !== undefined && count.value >= props.minRequired)

const statusLabel = computed(() => {
    if (isAtMax.value) return 'Limite máximo atingido'
    if (isAtMin.value) return 'Mínimo satisfeito'
    return `Faltam ${(props.minRequired ?? 0) - count.value} para o mínimo`
})

const statusClass = computed(() => {
    if (isAtMax.value) return 'progress--max'
    if (isAtMin.value) return 'progress--ok'
    return 'progress--below'
})

const exerciseKey = (ex: Exercise) => ex.exercise_id

const openConfirm = (exercise: Exercise) => {
    pendingExercise.value = exercise
    confirmOpen.value = true
}

const closeConfirm = () => {
    confirmOpen.value = false
    pendingExercise.value = null
}

const confirmRemove = () => {
    if (!pendingExercise.value) return
    emit('remove', pendingExercise.value)
    closeConfirm()
}

const getOptionLabel = (value: string) => String(value || '').trim()

const getOptionLetter = (value: string) => {
    const trimmed = getOptionLabel(value)
    const match = trimmed.match(/^([A-F])\)/i)
    return match?.[1] ? match[1].toUpperCase() : ''
}

const isOptionCorrect = (option: string, correct: string) => {
    const optionLetter = getOptionLetter(option)
    const correctLetter = String(correct || '').trim().toUpperCase()
    if (optionLetter && correctLetter) return optionLetter === correctLetter
    return getOptionLabel(option) === String(correct || '').trim()
}

const normalizeAnswers = (value: any) => {
    if (Array.isArray(value)) return value.map((item) => String(item))
    if (value == null) return []
    return [String(value)]
}

const getFillBlankAnswers = (exercise: Exercise) => {
    const content = exercise.content || {}
    const answers = normalizeAnswers((content as any).respostas_corretas)
    return answers.length ? answers.join(' / ') : 'Sem resposta'
}

const getQuestion = (exercise: Exercise) => {
    const content = exercise.content || {}
    const question =
        (content as any).pergunta ||
        (content as any).question ||
        (content as any).enunciado ||
        (content as any).afirmacao ||
        (content as any).frase
    return question ? String(question) : 'Pergunta indisponivel'
}

const getAnswer = (exercise: Exercise) => {
    const content = exercise.content || {}
    const rawAnswer =
        (content as any).resposta_correta ??
        (content as any).resposta ??
        (content as any).correta

    if (typeof rawAnswer === 'boolean') return rawAnswer ? 'Verdadeiro' : 'Falso'
    if (Array.isArray(rawAnswer)) return rawAnswer.map(String).join(', ')
    if (rawAnswer === null || rawAnswer === undefined || rawAnswer === '') return 'Sem resposta'
    return String(rawAnswer)
}
</script>

<template>
    <div class="panel">
        <!-- Progress bar header (only when limits are provided) -->
        <div v-if="hasLimits" class="progress-header" :class="statusClass">
            <div class="progress-labels">
                <div class="progress-counts">
                    <span class="count-current">{{ count }}</span>
                    <span class="count-sep">/</span>
                    <span class="count-max">{{ maxCount }}</span>
                    <span class="count-unit">exercícios</span>
                </div>
                <span class="status-chip" :class="statusClass">{{ statusLabel }}</span>
            </div>

            <div class="bar-track">
                <!-- Min threshold marker -->
                <div
                    v-if="minRequired && maxCount"
                    class="bar-min-marker"
                    :style="{ left: minPercent + '%' }"
                    :title="`Mínimo: ${minRequired}`"
                ></div>
                <!-- Fill -->
                <div class="bar-fill" :class="statusClass" :style="{ width: fillPercent + '%' }"></div>
            </div>

            <div class="bar-legend">
                <span class="legend-item">
                    <span class="legend-dot legend-dot--min"></span>
                    Mínimo: {{ minRequired ?? '—' }}
                </span>
                <span class="legend-item">
                    <span class="legend-dot legend-dot--max"></span>
                    Máximo: {{ maxCount ?? '—' }}
                </span>
            </div>
        </div>

        <div v-if="exercises.length" class="grid">
            <UiCard v-for="exercise in exercises" :key="exerciseKey(exercise)" class="card">
                <div class="top">
                    <UiBadge :label="typeLabels[exercise.type || 'multiple-choice']" />
                    <UiIconButton size="md" shape="square" variant="outline" class="remove-button"
                        aria-label="Detalhes do exercicio" @click="openConfirm(exercise)">
                        <InformationCircleIcon class="remove-icon" aria-hidden="true" />
                    </UiIconButton>
                </div>
                <p class="question">{{ getQuestion(exercise) }}</p>
            </UiCard>
        </div>
        <p v-else class="state">Sem exercicios aprovados.</p>

        <!-- Exercise detail / delete modal -->
        <div v-if="confirmOpen && pendingExercise" class="confirm-overlay" @click.self="closeConfirm">
            <div class="confirm-modal" role="dialog" aria-modal="true">
                <div class="confirm-header">
                    <div class="confirm-icon-title">
                        <h3>Detalhes do Exercício</h3>
                        <UiIconButton size="md" shape="square" variant="outline" @click="confirmRemove"
                            title="Apagar exercício">
                            <TrashIcon class="remove-icon" aria-hidden="true" />
                        </UiIconButton>
                    </div>
                </div>

                <div class="exercise-preview">
                    <UiBadge :label="typeLabels[pendingExercise.type || 'multiple-choice']" class="preview-badge" />
                    <p class="question-text">{{ getQuestion(pendingExercise) }}</p>

                    <template v-if="(pendingExercise.type || 'multiple-choice') === 'multiple-choice'">
                        <ul class="options-list">
                            <li v-for="option in (pendingExercise.content as any)?.opcoes" :key="option"
                                :class="{ correct: isOptionCorrect(option, (pendingExercise.content as any)?.resposta_correta) }">
                                <strong>{{ option }}</strong>
                            </li>
                        </ul>
                        <p class="answer-text"><strong>Resposta correta:</strong> {{ (pendingExercise.content as
                            any)?.resposta_correta || 'Sem resposta' }}</p>
                        <p v-if="(pendingExercise.content as any)?.justificacao" class="justification-text">
                            <strong>Justificação da resposta pela IA:</strong> {{ (pendingExercise.content as
                            any).justificacao }}
                        </p>
                    </template>

                    <template v-else-if="pendingExercise.type === 'true-false'">
                        <p class="answer-text"><strong>Resposta correta:</strong> {{ (pendingExercise.content as
                            any)?.resposta_correta ? 'Verdadeiro' : 'Falso' }}</p>
                        <p v-if="(pendingExercise.content as any)?.justificacao" class="justification-text">
                            <strong>Justificação da resposta pela IA:</strong> {{ (pendingExercise.content as
                            any).justificacao }}
                        </p>
                    </template>

                </div>

                <div class="confirm-actions">
                    <UiButton variant="outline" size="sm" type="button" @click="closeConfirm">Fechar</UiButton>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.panel {
    display: grid;
    gap: var(--space-400);
}

/* ---- Progress header ---- */
.progress-header {
    display: grid;
    gap: var(--space-300);
    padding: var(--space-400);
    border-radius: 14px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 4px 4px 0 rgba(46, 127, 123, 0.35);
}

.progress-header.progress--ok {
    border-color: var(--color-teal-600);
    background: var(--color-deep-100);
}

.progress-header.progress--max {
    border-color: var(--color-teal-600);
    background: var(--color-deep-100);
}

.progress-header.progress--below {
    border-color: var(--color-mirage-800);
    background: var(--color-wild-200);
}

.progress-labels {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-200);
}

.progress-counts {
    display: flex;
    align-items: baseline;
    gap: 4px;
}

.count-current {
    font-size: 26px;
    font-weight: 800;
    line-height: 1;
    color: var(--color-mirage-900);
}

.progress--ok .count-current { color: var(--color-deep-700); }
.progress--max .count-current { color: var(--color-deep-700); }

.count-sep {
    font-size: 18px;
    color: var(--color-mirage-400);
    font-weight: 300;
}

.count-max {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-mirage-600);
}

.count-unit {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-mirage-500);
    margin-left: 4px;
}

.status-chip {
    font-size: 11px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 999px;
    border: 2px solid var(--color-mirage-800);
    white-space: nowrap;
    box-shadow: 2px 2px 0 rgba(46, 127, 123, 0.25);
}

.status-chip.progress--ok { color: var(--color-deep-800); border-color: var(--color-deep-600); background: var(--color-deep-200, #b8e8e4); }
.status-chip.progress--max { color: var(--color-deep-800); border-color: var(--color-deep-600); background: var(--color-deep-200, #b8e8e4); }
.status-chip.progress--below { color: var(--color-mirage-700); border-color: var(--color-mirage-800); background: var(--color-wild-300, var(--color-wild-200)); }

/* Progress bar */
.bar-track {
    position: relative;
    width: 100%;
    height: 10px;
    background: var(--color-mirage-100);
    border-radius: 999px;
    border: 2px solid var(--color-mirage-300);
    overflow: visible;
}

.bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.bar-fill.progress--ok { background: linear-gradient(90deg, var(--color-teal-400), var(--color-deep-600)); }
.bar-fill.progress--max { background: linear-gradient(90deg, var(--color-teal-400), var(--color-deep-600)); }
.bar-fill.progress--below { background: linear-gradient(90deg, var(--color-deep-300), var(--color-deep-500)); }

/* Min threshold marker */
.bar-min-marker {
    position: absolute;
    top: -3px;
    transform: translateX(-50%);
    width: 3px;
    height: 16px;
    background: var(--color-mirage-600);
    border-radius: 2px;
    z-index: 2;
}

/* Legend */
.bar-legend {
    display: flex;
    gap: var(--space-400);
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: var(--color-mirage-500);
    font-weight: 600;
}

.legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.legend-dot--min { background: var(--color-mirage-600); }
.legend-dot--max { background: var(--color-deep-400, var(--color-teal-500)); border: 1.5px solid var(--color-deep-600); }

/* ---- Exercise grid ---- */
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
}

.card {
    display: grid;
    gap: 8px;
}

.top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.remove-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
}

.remove-icon {
    width: 20px;
    height: 20px;
    stroke-width: var(--icon-stroke);
}

.question {
    margin: 0;
    font-weight: 600;
    font-size: 13px;
    color: var(--color-mirage-800);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.state {
    font-weight: 600;
    color: var(--color-mirage-500);
    font-size: 13px;
}

/* ---- Modal ---- */
.confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 29, 32, 0.28);
    display: grid;
    place-items: center;
    z-index: 9999;
}

.confirm-modal {
    width: min(540px, 90vw);
    background: var(--color-wild-100);
    border-radius: 16px;
    border: 2px solid var(--color-mirage-800);
    box-shadow: 6px 6px 0 var(--color-shadow);
    padding: var(--space-500);
    display: grid;
    gap: var(--space-400);
}

.confirm-header { display: flex; flex-direction: column; gap: var(--space-100); }

.confirm-icon-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.confirm-icon-title h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
}

.exercise-preview {
    background: var(--color-wild-50);
    border: 1px solid var(--color-mirage-200);
    border-radius: var(--radius-300);
    padding: var(--space-300);
    display: grid;
    gap: var(--space-200);
}

.preview-badge { justify-self: start; }

.question-text {
    margin: 0;
    font-weight: 700;
    font-size: 16px;
    color: var(--color-mirage-900);
}

.answer-text,
.justification-text {
    margin: 0;
    font-size: 14px;
    color: var(--color-mirage-800);
}

.options-list ul {
    margin: 0;
    padding-left: 20px;
}

.options-list li.correct {
    color: var(--color-teal-600);
    font-weight: 700;
}

.confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-300);
}
</style>
