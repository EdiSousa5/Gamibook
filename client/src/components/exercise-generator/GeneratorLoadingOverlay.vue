<script setup lang="ts">
defineProps<{
    isGenerating: boolean
    progressLabel: string
    elapsedLabel: string
}>()
</script>

<template>
    <Transition name="fade">
        <div v-if="isGenerating" class="loading-overlay">
            <div class="loading-modal">
                <div class="spinner-container">
                    <div class="fancy-spinner"></div>
                </div>
                <h3>Processamento IA em curso...</h3>
                <p class="progress-label" v-if="progressLabel">{{ progressLabel }}</p>
                <div class="timer">{{ elapsedLabel }}</div>
                <p class="loading-hint">Isto pode demorar alguns minutos. Por favor aguarda.</p>
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
    z-index: 100;
}

.loading-modal {
    background: var(--color-wild-100);
    padding: var(--space-600);
    border-radius: var(--radius-400);
    border: 2px solid var(--color-mirage-900);
    box-shadow: 8px 8px 0 var(--color-shadow);
    text-align: center;
    max-width: 400px;
    width: 90%;
}

.spinner-container {
    margin-bottom: var(--space-400);
}

.fancy-spinner {
    width: 50px;
    height: 50px;
    border: 5px solid var(--color-wild-300);
    border-top-color: var(--color-deep-600);
    border-radius: 50%;
    margin: 0 auto;
    animation: spin 1s linear infinite;
}

.loading-modal h3 {
    margin: 0 0 var(--space-200);
    font-size: 20px;
}

.progress-label {
    margin: 0 0 var(--space-300);
    color: var(--color-mirage-600);
    font-weight: 600;
}

.timer {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 700;
    color: var(--color-deep-600);
    margin-bottom: var(--space-300);
}

.loading-hint {
    margin: 0;
    font-size: 13px;
    color: var(--color-mirage-500);
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
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