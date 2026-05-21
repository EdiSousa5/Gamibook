<script setup lang="ts">
defineProps<{
    isGenerating: boolean
    progressLabel: string
    progress: number
}>()
</script>

<template>
    <Transition name="fade">
        <div v-if="isGenerating" class="loading-overlay">
            <div class="loading-modal">
                <h3>Processamento IA em curso...</h3>
                <p class="progress-label" v-if="progressLabel">{{ progressLabel }}</p>

                <div class="progress-wrap">
                    <div class="progress-track">
                        <div
                            class="progress-fill"
                            :style="{ width: `${progress}%` }"
                        />
                    </div>
                    <span class="progress-pct">{{ Math.round(progress) }}%</span>
                </div>

                <p class="loading-hint">Aguarda uns instantes enquanto a IA processa o teu pedido.</p>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.loading-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 29, 32, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.loading-modal {
    background: var(--color-wild-100);
    padding: var(--space-600);
    border-radius: var(--radius-400);
    border: 2px solid var(--color-mirage-900);
    box-shadow: 8px 8px 0 var(--color-shadow);
    text-align: center;
    max-width: 420px;
    width: 90%;
    display: flex;
    flex-direction: column;
    gap: var(--space-300);
}

.loading-modal h3 {
    margin: 0;
    font-size: 20px;
}

.progress-label {
    margin: 0;
    color: var(--color-mirage-600);
    font-weight: 600;
    font-size: 14px;
}

.progress-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-300);
}

.progress-track {
    flex: 1;
    height: 16px;
    background: var(--color-wild-300);
    border-radius: 999px;
    border: 2px solid var(--color-mirage-800);
    box-shadow: 3px 3px 0 var(--color-shadow);
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-500));
    border-radius: inherit;
    transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-pct {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--color-deep-600);
    min-width: 44px;
    text-align: right;
}

.loading-hint {
    margin: 0;
    font-size: 13px;
    color: var(--color-mirage-500);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
