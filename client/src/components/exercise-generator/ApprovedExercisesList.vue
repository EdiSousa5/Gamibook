<script setup lang="ts">
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
    <section class="panel">
        <div class="panel-header">
            <h2>Exercicios aprovados</h2>
            <p>Remove exercicios se precisares de ajustar o modulo.</p>
        </div>
        <div v-if="exercises.length" class="grid">
            <article v-for="exercise in exercises" :key="exercise.exercise_id" class="card">
                <div class="top">
                    <span class="badge">{{ typeLabels[exercise.type || 'multiple-choice'] }}</span>
                </div>
                <p class="question">{{ getQuestion(exercise) }}</p>
                <div class="meta">
                    <button class="ghost" type="button" @click="$emit('remove', exercise)">Remover</button>
                </div>
            </article>
        </div>
        <p v-else class="state">Sem exercicios aprovados neste modulo.</p>
    </section>
</template>

<style scoped>
.panel {
    background: #ffffff;
    padding: 22px;
    border-radius: 20px;
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.06);
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
    background: #ffffff;
    border-radius: 16px;
    padding: 14px;
    border: 1px solid #e7e7e7;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.06);
    display: grid;
    gap: 8px;
}

.top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.badge {
    font-size: 12px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 999px;
    background: #ffe6be;
    color: #8a4c00;
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

.ghost {
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid #d0d0d0;
    background: transparent;
    font-weight: 600;
    cursor: pointer;
}

.state {
    font-weight: 600;
    color: #6f6f6f;
}
</style>
