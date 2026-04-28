<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiCard from '@/components/ui/UiCard.vue'

defineProps<{
    generationMode: 'module' | 'daily'
    questionsLabel: string
    maxPerModule: number
    countPerModule: number
    totalQuestions: number
    isOverMaxTotal: boolean
    selectedModuleIdsLength: number
    hasSelectedBook: boolean
    isGenerating: boolean
    maxTotalQuestions: number
}>()

defineEmits<{
    'update:countPerModule': [value: number]
    'generate': []
}>()
</script>

<template>
    <UiCard class="config-panel sticky">
        <div class="config-header">
            <div class="step-indicator">{{ generationMode === 'module' ? '4' : '3' }}</div>
            <h2>Configuração</h2>
        </div>

        <div class="config-body"
            :class="{ 'is-disabled': (generationMode === 'module' && selectedModuleIdsLength === 0) || (generationMode === 'daily' && !hasSelectedBook) }">
            <div class="config-group">
                <div class="group-header">
                    <label>{{ questionsLabel }}</label>
                    <span class="badge" v-if="generationMode === 'module'">Máx {{ maxPerModule }}</span>
                    <span class="badge" v-else>Máx 15</span>
                </div>
                <UiInput type="number" :min="1" :max="generationMode === 'module' ? maxPerModule : 15"
                    :model-value="countPerModule"
                    @update="$emit('update:countPerModule', Number($event))" />
                <p class="config-math"
                    :class="{ 'is-warning': generationMode === 'module' && isOverMaxTotal }"
                    v-if="generationMode === 'module'">
                    Total: {{ totalQuestions }} = {{ countPerModule }} × {{ selectedModuleIdsLength }}
                    (limite {{ maxTotalQuestions }})
                </p>
            </div>

            <div class="config-group">
                <div class="group-header">
                    <label>Tipos Suportados</label>
                </div>
                <div class="types-list">
                    <div class="type-tag">Escolha Múltipla</div>
                    <div class="type-tag">Verdadeiro / Falso</div>
                </div>
            </div>

            <div class="config-action">
                <UiButton variant="primary" size="md" class="generate-btn"
                    :disabled="(generationMode === 'module' && selectedModuleIdsLength === 0) || (generationMode === 'daily' && !hasSelectedBook) || isGenerating || (generationMode === 'module' && isOverMaxTotal)"
                    @click="$emit('generate')">
                    <span v-if="!isGenerating">Gerar Exercícios</span>
                    <span v-else>A Gerar...</span>
                </UiButton>
                <p class="action-hint" v-if="generationMode === 'module' && selectedModuleIdsLength === 0">
                    Seleciona módulos para começar.</p>
                <p class="action-hint" v-else-if="generationMode === 'daily' && !hasSelectedBook">Seleciona um livro para começar.</p>
                <p class="action-hint" v-else-if="generationMode === 'module' && isOverMaxTotal">Reduz o total para não ultrapassar o
                    limite.</p>
            </div>
        </div>
    </UiCard>
</template>

<style scoped>
.sticky {
    position: sticky;
    top: calc(var(--space-400));
}

.config-panel {
    background: var(--color-wild-100);
    border: 2px solid var(--color-mirage-900);
    border-radius: var(--radius-400);
}

.config-header {
    display: flex;
    align-items: center;
    gap: var(--space-300);
    padding-bottom: var(--space-400);
    border-bottom: 2px dashed var(--color-mirage-200);
    margin-bottom: var(--space-400);
}

.config-header h2 {
    margin: 0;
    font-size: 22px;
}

.step-indicator {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: var(--color-deep-600);
    color: var(--color-wild-100);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 18px;
    border: 2px solid var(--color-mirage-900);
    box-shadow: 2px 2px 0 var(--color-shadow);
    flex-shrink: 0;
}

.config-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-400);
    transition: opacity 0.3s ease;
}

.config-body.is-disabled {
    opacity: 0.5;
    pointer-events: none;
}

.config-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-200);
}

.group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.group-header label {
    font-weight: 700;
    color: var(--color-mirage-800);
}

.badge {
    background: var(--color-mirage-100);
    color: var(--color-mirage-600);
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: var(--radius-full);
}

.config-math {
    margin: 0;
    font-size: 12px;
    color: var(--color-mirage-600);
    font-weight: 600;
}

.config-math.is-warning {
    color: #8a5a00;
}

.types-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-200);
}

.type-tag {
    background: var(--color-teal-100);
    color: var(--color-teal-800);
    border: 1px solid var(--color-teal-300);
    padding: var(--space-150) var(--space-200);
    border-radius: var(--radius-100);
    font-size: 13px;
    font-weight: 600;
}

.config-action {
    margin-top: var(--space-200);
    display: flex;
    flex-direction: column;
    gap: var(--space-200);
}

.generate-btn {
    width: 100%;
    height: 48px;
    font-size: 15px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.action-hint {
    margin: 0;
    text-align: center;
    font-size: 13px;
    color: var(--color-mirage-500);
}
</style>