<script setup lang="ts">
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiChip from '@/components/ui/UiChip.vue'

type ExerciseType = 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'

type GeneratedExercise = {
    localId: string
    questionText: string
    content: Record<string, any>
    exerciseType: ExerciseType
    moduleId?: number | null
    moduleTitle?: string | null
}

type Section = {
    moduleId: number | null
    moduleTitle: string
    types: Array<{ type: ExerciseType; items: GeneratedExercise[] }>
}

type Props = {
    sections: Section[]
    typeLabels: Record<ExerciseType, string>
    approvingMap: Record<string, boolean>
}

defineProps<Props>()

defineEmits<{ approve: [GeneratedExercise]; reject: [GeneratedExercise] }>()

const getOptionLabel = (value: string) => String(value || '').trim()

const getOptionLetter = (value: string) => {
    const trimmed = getOptionLabel(value)
    const match = trimmed.match(/^([A-D])\)/i)
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

const getFillBlankAnswers = (exercise: GeneratedExercise) => {
    const answers = normalizeAnswers(exercise.content.respostas_corretas)
    return answers.length ? answers.join(' / ') : 'Sem resposta'
}
</script>

<template>
    <section v-if="sections.length" class="exercise-list">
        <div v-for="section in sections" :key="String(section.moduleId)" class="group">
            <div class="module-header">
                <h3>{{ section.moduleTitle }}</h3>
                <UiChip :label="`Modulo ${section.moduleId ?? '-'}`" variant="outline" />
            </div>
            <div v-for="typeSection in section.types" :key="`${section.moduleId}-${typeSection.type}`">
                <div class="grid">
                    <UiCard v-for="(exercise, index) in typeSection.items" :key="exercise.localId" class="card"
                        :style="{ '--i': index }">
                        <header>
                            <div class="header-top">
                                <UiBadge :label="`Exercicio ${index + 1}`" />
                                <UiBadge :label="typeLabels[exercise.exerciseType]" />
                            </div>
                            <p class="question">{{ exercise.questionText }}</p>
                        </header>

                        <div class="content">
                            <template v-if="exercise.exerciseType === 'multiple-choice'">
                                <ul>
                                    <li v-for="option in exercise.content.opcoes" :key="option"
                                        :class="{ correct: isOptionCorrect(option, exercise.content.resposta_correta) }">
                                        <strong>{{ option }}</strong>
                                    </li>
                                </ul>
                                <p><strong>Resposta correta:</strong> {{ exercise.content.resposta_correta || 'Semresposta' }}</p>
                                <p><strong>Justificacao:</strong> {{ exercise.content.justificacao || 'Sem justificacao.' }}</p>
                            </template>

                            <template v-else-if="exercise.exerciseType === 'true-false'">
                                <p><strong>Resposta correta:</strong> {{ exercise.content.resposta_correta ?
                                    'Verdadeiro' : 'Falso' }}</p>
                                <p><strong>Justificacao:</strong> {{ exercise.content.justificacao || 'Sem justificacao.' }}</p>
                            </template>

                            <template v-else-if="exercise.exerciseType === 'fill-blanks'">
                                <p><strong>Frase:</strong> {{ exercise.questionText }}</p>
                                <div class="options">
                                    <p><strong>Opcoes</strong></p>
                                    <ul>
                                        <li v-for="option in exercise.content.opcoes" :key="option"
                                            :class="{ correct: normalizeAnswers(exercise.content.respostas_corretas).includes(String(option)) }">
                                            <strong>{{ option }}</strong>
                                        </li>
                                    </ul>
                                </div>
                                <p><strong>Respostas corretas:</strong> {{ getFillBlankAnswers(exercise) }}</p>
                                <p><strong>Justificacao:</strong> {{ exercise.content.justificacao || 'Sem justificacao.' }}</p>
                            </template>

                            <template v-else>
                                <div class="ordering">
                                    <div>
                                        <p><strong>Itens desordenados</strong></p>
                                        <ol>
                                            <li v-for="item in exercise.content.itens_desordenados" :key="item">{{ item
                                                }}</li>
                                        </ol>
                                    </div>
                                    <div>
                                        <p><strong>Ordem correta</strong></p>
                                        <p>{{ exercise.content.ordem_correta?.join(', ') || 'Sem ordem' }}</p>
                                    </div>
                                </div>
                                <p><strong>Justificacao:</strong> {{ exercise.content.justificacao || 'Sem justificacao.' }}</p>
                            </template>
                        </div>

                        <footer>
                            <UiButton variant="ghost" type="button" @click="$emit('reject', exercise)">Rejeitar
                            </UiButton>
                            <UiButton variant="primary" type="button" :disabled="approvingMap[exercise.localId]"
                                @click="$emit('approve', exercise)">
                                {{ approvingMap[exercise.localId] ? 'A guardar...' : 'Aprovar' }}
                            </UiButton>
                        </footer>
                    </UiCard>
                </div>
            </div>
        </div>
    </section>

    <section v-else class="empty">
        <p>Sem exercicios gerados. Clica em "Gerar exercicios" para comecar.</p>
    </section>
</template>

<style scoped>
.exercise-list {
    display: grid;
    gap: 16px;
}

.group {
    display: grid;
    gap: 12px;
}

.group h3 {
    margin: 0;
    font-size: 18px;
}

.module-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}


.grid {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr;
}

.card {
    display: grid;
    gap: 14px;
    animation: fadeUp 0.5s ease;
    animation-delay: calc(var(--i) * 80ms);
    animation-fill-mode: both;
}

.card header {
    display: grid;
    gap: 8px;
}

.header-top {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.content ul,
.content ol {
    margin: 0;
    padding-left: 20px;
}

.content li.correct {
    color: #0c7a5a;
    font-weight: 700;
}

.options {
    display: grid;
    gap: 6px;
}

.ordering {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
}

.card footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.ghost {
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid #cfcfcf;
    background: transparent;
    font-weight: 700;
    cursor: pointer;
}

.approve {
    padding: 10px 16px;
    border-radius: 12px;
    border: none;
    background: #0c7a5a;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
}

.approve:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.empty {
    background: #ffffff;
    border-radius: 18px;
    padding: 18px;
    border: 1px dashed #d4d4d4;
    color: #5c5c5c;
}

@keyframes fadeUp {
    from {
        opacity: 0;
        transform: translateY(12px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 720px) {
    .module-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .card footer {
        flex-direction: column;
        align-items: stretch;
    }

    .ordering {
        grid-template-columns: 1fr;
    }
}
</style>
