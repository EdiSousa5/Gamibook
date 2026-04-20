<script setup lang="ts">
type Props = {
  modelValue?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
  tone?: 'primary' | 'accent' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  size: 'md',
  tone: 'primary',
})

defineEmits<{ update: [boolean] }>()
</script>

<template>
  <button class="ui-switch" :class="[{ on: modelValue }, `size-${size}`, `tone-${tone}`]" :disabled="disabled"
    type="button" @click="$emit('update', !modelValue)">
    <span class="thumb"></span>
  </button>
</template>

<style scoped>
.ui-switch {
  width: var(--switch-width);
  height: var(--switch-height);
  border-radius: var(--radius-full);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  position: relative;
  cursor: pointer;
  padding: 3px;
  box-shadow: 3px 3px 0 var(--color-shadow);
  display: inline-flex;
  align-items: center;
  transition: background 0.2s ease, transform 0.2s ease;
  --switch-width: 52px;
  --switch-height: 28px;
  --thumb-size: 20px;
  --switch-color: var(--color-deep-500);
}

.ui-switch.on {
  background: var(--color-deep-200);
}

.thumb {
  width: var(--thumb-size);
  height: var(--thumb-size);
  border-radius: var(--radius-full);
  background: var(--switch-color);
  border: 2px solid var(--color-mirage-800);
  display: block;
  transition: transform 0.25s ease, background 0.2s ease;
}

.ui-switch.on .thumb {
  transform: translateX(calc(var(--switch-width) - var(--thumb-size) - 10px));
}

.ui-switch:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ui-switch:active {
  transform: translateY(1px);
}

.size-sm {
  --switch-width: 42px;
  --switch-height: 22px;
  --thumb-size: 16px;
}

.tone-accent {
  --switch-color: var(--color-amber-600);
}

.tone-neutral {
  --switch-color: var(--color-mirage-500);
}
</style>
