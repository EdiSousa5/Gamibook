<script setup lang="ts">
type Variant = 'primary' | 'secondary' | 'outline'
type Size = 'sm' | 'md' | 'lg'
type Shape = 'round' | 'square'

type Props = {
  variant?: Variant
  size?: Size
  shape?: Shape
  ariaLabel?: string
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  shape: 'round',
  ariaLabel: 'icon button',
  disabled: false,
})
</script>

<template>
  <button class="ui-icon-button" :class="[variant, size, `shape-${shape}`]" :disabled="disabled"
    :aria-label="ariaLabel">
    <slot>+</slot>
  </button>
</template>

<style scoped>
.ui-icon-button {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  color: var(--color-mirage-800);
  font-weight: 700;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 4px 4px 0 var(--color-shadow);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.ui-icon-button.sm {
  width: 28px;
  height: 28px;
  font-size: 12px;
}

.ui-icon-button.lg {
  width: 44px;
  height: 44px;
  font-size: 16px;
}

.ui-icon-button.primary {
  background: var(--color-wild-100);
  color: var(--color-deep-700);
}

.ui-icon-button.outline {
  background: var(--color-wild-100);
  border-color: var(--color-mirage-800);
  color: var(--color-mirage-800);
}

.ui-icon-button:hover {
  background: var(--color-deep-100);
}

.ui-icon-button:active {
  background: var(--color-deep-200);
}

.ui-icon-button:active {
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0 var(--color-shadow);
}

.ui-icon-button.shape-square {
  border-radius: 12px;
}

.ui-icon-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
