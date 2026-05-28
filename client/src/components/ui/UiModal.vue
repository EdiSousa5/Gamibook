<script setup lang="ts">
defineOptions({ inheritAttrs: false })

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
        v-bind="$attrs"
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
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  padding: 24px;
  will-change: opacity;
}

.overlay-fade-enter-active { animation: overlay-in 0.25s ease both; }
.overlay-fade-leave-active { animation: overlay-in 0.18s ease reverse both; }

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
