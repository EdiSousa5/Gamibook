<script setup lang="ts">
type Props = {
  modelValue?: string | number
  label?: string
  placeholder?: string
  type?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  type: 'text',
  min: undefined,
  max: undefined,
  step: undefined,
  disabled: false,
})

defineEmits<{ update: [string | number] }>()
</script>

<template>
  <label class="ui-field">
    <span v-if="label" class="label">{{ label }}</span>
    <input :type="type" :value="modelValue" :placeholder="placeholder" :min="min" :max="max" :step="step"
      :disabled="disabled" @input="$emit('update', ($event.target as HTMLInputElement).value)" />
  </label>
</template>

<style scoped>
.ui-field {
  display: grid;
  gap: var(--space-150);
  font-weight: 600;
}

.label {
  color: var(--color-mirage-600);
  font-size: 12px;
}

input {
  padding: var(--space-200) var(--space-300);
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

input:focus {
  border-color: var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

input:disabled {
  background: var(--color-wild-400);
}
</style>
