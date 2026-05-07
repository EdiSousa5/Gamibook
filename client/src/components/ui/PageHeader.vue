<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  kicker?: string
}>()
</script>

<template>
  <div class="page-header">
    <span v-if="kicker" class="page-header__kicker">{{ kicker }}</span>
    <h1 class="page-header__title">{{ title }}</h1>
    <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.page-header {
  display: grid;
  gap: var(--space-100);
}

.page-header__kicker {
  display: inline-flex;
  align-self: start;
  padding: 3px 10px;
  border-radius: 999px;
  border: 2px solid var(--color-deep-600);
  background: var(--color-deep-100);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--color-deep-700);
  width: fit-content;
}

.page-header__title {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  color: var(--color-mirage-900);
  line-height: 1.1;
}

.page-header__subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-500);
  line-height: 1.5;
}
</style>
