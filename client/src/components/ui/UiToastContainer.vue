<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import UiToast from './UiToast.vue'

const { toasts, dismiss } = useToast()
</script>

<template>
    <div class="toast-container" aria-live="polite">
        <TransitionGroup name="toast-list">
            <UiToast v-for="toast in toasts" :key="toast.id" :type="toast.type" :title="toast.title"
                :message="toast.message" @close="dismiss(toast.id)" />
        </TransitionGroup>
    </div>
</template>

<style scoped>
.toast-container {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 12px;
    /* O contentor é "invisível" aos cliques do rato para não bloquear o site */
    pointer-events: none;
}

/* Animações de entrada e saída do Toast */
.toast-list-enter-active,
.toast-list-leave-active {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
}

.toast-list-leave-active {
    position: absolute;
}

.toast-list-enter-from,
.toast-list-leave-to {
    opacity: 0;
    transform: translateX(40px) scale(0.95);
}
</style>