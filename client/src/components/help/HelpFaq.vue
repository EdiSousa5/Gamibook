<script setup lang="ts">
import { ref } from 'vue'
import HelpFaqItem from './HelpFaqItem.vue'

const props = defineProps<{
  faqs: Array<{ q: string; a: string }>
  prefix?: string
}>()

const openIndex = ref<number | null>(null)
const toggle = (i: number) => {
  openIndex.value = openIndex.value === i ? null : i
}

const itemId = (i: number) => {
  const base = props.prefix
    ? props.prefix.toLowerCase().replace(/\s+/g, '-')
    : 'faq'
  return `${base}-${i}`
}
</script>

<template>
  <div class="faq-list">
    <HelpFaqItem
      v-for="(faq, i) in faqs"
      :key="i"
      :question="faq.q"
      :answer="faq.a"
      :is-open="openIndex === i"
      :number="i + 1"
      :item-id="itemId(i)"
      @toggle="toggle(i)"
    />
  </div>
</template>

<style scoped>
.faq-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}
</style>
