<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  question: string
  answer: string
  isOpen: boolean
  number?: number
  itemId: string
}>()

defineEmits<{ toggle: [] }>()

const triggerId = computed(() => `faq-btn-${props.itemId}`)
const panelId = computed(() => `faq-panel-${props.itemId}`)
</script>

<template>
  <div class="faq-item" :class="{ 'is-open': isOpen }">
    <button
      :id="triggerId"
      class="faq-trigger"
      type="button"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      @click="$emit('toggle')"
    >
      <span class="faq-number-wrap" aria-hidden="true">
        <span class="faq-number">{{ number ?? '?' }}</span>
      </span>
      <span class="faq-q">{{ question }}</span>
      <ChevronDownIcon class="faq-chevron" :class="{ 'is-rotated': isOpen }" aria-hidden="true" />
    </button>
    <div
      :id="panelId"
      class="faq-body-wrap"
      :class="{ 'is-open': isOpen }"
      role="region"
      :aria-labelledby="triggerId"
    >
      <div class="faq-body">
        <p>{{ answer }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.faq-item {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: var(--radius-400);
  box-shadow: 4px 4px 0 var(--color-shadow);
  overflow: hidden;
  transition: box-shadow 0.15s ease, background 0.15s ease;
}

.faq-item.is-open {
  background: var(--color-wild-200);
  box-shadow: 6px 6px 0 var(--color-shadow);
}

.faq-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-400);
  padding: var(--space-400) var(--space-500);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.faq-number-wrap {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-deep-600);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s ease;
}

.faq-item.is-open .faq-number-wrap {
  background: var(--color-deep-700);
}

.faq-number {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-wild-100);
  line-height: 1;
}

.faq-q {
  flex: 1;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-mirage-900);
  line-height: 1.4;
}

.faq-chevron {
  width: 20px;
  height: 20px;
  color: var(--color-mirage-500);
  flex-shrink: 0;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.15s ease;
  stroke-width: 2;
}

.faq-chevron.is-rotated {
  transform: rotate(180deg);
  color: var(--color-deep-600);
}

.faq-body-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.faq-body-wrap.is-open {
  grid-template-rows: 1fr;
}

.faq-body {
  overflow: hidden;
  min-height: 0;
}

.faq-body p {
  margin: 0;
  padding: 0 var(--space-500) var(--space-500);
  padding-left: calc(var(--space-500) + 28px + var(--space-400));
  font-size: 14px;
  line-height: 1.75;
  color: var(--color-mirage-600);
  border-top: 2px dashed var(--color-mirage-200);
  padding-top: var(--space-400);
}
</style>
