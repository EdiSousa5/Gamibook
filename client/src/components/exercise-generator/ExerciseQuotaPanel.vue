<script setup lang="ts">
import { computed } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiProgress from '@/components/ui/UiProgress.vue'

const props = defineProps<{
  used: number
  limit: number
  isLoading?: boolean
}>()

const remaining = computed(() => Math.max(0, props.limit - props.used))

const isExhausted = computed(() => remaining.value <= 0)
const isLow = computed(() => !isExhausted.value && remaining.value <= Math.ceil(props.limit * 0.15))
</script>

<template>
  <UiCard class="quota-card" :class="{ 'is-low': isLow, 'is-exhausted': isExhausted }">
    <div class="quota-header">
      <div class="quota-icon" :class="{ 'is-low': isLow, 'is-exhausted': isExhausted }">
        <span class="quota-icon-text">Q</span>
      </div>
      <div>
        <h3 class="quota-title">Quota Diária</h3>
        <p class="quota-subtitle">Exercícios gerados hoje</p>
      </div>
    </div>

    <div class="quota-divider"></div>

    <div class="quota-body">
      <div class="quota-row">
        <span class="quota-label">Gerados hoje</span>
        <span class="quota-value" :class="{ 'is-low': isLow, 'is-exhausted': isExhausted }">
          {{ isLoading ? '—' : used }}
        </span>
      </div>
      <div class="quota-row">
        <span class="quota-label">Limite diário</span>
        <span class="quota-value">{{ limit }}</span>
      </div>
      <div class="quota-row quota-row--highlight">
        <span class="quota-label">Restam hoje</span>
        <span class="quota-remaining" :class="{ 'is-low': isLow, 'is-exhausted': isExhausted }">
          {{ isLoading ? '—' : remaining }}
        </span>
      </div>
    </div>

    <UiProgress :value="used" :max="limit" />

    <p class="quota-reset">
      {{ isExhausted ? 'Limite atingido. Renova amanhã à meia-noite.' : 'Renova todos os dias à meia-noite.' }}
    </p>
  </UiCard>
</template>

<style scoped>
.quota-card {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-900);
  border-radius: var(--radius-400);
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.quota-card.is-low {
  border-color: #92400e;
  background: #fffbeb;
}

.quota-card.is-exhausted {
  border-color: #991b1b;
  background: #fff1f1;
}

/* Header */
.quota-header {
  display: flex;
  align-items: center;
  gap: var(--space-300);
}

.quota-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--color-deep-600);
  color: var(--color-wild-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  border: 2px solid var(--color-mirage-900);
  box-shadow: 2px 2px 0 var(--color-shadow);
  flex-shrink: 0;
  transition: background 0.2s ease;
}

.quota-icon.is-low { background: #d97706; }
.quota-icon.is-exhausted { background: #dc2626; }

.quota-icon-text {
  line-height: 1;
}

.quota-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-mirage-900);
}

.quota-subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-mirage-500);
  font-weight: 600;
}

/* Divider */
.quota-divider {
  border: none;
  border-top: 2px dashed var(--color-mirage-200);
}

/* Rows */
.quota-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
}

.quota-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quota-row--highlight {
  padding: var(--space-200) var(--space-300);
  background: var(--color-wild-200);
  border-radius: var(--radius-200);
  border: 1.5px solid var(--color-mirage-200);
}

.quota-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-700);
}

.quota-value {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-mirage-900);
}

.quota-value.is-low { color: #92400e; }
.quota-value.is-exhausted { color: #991b1b; }

.quota-remaining {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-deep-600);
  line-height: 1;
}

.quota-remaining.is-low { color: #d97706; }
.quota-remaining.is-exhausted { color: #dc2626; }

/* Reset note */
.quota-reset {
  margin: 0;
  font-size: 11px;
  color: var(--color-mirage-400);
  font-weight: 600;
}
</style>
