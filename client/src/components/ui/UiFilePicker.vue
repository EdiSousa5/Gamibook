<script setup lang="ts">
import { computed } from 'vue'
import { PaperClipIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  label?: string
  accept?: string
  modelValue?: File | null
}>()

const emit = defineEmits<{
  'update:modelValue': [File | null]
}>()

const fileName = computed(() => props.modelValue?.name ?? 'Nenhum ficheiro escolhido')

const onChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  emit('update:modelValue', file)
}

const clear = (event: MouseEvent) => {
  event.preventDefault()
  emit('update:modelValue', null)
}
</script>

<template>
  <label class="file-field">
    <span v-if="label" class="field-label">{{ label }}</span>
    <div class="file-picker" :class="{ 'has-file': !!modelValue }">
      <PaperClipIcon class="file-icon" aria-hidden="true" />
      <span class="file-name">{{ fileName }}</span>
      <button v-if="modelValue" type="button" class="clear-btn" :aria-label="`Remover ${fileName}`" @click="clear">
        <XMarkIcon class="clear-icon" aria-hidden="true" />
      </button>
      <span v-else class="file-btn" aria-hidden="true">
        <span class="file-btn-shadow" />
        <span class="file-btn-face">Selecionar</span>
      </span>
      <input type="file" :accept="accept" @change="onChange" />
    </div>
  </label>
</template>

<style scoped>
.file-field {
  display: grid;
  gap: var(--space-150);
}

.field-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-600);
}

.file-picker {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-200);
  padding: var(--space-200) var(--space-300);
  border-radius: 999px;
  border: 2px dashed var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  cursor: pointer;
  transition: background 0.15s ease;
}

.file-picker:hover {
  background: var(--color-wild-200);
}

.file-picker.has-file {
  border-style: solid;
  border-color: var(--color-deep-500);
}

.file-picker input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.file-icon {
  width: 18px;
  height: 18px;
  color: var(--color-mirage-700);
  flex-shrink: 0;
}

.file-name {
  font-size: 13px;
  color: var(--color-mirage-600);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.has-file .file-name {
  color: var(--color-mirage-800);
  font-weight: 600;
}

/* Selecionar button with press animation */
.file-btn {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}

.file-btn-shadow {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--color-shadow);
  transform: translate(3px, 4px);
}

.file-btn-face {
  position: relative;
  display: inline-block;
  padding: 5px 12px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  transition: transform 0.15s ease, background 0.15s ease;
}

.file-picker:hover .file-btn-face {
  background: var(--color-wild-200);
  transform: translateY(-1px);
}

.file-picker:active .file-btn-face {
  transform: translate(3px, 4px);
  background: var(--color-wild-200);
}

.clear-btn {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
  cursor: pointer;
  transition: background 0.15s ease;
  flex-shrink: 0;
}

.clear-btn:hover {
  background: var(--color-wild-400);
}

.clear-icon {
  width: 12px;
  height: 12px;
  stroke-width: 2.5;
  color: var(--color-mirage-700);
}
</style>
