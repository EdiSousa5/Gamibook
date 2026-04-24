<script setup lang="ts">
import { ref } from 'vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import type { Exercise } from '@/services/directus'
import { TrashIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'

type ExerciseType = 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'

type Props = {
    exercises: Exercise[]
    typeLabels: Record<ExerciseType, string>
}

defineProps<Props>()

const emit = defineEmits<{ remove: [Exercise] }>()

const confirmOpen = ref(false)
const pendingExercise = ref<Exercise | null>(null)

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
        <div class="panel-header">
            <h2>Exercicios aprovados</h2>
            <p>Remove exercicios se precisares de ajustar o modulo.</p>
        </div>
        <div v-if="exercises.length" class="grid">
            <UiCard v-for="exercise in exercises" :key="exercise.exercise_id" class="card">
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
        <p v-else class="state">Sem exercicios aprovados neste modulo.</p>

        <div v-if="confirmOpen && pendingExercise" class="confirm-overlay" @click.self="closeConfirm">
            <div class="confirm-modal" role="dialog" aria-modal="true">
                <div class="confirm-header">
                    <div class="confirm-icon-title">
                        <h3>Detalhes do Exercício</h3>
                        <UiIconButton size="md" shape="square" variant="outline" @click="confirmRemove" title="Apagar exercício">
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
                            <strong>Justificação da resposta pela IA:</strong> {{ (pendingExercise.content as any).justificacao }}
                        </p>
                    </template>

                    <template v-else-if="pendingExercise.type === 'true-false'">
                        <p class="answer-text"><strong>Resposta correta:</strong> {{ (pendingExercise.content as
                            any)?.resposta_correta ? 'Verdadeiro' : 'Falso' }}</p>
                        <p v-if="(pendingExercise.content as any)?.justificacao" class="justification-text">
                            <strong>Justificação da resposta pela IA:</strong> {{ (pendingExercise.content as any).justificacao }}
                        </p>
                    </template>

                    <template v-else-if="pendingExercise.type === 'fill-blanks'">
                        <div class="options-list">
                            <p><strong>Opções:</strong></p>
                            <ul>
                                <li v-for="option in (pendingExercise.content as any)?.opcoes" :key="option"
                                    :class="{ correct: normalizeAnswers((pendingExercise.content as any)?.respostas_corretas).includes(String(option)) }">
                                    <strong>{{ option }}</strong>
                                </li>
                            </ul>
                        </div>
                        <p class="answer-text"><strong>Respostas corretas:</strong> {{
                            getFillBlankAnswers(pendingExercise) }}</p>
                        <p v-if="(pendingExercise.content as any)?.justificacao" class="justification-text">
                            <strong>Justificação da resposta pela IA:</strong> {{ (pendingExercise.content as any).justificacao }}
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
    gap: 18px;
}

.panel-header {
    display: grid;
    gap: 6px;
}

.panel-header h2 {
    margin: 0;
}

.panel-header p {
    margin: 0;
    color: #555;
    font-size: 14px;
}

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
}


.state {
    font-weight: 600;
    color: #6f6f6f;
}

.confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 29, 32, 0.28);
    display: grid;
    place-items: center;
    z-index: 40;
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

.confirm-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-100);
}

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

.confirm-text {
    margin: 0;
    color: var(--color-mirage-600);
    font-size: 14px;
}

.exercise-preview {
    background: var(--color-wild-50);
    border: 1px solid var(--color-mirage-200);
    border-radius: var(--radius-300);
    padding: var(--space-300);
    display: grid;
    gap: var(--space-200);
}

.preview-badge {
    justify-self: start;
}

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

.btn-danger {
    --btn-face: #ef4444;
    --btn-face-hover: #dc2626;
    --btn-border: #991b1b;
    color: #fff !important;
}
</style>
