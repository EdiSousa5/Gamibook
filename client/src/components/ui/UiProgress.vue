<script setup lang="ts">
import { computed } from 'vue'
type Props = {
  value?: number
  max?: number
}

const props = withDefaults(defineProps<Props>(), {
  value: 0,
  max: 100,
})

const percent = computed(() => Math.min(100, Math.max(0, (props.value / props.max) * 100)))
</script>

<template>
  <div class="ui-progress" role="progressbar" :aria-valuenow="value" :aria-valuemin="0" :aria-valuemax="max">
    <div class="bar" :style="{ width: `${percent}%` }"></div>
  </div>
</template>

<style scoped>
.ui-progress {
  width: 100%;
  height: 14px;
  background: var(--color-wild-100);
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  overflow: hidden;
  position: relative;
}

.bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-500));
  border-radius: inherit;
  transition: width 0.2s ease;
}

.ui-progress::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  opacity: 0.7;
  mix-blend-mode: screen;
}
</style>
