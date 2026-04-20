<script setup lang="ts">
type Variant = 'primary' | 'secondary' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

type Props = {
  variant?: Variant
  size?: Size
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
})
</script>

<template>
  <button :type="props.type" class="ui-button" :class="[variant, size]" :disabled="disabled">
    <span class="ui-button-rect" aria-hidden="true">
      <span class="ui-button-shadow"></span>
      <span class="ui-button-surface"></span>
    </span>
    <span class="ui-button-content">
      <slot name="icon-left"></slot>
      <span class="ui-button-label">
        <slot />
      </span>
      <slot name="icon-right"></slot>
    </span>
  </button>
</template>

<style scoped>
.ui-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 0;
  font-weight: 700;
  cursor: pointer;
  color: var(--color-mirage-800);
  --btn-offset-x: 4px;
  --btn-offset-y: 6px;
  --btn-face: var(--color-deep-500);
  --btn-face-hover: var(--color-deep-600);
  --btn-shadow: var(--color-shadow);
  --btn-border: var(--color-mirage-800);
  transition: transform 0.15s ease;
}

.ui-button-rect {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ui-button-shadow,
.ui-button-surface {
  position: absolute;
  inset: 0;
  border-radius: 12px;
}

.ui-button-shadow {
  background: var(--btn-shadow);
  transform: translate(var(--btn-offset-x), var(--btn-offset-y));
}

.ui-button-surface {
  background: var(--btn-face);
  border: 2px solid var(--btn-border);
  transition: transform 0.15s ease, background 0.2s ease;
}

.ui-button-content {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-200);
  padding: var(--space-200) var(--space-600);
  min-height: 64px;
  min-width: 240px;
  z-index: 1;
  transform: translate(0, 0);
  transition: transform 0.15s ease;
}

.ui-button-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  font-family: var(--font-display);
  letter-spacing: 0.3px;
}

.ui-button.sm {
  font-size: 12px;
}

.ui-button.md {
  font-size: 14px;
}

.ui-button.lg {
  font-size: 16px;
}

.ui-button.sm .ui-button-content {
  min-height: 52px;
  padding: var(--space-150) var(--space-500);
  min-width: 200px;
}

.ui-button.md .ui-button-content {
  min-height: 64px;
}

.ui-button.lg .ui-button-content {
  min-height: 76px;
  padding: var(--space-300) var(--space-700);
  min-width: 280px;
}

.ui-button.primary {
  color: #fff;
  --btn-face: var(--color-deep-500);
  --btn-face-hover: var(--color-deep-600);
  --btn-shadow: var(--color-shadow);
}

.ui-button.primary:hover {
  transform: translateY(-2px);
}

.ui-button.secondary {
  color: var(--color-mirage-800);
  --btn-face: var(--color-deep-200);
  --btn-face-hover: var(--color-deep-300);
  --btn-shadow: var(--color-shadow);
}

.ui-button.secondary:hover {
  transform: translateY(-2px);
}

.ui-button.outline {
  color: var(--color-mirage-800);
  --btn-face: var(--color-wild-100);
  --btn-face-hover: var(--color-wild-200);
  --btn-shadow: var(--color-shadow);
}

.ui-button.outline:hover {
  transform: translateY(-2px);
}

.ui-button.ghost {
  color: var(--color-mirage-800);
  --btn-face: var(--color-wild-300);
  --btn-face-hover: var(--color-wild-400);
  --btn-shadow: var(--color-shadow);
}

.ui-button.ghost:hover {
  transform: translateY(-2px);
}

.ui-button:hover .ui-button-surface {
  background: var(--btn-face-hover);
}

.ui-button:active .ui-button-surface {
  transform: translate(var(--btn-offset-x), var(--btn-offset-y));
}

.ui-button:active .ui-button-content {
  transform: translate(var(--btn-offset-x), var(--btn-offset-y));
}

.ui-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ui-button:disabled .ui-button-surface {
  background: var(--color-wild-600);
}
</style>
