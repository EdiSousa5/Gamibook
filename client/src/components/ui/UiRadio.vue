<script setup lang="ts">
type Props = {
  modelValue?: string | number
  value: string | number
  label?: string
  name?: string
  disabled?: boolean
  tone?: 'primary' | 'accent' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  name: 'radio',
  disabled: false,
  tone: 'primary',
})

defineEmits<{ update: [string | number] }>()
</script>

<template>
  <label class="ui-radio" :class="`tone-${tone}`">
    <input type="radio" :name="name" :value="value" :checked="modelValue === value" :disabled="disabled"
      @change="$emit('update', value)" />
    <span class="dot"></span>
    <span v-if="label" class="text">{{ label }}</span>
  </label>
</template>

<style scoped>
.ui-radio {
  display: inline-flex;
  align-items: center;
  gap: var(--space-200);
  cursor: pointer;
  font-weight: 600;
  position: relative;
  --dot-color: var(--color-deep-500);
}

input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.dot {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  transition: transform 0.2s ease;
}

.dot::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--dot-color);
  transform: scale(0.1);
  opacity: 0;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

input:checked+.dot {
  border-color: var(--color-mirage-800);
  box-shadow: inset 0 0 0 2px #fff;
}

input:checked+.dot::after {
  opacity: 1;
  transform: scale(1);
}

input:focus-visible+.dot {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

input:disabled+.dot {
  opacity: 0.5;
}

.tone-accent {
  --dot-color: var(--color-amber-600);
}

.tone-neutral {
  --dot-color: var(--color-mirage-500);
}
</style>
