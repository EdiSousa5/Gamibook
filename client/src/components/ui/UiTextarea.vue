<script setup lang="ts">
type Props = {
  modelValue?: string
  label?: string
  placeholder?: string
  rows?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  rows: 3,
  disabled: false,
})

defineEmits<{ update: [string] }>()
</script>

<template>
  <label class="ui-field">
    <span v-if="label" class="label">{{ label }}</span>
    <textarea :rows="rows" :value="modelValue" :placeholder="placeholder" :disabled="disabled"
      @input="$emit('update', ($event.target as HTMLTextAreaElement).value)"></textarea>
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

textarea {
  padding: var(--space-300);
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  resize: vertical;
  box-shadow: 4px 4px 0 var(--color-shadow);
}

textarea:focus {
  border-color: var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
}
</style>
