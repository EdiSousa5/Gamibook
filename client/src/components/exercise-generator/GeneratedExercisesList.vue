<script setup lang="ts">

type Difficulty = 'easy' | 'medium' | 'hard'

type ExerciseType = 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'

type GeneratedExercise = {
    localId: string
    questionText: string
    content: Record<string, any>
    exerciseType: ExerciseType
    difficulty: Difficulty
}

type Section = {
    difficulty: Difficulty
    types: Array<{ type: ExerciseType; items: GeneratedExercise[] }>
}

type Props = {
    sections: Section[]
    typeLabels: Record<ExerciseType, string>
    difficultyLabels: Record<Difficulty, string>
    approvingMap: Record<string, boolean>
}

defineProps<Props>()

defineEmits<{ approve: [GeneratedExercise]; reject: [GeneratedExercise] }>()
</script>

<template>
    <section v-if="sections.length" class="exercise-list">
        <div v-for="section in sections" :key="section.difficulty" class="group">
            <h3>{{ difficultyLabels[section.difficulty] }}</h3>
            <div v-for="typeSection in section.types" :key="`${section.difficulty}-${typeSection.type}`">
                <h4>{{ typeLabels[typeSection.type] }}</h4>
                <div class="grid">
                    <article v-for="(exercise, index) in typeSection.items" :key="exercise.localId" class="card"
                        :style="{ '--i': index }">
                        <header>
                            <span class="chip">Exercicio {{ index + 1 }}</span>
                            <div>
                                <p class="question">{{ exercise.questionText }}</p>
                                <p class="hint">{{ typeLabels[exercise.exerciseType] }}</p>
                            </div>
                        </header>

                        <div class="content">
                            <template v-if="exercise.exerciseType === 'multiple-choice'">
                                <ul>
                                    <li v-for="option in exercise.content.opcoes" :key="option">
                                        <strong>{{ option }}</strong>
                                    </li>
                                </ul>
                                <p><span>Resposta correta:</span> {{ exercise.content.resposta_correta }}</p>
                                <p><span>Justificacao:</span> {{ exercise.content.justificacao || 'Sem justificacao.' }}
                                </p>
                            </template>

                            <template v-else-if="exercise.exerciseType === 'true-false'">
                                <p><span>Resposta correta:</span> {{ exercise.content.resposta_correta ? 'Verdadeiro' :
                                    'Falso' }}</p>
                                <p><span>Justificacao:</span> {{ exercise.content.justificacao || 'Sem justificacao.' }}
                                </p>
                            </template>

                            <template v-else-if="exercise.exerciseType === 'fill-blanks'">
                                <p><span>Resposta correta:</span> {{ exercise.content.resposta_correta }}</p>
                                <p><span>Justificacao:</span> {{ exercise.content.justificacao || 'Sem justificacao.' }}
                                </p>
                            </template>

                            <template v-else>
                                <div class="ordering">
                                    <div>
                                        <p><span>Itens desordenados</span></p>
                                        <ol>
                                            <li v-for="item in exercise.content.itens_desordenados" :key="item">{{ item
                                                }}</li>
                                        </ol>
                                    </div>
                                    <div>
                                        <p><span>Ordem correta</span></p>
                                        <p>{{ exercise.content.ordem_correta?.join(', ') || 'Sem ordem' }}</p>
                                    </div>
                                </div>
                                <p><span>Justificacao:</span> {{ exercise.content.justificacao || 'Sem justificacao.' }}
                                </p>
                            </template>
                        </div>

                        <footer>
                            <button class="ghost" type="button" @click="$emit('reject', exercise)">Rejeitar</button>
                            <button class="approve" type="button" :disabled="approvingMap[exercise.localId]"
                                @click="$emit('approve', exercise)">
                                {{ approvingMap[exercise.localId] ? 'A guardar...' : 'Aprovar' }}
                            </button>
                        </footer>
                    </article>
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

.group h4 {
    margin: 0;
    font-size: 14px;
    color: #6f6f6f;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.card {
    background: #ffffff;
    border-radius: 20px;
    padding: 18px;
    border: 1px solid #ececec;
    box-shadow: 0 16px 30px rgba(0, 0, 0, 0.06);
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

.chip {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    background: #ffe6be;
    color: #8a4c00;
    width: fit-content;
}

.question {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
}

.hint {
    margin: 0;
    color: #6f6f6f;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.content {
    display: grid;
    gap: 10px;
    color: #2c2c2c;
}

.content span {
    font-weight: 700;
}

.content ul,
.content ol {
    margin: 0;
    padding-left: 20px;
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
</style>
