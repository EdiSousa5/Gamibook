<script setup lang="ts">
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { useToast, type ToastType } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

const iconFor = (type: ToastType) => {
  if (type === 'error') return ExclamationTriangleIcon
  if (type === 'success') return CheckCircleIcon
  return InformationCircleIcon
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
          role="alert"
        >
          <div class="toast-shadow" />
          <div class="toast-face">
            <component :is="iconFor(toast.type)" class="toast-icon" aria-hidden="true" />
            <span class="toast-msg">{{ toast.message }}</span>
            <button class="toast-close" type="button" @click="dismiss(toast.id)" aria-label="Fechar">
              <XMarkIcon class="close-icon" aria-hidden="true" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  bottom: var(--space-500);
  right: var(--space-500);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
  max-width: 380px;
  pointer-events: none;
}

.toast {
  position: relative;
  pointer-events: all;
}

.toast-shadow {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  transform: translate(4px, 4px);
  background: var(--color-mirage-800);
}

.toast-face {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-300);
  padding: var(--space-300) var(--space-400);
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
}

.toast--error .toast-face   { background: #fef2f2; border-color: #b13b3b; }
.toast--error .toast-shadow { background: #b13b3b; }
.toast--success .toast-face  { background: var(--color-deep-100); border-color: var(--color-deep-600); }
.toast--success .toast-shadow { background: var(--color-deep-700); }
.toast--info .toast-face    { background: var(--color-wild-100); }

.toast-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  stroke-width: 2;
  color: var(--color-mirage-600);
}

.toast--error .toast-icon   { color: #b13b3b; }
.toast--success .toast-icon { color: var(--color-deep-600); }

.toast-msg {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-mirage-800);
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.close-icon {
  width: 16px;
  height: 16px;
  color: var(--color-mirage-500);
}

/* TransitionGroup animations */
.toast-enter-active { transition: all 0.25s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translateX(24px); }
.toast-leave-to  { opacity: 0; transform: translateX(24px); }

@media (max-width: 480px) {
  .toast-stack {
    left: var(--space-400);
    right: var(--space-400);
    max-width: 100%;
  }
}
</style>
