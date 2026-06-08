<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  delta?: string | number
  deltaVariant?: 'streak'
}>()
</script>

<template>
  <div class="stat-card">
    <slot name="icon" />
    <div class="stat-card__body">
      <span class="stat-card__label">{{ label }}</span>
      <span class="stat-card__value"><slot name="value">{{ value }}</slot></span>
    </div>
    <span
      v-if="delta"
      class="stat-card__delta"
      :class="deltaVariant ? `stat-card__delta--${deltaVariant}` : ''"
    >{{ delta }}</span>
  </div>
</template>

<style scoped>
.stat-card {
  position: relative;
  padding: 12px 16px;
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  overflow: visible;
}

.stat-card__body {
  display: grid;
  gap: 1px;
}

.stat-card__label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
  font-weight: 700;
}

.stat-card__value {
  font-size: 20px;
  color: var(--color-mirage-800);
  line-height: 1;
}

.stat-card__delta {
  position: absolute;
  right: 8px;
  top: -10px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--color-teal-200);
  border: 2px solid var(--color-mirage-800);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-mirage-800);
  animation: delta-pop 1.4s ease;
}

.stat-card__delta--streak {
  background: var(--color-pumpkin-100, #fff0e0);
  border-color: var(--color-pumpkin-500, #f07c00);
  color: var(--color-pumpkin-700, #a34d00);
}

@keyframes delta-pop {
  0%   { transform: translateY(10px) scale(0.9);  opacity: 0; }
  55%  { transform: translateY(-4px) scale(1.06); opacity: 1; }
  100% { transform: translateY(0)    scale(1);    opacity: 1; }
}

@media (max-width: 25em) {
  .stat-card {
    padding: 10px 12px;
    gap: 8px;
  }

  .stat-card__value {
    font-size: 17px;
  }
}
</style>
