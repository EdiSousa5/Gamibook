<script setup lang="ts">
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import UiIconButton from './UiIconButton.vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

withDefaults(
  defineProps<{
    type?: ToastType
    title?: string
    message: string
    duration?: number
  }>(),
  { type: 'info', duration: 4000 },
)

defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <div
    v-if="message"
    class="toast-card"
    :class="`toast--${type}`"
    :style="{ '--toast-dur': `${duration}ms` }"
    role="alert"
  >
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

    <UiIconButton
      size="sm"
      variant="outline"
      aria-label="Fechar mensagem"
      class="toast-close-btn"
      @click="$emit('close')"
    >
      <XMarkIcon class="close-icon" aria-hidden="true" />
    </UiIconButton>

    <div class="toast-progress" />
  </div>
</template>

<style scoped>
.toast-card {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-300);
  align-items: center;
  padding: var(--space-300) var(--space-400);
  padding-bottom: calc(var(--space-300) + 4px);
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  min-width: 300px;
  max-width: 400px;
  pointer-events: all;
  overflow: hidden;
}

/* ── Variações ─────────────────────────── */
.toast--info    { background: var(--color-wild-200); border-color: var(--color-mirage-800); }
.toast--success { background: var(--color-deep-100); border-color: var(--color-deep-600); }
.toast--warning { background: var(--color-amber-100); border-color: var(--color-amber-600); }
.toast--error   { background: var(--color-error-muted); border-color: var(--color-red-500); }

/* ── Ícone ─────────────────────────────── */
.toast-icon-wrap {
  display: grid;
  place-items: center;
}

.toast-icon { width: 22px; height: 22px; }

.toast--info    .toast-icon { color: var(--color-mirage-800); }
.toast--success .toast-icon { color: var(--color-deep-700); }
.toast--warning .toast-icon { color: var(--color-amber-600); }
.toast--error   .toast-icon { color: var(--color-error-strong); }

/* ── Texto ─────────────────────────────── */
.toast-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.toast-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-mirage-900);
}

.toast-message {
  font-size: 13px;
  color: var(--color-mirage-700);
  line-height: 1.4;
}

/* ── Botão fechar ──────────────────────── */
.toast-close-btn {
  flex-shrink: 0;
  align-self: flex-start;
}

.close-icon {
  width: 14px;
  height: 14px;
  stroke-width: 2.5;
}

/* ── Progress bar ──────────────────────── */
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  width: 100%;
  transform-origin: left;
  animation: toast-progress var(--toast-dur, 4000ms) linear forwards;
}

.toast--info    .toast-progress { background: var(--color-mirage-600); }
.toast--success .toast-progress { background: var(--color-deep-600); }
.toast--warning .toast-progress { background: var(--color-amber-600); }
.toast--error   .toast-progress { background: var(--color-red-500); }

@keyframes toast-progress {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}
</style>
