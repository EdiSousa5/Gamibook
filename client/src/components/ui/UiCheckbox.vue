<script setup lang="ts">
type Props = {
  modelValue?: boolean
  label?: string
  disabled?: boolean
  tone?: 'primary' | 'accent' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  label: '',
  disabled: false,
  tone: 'primary',
})

defineEmits<{ update: [boolean] }>()
</script>

<template>
  <label class="ui-check" :class="`tone-${tone}`">
    <input type="checkbox" :checked="modelValue" :disabled="disabled"
      @change="$emit('update', ($event.target as HTMLInputElement).checked)" />
    <span class="box"></span>
    <span v-if="label" class="text">{{ label }}</span>
  </label>
</template>

<style scoped>
.ui-check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-200);
  cursor: pointer;
  font-weight: 600;
  position: relative;
  --check-color: var(--color-deep-500);
}

input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.box {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-100);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  transition: transform 0.2s ease, background 0.2s ease;
}

.box::after {
  content: '';
  width: 8px;
  height: 5px;
  border-left: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(-45deg) scale(0.2);
  opacity: 0;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

input:checked+.box {
  background: var(--check-color);
  border-color: var(--color-mirage-800);
  box-shadow: inset 0 0 0 2px #fff;
}

input:checked+.box::after {
  opacity: 1;
  transform: rotate(-45deg) scale(1);
}

input:focus-visible+.box {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

input:disabled+.box {
  opacity: 0.5;
}

.tone-accent {
  --check-color: var(--color-amber-600);
}

.tone-neutral {
  --check-color: var(--color-mirage-500);
}
</style>
