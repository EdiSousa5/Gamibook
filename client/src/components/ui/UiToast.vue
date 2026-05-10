<script setup lang="ts">
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

defineProps<{
  type?: ToastType
  title?: string
  message: string
}>()

defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div v-if="message" class="toast-card" :class="`toast--${type || 'info'}`" role="alert">
    <div class="toast-icon-wrap">
      <CheckCircleIcon v-if="type === 'success'" class="toast-icon" aria-hidden="true" />
      <XCircleIcon v-else-if="type === 'error'" class="toast-icon" aria-hidden="true" />
      <ExclamationTriangleIcon v-else-if="type === 'warning'" class="toast-icon" aria-hidden="true" />
      <InformationCircleIcon v-else class="toast-icon" aria-hidden="true" />
    </div>

    <div class="toast-body">
      <strong v-if="title" class="toast-title">{{ title }}</strong>
      <span class="toast-message">{{ message }}</span>
    </div>

    <button type="button" class="toast-close" @click="$emit('close')" aria-label="Fechar mensagem">
      <XMarkIcon class="close-icon" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.toast-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-300);
  align-items: center;
  padding: var(--space-300) var(--space-400);
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  min-width: 300px;
  max-width: 400px;
  pointer-events: all;
  z-index: 10000;
}

/* VARIAÇÕES DE ESTILO (Cores baseadas no teu UiKit) */
.toast--info {
  background: var(--color-wild-200);
  border-color: var(--color-mirage-800);
}

.toast--success {
  background: var(--color-deep-100);
  border-color: var(--color-deep-600);
}

.toast--warning {
  background: var(--color-amber-100);
  border-color: var(--color-amber-600);
}

.toast--error {
  background: var(--color-error-muted);
  border-color: var(--color-red-500);
}

/* ÍCONES */
.toast-icon-wrap {
  display: grid;
  place-items: center;
}

.toast-icon {
  width: 24px;
  height: 24px;
}

.toast--info .toast-icon {
  color: var(--color-mirage-800);
}

.toast--success .toast-icon {
  color: var(--color-deep-700);
}

.toast--warning .toast-icon {
  color: var(--color-amber-600);
}

.toast--error .toast-icon {
  color: var(--color-error-strong);
}

/* TEXTOS */
.toast-body {
  display: flex;
  flex-direction: column;
}

.toast-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-900);
}

.toast-message {
  font-size: 13px;
  color: var(--color-mirage-700);
  line-height: 1.4;
}

/* BOTÃO FECHAR */
.toast-close {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--color-mirage-500);
  border-radius: 6px;
  transition: background 0.15s ease, color 0.15s ease;
}

.toast-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-mirage-900);
}

.close-icon {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}
</style>