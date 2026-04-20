<script setup lang="ts">
type Props = {
  label: string
}

defineProps<Props>()
</script>

<template>
  <span class="ui-badge">{{ label }}</span>
</template>

<style scoped>
.ui-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-050) var(--space-200);
  border-radius: var(--radius-full);
  background: var(--color-deep-600);
  color: #fff;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  font-weight: 700;
  font-size: 11px;
}
</style>
