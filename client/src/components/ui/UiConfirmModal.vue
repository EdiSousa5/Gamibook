<script setup lang="ts">
import UiButton from './UiButton.vue'
import UiModal from './UiModal.vue'

defineProps<{
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <UiModal :visible="visible" close-on-overlay @close="emit('cancel')">
    <div class="confirm-modal">
      <h3 class="confirm-title">{{ title }}</h3>
      <p class="confirm-message">{{ message }}</p>
      <div class="confirm-actions">
        <UiButton variant="outline" @click="emit('cancel')">
          {{ cancelLabel ?? 'Cancelar' }}
        </UiButton>
        <UiButton variant="primary" @click="emit('confirm')">
          {{ confirmLabel ?? 'Confirmar' }}
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>

<style scoped>
.confirm-modal {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: var(--radius-400);
  box-shadow: 8px 8px 0 var(--color-shadow);
  padding: var(--space-600);
  width: min(420px, 100%);
  display: grid;
  gap: var(--space-300);
}

.confirm-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--color-mirage-900);
}

.confirm-message {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-600);
  line-height: 1.55;
}

.confirm-actions {
  display: flex;
  gap: var(--space-200);
  justify-content: flex-end;
  margin-top: var(--space-100);
}
</style>
