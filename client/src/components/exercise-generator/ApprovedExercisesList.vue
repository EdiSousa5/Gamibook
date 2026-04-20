<script setup lang="ts">
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import type { Exercise } from '@/services/directus'

type ExerciseType = 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'

type Props = {
    exercises: Exercise[]
    typeLabels: Record<ExerciseType, string>
}

defineProps<Props>()

defineEmits<{ remove: [Exercise] }>()

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
</script>

<template>
    <UiCard class="panel">
        <div class="panel-header">
            <h2>Exercicios aprovados</h2>
            <p>Remove exercicios se precisares de ajustar o modulo.</p>
        </div>
        <div v-if="exercises.length" class="grid">
            <UiCard v-for="exercise in exercises" :key="exercise.exercise_id" class="card">
                <div class="top">
                    <UiBadge :label="typeLabels[exercise.type || 'multiple-choice']" />
                </div>
                <p class="question">{{ getQuestion(exercise) }}</p>
                <div class="meta">
                    <UiButton variant="ghost" type="button" @click="$emit('remove', exercise)">Remover</UiButton>
                </div>
            </UiCard>
        </div>
        <p v-else class="state">Sem exercicios aprovados neste modulo.</p>
    </UiCard>
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


.question {
    margin: 0;
    font-weight: 600;
}

.meta {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    font-weight: 600;
    color: #3a3a3a;
}


.state {
    font-weight: 600;
    color: #6f6f6f;
}
</style>
