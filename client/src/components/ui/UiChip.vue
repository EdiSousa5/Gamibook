<script setup lang="ts">
type Variant = 'filled' | 'outline' | 'soft'

type Props = {
  label: string
  variant?: Variant
}

withDefaults(defineProps<Props>(), {
  variant: 'soft',
})
</script>

<template>
  <span class="ui-chip" :class="variant">{{ label }}</span>
</template>

<style scoped>
.ui-chip {
  display: inline-flex;
  align-items: center;
  padding: var(--space-100) var(--space-300);
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  font-weight: 700;
  font-size: 12px;
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.ui-chip.soft {
  background: var(--color-deep-100);
  color: var(--color-deep-700);
}

.ui-chip.filled {
  background: var(--color-deep-600);
  color: #fff;
}

.ui-chip.outline {
  background: var(--color-wild-100);
  color: var(--color-mirage-800);
}
</style>
