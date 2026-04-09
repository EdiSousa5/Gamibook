<script setup lang="ts">
import { ref, watch } from 'vue'

type ExerciseType = 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'

type GeneratePayload = {
    types: ExerciseType[]
    count: number
}

type Props = {
    open: boolean
    defaultTypes: ExerciseType[]
    defaultCount: number
    isGenerating: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{ close: []; generate: [GeneratePayload] }>()

const selectedTypes = ref<ExerciseType[]>([...props.defaultTypes])
const count = ref(props.defaultCount)

watch(
    () => props.open,
    (value) => {
        if (!value) return
        selectedTypes.value = [...props.defaultTypes]
        count.value = props.defaultCount
    }
)

const handleGenerate = () => {
    emit('generate', {
        types: selectedTypes.value,
        count: count.value,
    })
}
</script>

<template>
    <div v-if="open" class="overlay" role="dialog" aria-modal="true">
        <div class="modal">
            <header>
                <h3>Gerar exercicios</h3>
                <button type="button" class="ghost" @click="$emit('close')">Fechar</button>
            </header>

            <div class="fields">
                <div class="type-group">
                    <p>Tipos de Exercícios</p>
                    <label class="type-item">
                        <input type="checkbox" value="multiple-choice" v-model="selectedTypes" />
                        <span>Escolha multipla</span>
                    </label>
                    <label class="type-item">
                        <input type="checkbox" value="true-false" v-model="selectedTypes" />
                        <span>Verdadeiro / Falso</span>
                    </label>
                </div>

                <label>
                    Quantos exercicios quer gerar por tipo de exercicio selecionado?
                    <input type="number" min="1" v-model.number="count" />
                    <span class="helper">(Este valor aplica-se a cada tipo selecionado.)</span>
                </label>
            </div>

            <footer>
                <button type="button" class="primary" :disabled="isGenerating" @click="handleGenerate">
                    {{ isGenerating ? 'A ligar ao Flowise...' : 'Gerar' }}
                </button>
            </footer>
        </div>
    </div>
</template>

<style scoped>
.overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: grid;
    place-items: center;
    padding: 16px;
    z-index: 30;
}

.modal {
    background: #ffffff;
    border-radius: 18px;
    padding: 20px;
    width: min(420px, 100%);
    display: grid;
    gap: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

header h3 {
    margin: 0;
}

.fields {
    display: grid;
    gap: 12px;
}

label {
    display: grid;
    gap: 8px;
    font-weight: 600;
}

.helper {
    font-size: 12px;
    color: #6a6a6a;
    font-weight: 400;
}

.type-group {
    display: grid;
    gap: 10px;
    font-weight: 600;
}

.type-group p {
    margin: 0;
}

.type-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
}

input {
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid #dcdcdc;
    font-family: inherit;
}

footer {
    display: flex;
    justify-content: flex-end;
}

.primary {
    padding: 10px 16px;
    border-radius: 12px;
    border: none;
    background: #0c7a5a;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
}

.ghost {
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid #d0d0d0;
    background: transparent;
    font-weight: 600;
    cursor: pointer;
}
</style>
