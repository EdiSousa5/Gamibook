<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

type Option = { label: string; value: string }

type Props = {
  modelValue?: string
  options?: Option[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  options: () => [],
})

defineEmits<{ update: [string] }>()

const containerRef = ref<HTMLElement | null>(null)
const indicatorStyle = ref({ left: '6px', top: '6px', width: '0px', height: 'auto' })

const updateIndicator = () => {
  if (!containerRef.value) return
  const activeBtn = containerRef.value.querySelector('button.active') as HTMLElement
  if (activeBtn) {
    indicatorStyle.value = {
      left: `${activeBtn.offsetLeft}px`,
      top: `${activeBtn.offsetTop}px`,
      width: `${activeBtn.offsetWidth}px`,
      height: `${activeBtn.offsetHeight}px`
    }
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  // Atualiza imediatamente e também observa redimensionamentos
  setTimeout(updateIndicator, 50)
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateIndicator()
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
})

watch(() => props.modelValue, () => {
  nextTick(updateIndicator)
})
</script>

<template>
  <div class="ui-segmented" ref="containerRef">
    <div class="segmented-indicator" :style="indicatorStyle" aria-hidden="true"></div>
    <button v-for="option in options" :key="option.value" type="button" :class="{ active: option.value === modelValue }"
      @click="$emit('update', option.value)">
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.ui-segmented {
  position: relative;
  display: inline-flex;
  background: var(--color-wild-100);
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  padding: 6px 12px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  z-index: 1;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.ui-segmented::-webkit-scrollbar {
  display: none;
}

.segmented-indicator {
  position: absolute;
  border-radius: 999px;
  background: var(--color-teal-500);
  transition: all 0.3s ease-out;
  box-shadow: 3px 3px 0 var(--color-shadow);
  z-index: -1;
}

.ui-segmented button {
  position: relative;
  border: none;
  background: transparent;
  padding: 10px 20px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
  color: var(--color-mirage-600);
  transition: color 0.3s ease;
  z-index: 2;
  outline: none;
}

.ui-segmented button.active {
  color: var(--color-wild-100);
}

.ui-segmented button:hover:not(.active) {
  color: var(--color-teal-600);
}

.ui-segmented button:focus-visible {
  box-shadow: 0 0 0 2px var(--color-teal-500);
}

@media (max-width: 37.5em) {
  .ui-segmented {
    padding: 4px 8px;
    flex-wrap: nowrap;
  }

  .ui-segmented button {
    padding: 8px 12px;
    font-size: 12px;
    white-space: nowrap;
    flex-shrink: 0;
  }
}
</style>
