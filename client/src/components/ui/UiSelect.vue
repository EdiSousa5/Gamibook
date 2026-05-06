<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'

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
        <span class="trigger-text">{{ selectedLabel }}</span>
        <ChevronDownIcon class="trigger-icon" aria-hidden="true" />
      </button>
      <Transition name="menu-fade">
        <div v-if="isOpen" class="select-menu" role="listbox">
          <button v-for="option in options" :key="option.value" type="button" class="select-option"
            :class="{ active: option.value === modelValue }" @click="handleSelect(option.value)">
            {{ option.label }}
          </button>
        </div>
      </Transition>
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
  display: block;
  width: 100%;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  width: 100%;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-mirage-800);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.select-trigger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 5px 5px 0 var(--color-shadow);
  background: var(--color-wild-200);
}

.select-trigger:focus-visible {
  outline: 2px solid var(--color-deep-500);
  outline-offset: 3px;
}

.select-wrap.open .select-trigger {
  background: var(--color-wild-200);
}

.trigger-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trigger-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--color-mirage-600);
  transition: transform 0.2s ease;
}

.select-wrap.open .trigger-icon {
  transform: rotate(180deg);
}

.select-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 100%;
  max-height: 240px;
  overflow-y: auto;
  z-index: 100;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: flex;
  flex-direction: column;
  padding: 6px;
}

.select-option {
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-mirage-700);
  cursor: pointer;
  transition: background 0.1s ease, color 0.1s ease;
}

.select-option:hover {
  background: var(--color-wild-300);
  color: var(--color-mirage-900);
}

.select-option.active {
  background: var(--color-deep-500);
  color: #fff;
}

.select-wrap.disabled .select-trigger {
  background: var(--color-wild-400);
  color: var(--color-mirage-500);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.select-wrap.disabled .trigger-icon {
  opacity: 0.5;
}

/* Transition */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
