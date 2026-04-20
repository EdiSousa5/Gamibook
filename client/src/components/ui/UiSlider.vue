<script setup lang="ts">
type Props = {
  modelValue?: number
  min?: number
  max?: number
  step?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  min: 0,
  max: 100,
  step: 1,
})

defineEmits<{ update: [number] }>()
</script>

<template>
  <input class="ui-slider" type="range" :value="modelValue" :min="min" :max="max" :step="step"
    @input="$emit('update', Number(($event.target as HTMLInputElement).value))" />
</template>

<style scoped>
.ui-slider {
  width: 100%;
  appearance: none;
  height: 10px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  background: var(--color-wild-100);
  cursor: pointer;
}

.ui-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--color-deep-500);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 1px 1px 0 var(--color-shadow);
  transition: transform 0.2s ease;
}

.ui-slider::-webkit-slider-thumb:active {
  transform: scale(1.05);
}

.ui-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--color-deep-500);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 1px 1px 0 var(--color-shadow);
}

.ui-slider::-moz-range-track {
  height: 10px;
  background: transparent;
}
</style>
