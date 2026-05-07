<script setup lang="ts">
defineProps<{
  visible: boolean
  closeOnOverlay?: boolean
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div
        v-if="visible"
        class="ui-modal-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="closeOnOverlay ? emit('close') : undefined"
      >
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ui-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 24px;
}

.overlay-fade-enter-active { animation: overlay-in 0.3s ease both; }
.overlay-fade-leave-active { animation: overlay-in 0.2s ease reverse both; }

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
