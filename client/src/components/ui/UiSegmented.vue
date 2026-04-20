<script setup lang="ts">
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
</script>

<template>
  <div class="ui-segmented">
    <button v-for="option in options" :key="option.value" type="button" :class="{ active: option.value === modelValue }"
      @click="$emit('update', option.value)">
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.ui-segmented {
  display: inline-flex;
  background: var(--color-wild-100);
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  padding: var(--space-050);
  gap: var(--space-050);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.ui-segmented button {
  border: 2px solid transparent;
  background: transparent;
  padding: var(--space-150) var(--space-300);
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  color: var(--color-mirage-800);
}

.ui-segmented button.active {
  background: var(--color-deep-200);
  border-color: var(--color-mirage-800);
  color: var(--color-mirage-800);
}
</style>
