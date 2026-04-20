<script setup lang="ts">
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
type Props = {
  modelValue?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Pesquisa um livro ou um autor...',
})

defineEmits<{ update: [string] }>()
</script>

<template>
  <div class="ui-search">
    <input :value="modelValue" :placeholder="placeholder"
      @input="$emit('update', ($event.target as HTMLInputElement).value)" />
    <MagnifyingGlassIcon class="icon" aria-hidden="true" />
  </div>
</template>

<style scoped>
.ui-search {
  position: relative;
  width: 100%;
}

.ui-search input {
  width: 100%;
  padding: var(--space-200) var(--space-400);
  padding-right: 42px;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--color-mirage-700);
  stroke-width: var(--icon-stroke);
}
</style>
