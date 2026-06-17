<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  visible: boolean
  closeOnOverlay?: boolean
}>()

const emit = defineEmits<{ close: [] }>()
const overlayRef = ref<HTMLElement | null>(null)

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

watch(() => props.visible, async (val) => {
  if (val) {
    await nextTick()
    const first = overlayRef.value?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
  }
})

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (e.key !== 'Tab') return
  const focusable = Array.from(overlayRef.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div
        v-if="visible"
        ref="overlayRef"
        class="ui-modal-overlay"
        role="dialog"
        aria-modal="true"
        v-bind="$attrs"
        @click.self="closeOnOverlay ? emit('close') : undefined"
        @keydown="handleKeydown"
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
  padding: var(--space-500);
  will-change: opacity;
}

.overlay-fade-enter-active { animation: overlay-in 0.25s ease both; }
.overlay-fade-leave-active { animation: overlay-in 0.18s ease reverse both; }

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
