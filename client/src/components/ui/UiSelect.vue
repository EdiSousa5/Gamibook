<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Option = { label: string; value: string | number }

type Props = {
  modelValue?: string | number | null
  label?: string
  options?: Option[]
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  label: '',
  options: () => [],
  placeholder: 'Seleciona',
  disabled: false,
})

const emit = defineEmits<{ update: [string | number | null] }>()
const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  const current = props.options.find((option) => option.value === props.modelValue)
  return current?.label || props.placeholder
})

const toggleOpen = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

const close = () => {
  isOpen.value = false
}

const handleSelect = (value: string | number) => {
  emit('update', value)
  close()
}

const onDocumentClick = (event: MouseEvent) => {
  if (!rootRef.value) return
  if (!rootRef.value.contains(event.target as Node)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <label class="ui-field" ref="rootRef">
    <span v-if="label" class="label">{{ label }}</span>
    <div class="select-wrap" :class="{ open: isOpen, disabled }">
      <button class="select-trigger" type="button" :disabled="disabled" :aria-expanded="isOpen" @click="toggleOpen">
        <span>{{ selectedLabel }}</span>
      </button>
      <div v-if="isOpen" class="select-menu" role="listbox">
        <button v-for="option in options" :key="option.value" type="button" class="select-option"
          :class="{ active: option.value === modelValue }" @click="handleSelect(option.value)">
          {{ option.label }}
        </button>
      </div>
    </div>
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

.select-wrap {
  position: relative;
  display: grid;
  gap: 0;
}

.select-trigger {
  padding: var(--space-200) var(--space-300);
  padding-right: calc(var(--space-600) + 10px);
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  width: 100%;
  text-align: left;
  font-weight: 600;
  cursor: pointer;
  position: relative;
}

.select-wrap::after {
  content: '';
  position: absolute;
  right: var(--space-300);
  top: 16px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 7px solid var(--color-mirage-600);
  pointer-events: none;
}

.select-wrap.open .select-trigger {
  background: var(--color-deep-500);
  color: #fff;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.select-wrap.open::after {
  border-top-color: #fff;
}

.select-menu {
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  border-top: 0;
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  overflow: hidden;
  display: grid;
  margin-top: -2px;
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
}

.select-option {
  padding: var(--space-200) var(--space-300);
  background: transparent;
  border: none;
  text-align: left;
  font-weight: 600;
  cursor: pointer;
}

.select-option:hover {
  background: var(--color-wild-300);
}

.select-option.active {
  background: var(--color-deep-500);
  color: #fff;
  box-shadow: inset 0 0 0 2px var(--color-mirage-800);
}

.select-trigger:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

.select-wrap.disabled .select-trigger {
  background: var(--color-wild-400);
  color: var(--color-mirage-500);
  cursor: not-allowed;
}

.select-wrap.disabled::after {
  opacity: 0.5;
}
</style>
