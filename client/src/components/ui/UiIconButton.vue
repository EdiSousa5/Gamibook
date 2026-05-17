<script setup lang="ts">
type Variant = 'primary' | 'secondary' | 'outline' | 'read'
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
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.ui-icon-button.sm {
  width: 28px;
  height: 28px;
  font-size: 12px;
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.ui-icon-button.lg {
  width: 44px;
  height: 44px;
  font-size: 16px;
}

/* Variants */
.ui-icon-button.primary {
  background: var(--color-wild-100);
  color: var(--color-deep-700);
}

.ui-icon-button.outline {
  background: var(--color-wild-100);
  border-color: var(--color-mirage-800);
  color: var(--color-mirage-800);
}

.ui-icon-button.read {
  background: var(--color-deep-100);
  color: var(--color-deep-700);
}

/* Hover — lift */
.ui-icon-button:not(:disabled):hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--color-shadow);
  background: var(--color-deep-100);
}

.ui-icon-button.sm:not(:disabled):hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.ui-icon-button.read:not(:disabled):hover {
  background: var(--color-deep-200);
}

/* Active — press into shadow */
.ui-icon-button:not(:disabled):active {
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0 var(--color-shadow);
}

.ui-icon-button.sm:not(:disabled):active {
  transform: translate(2px, 2px);
  box-shadow: 0px 0px 0 var(--color-shadow);
}

/* Shape */
.ui-icon-button.shape-square {
  border-radius: 8px;
}

.ui-icon-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
