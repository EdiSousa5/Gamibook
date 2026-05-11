<script setup lang="ts">
defineProps<{
  title: string
  description: string
  count: number
  active: boolean
  disabled: boolean
}>()

defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    class="mode-card"
    :class="{ active, disabled }"
    :disabled="disabled"
    @click="$emit('select')"
  >
    <span class="mode-card__shadow" aria-hidden="true" />
    <span class="mode-card__surface">
      <span class="mode-card__top">
        <span class="mode-title">{{ title }}</span>
        <span class="mode-count">{{ count }}</span>
      </span>
      <p class="mode-desc">{{ description }}</p>
    </span>
  </button>
</template>

<style scoped>
.mode-card {
  position: relative;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  display: block;
  width: 100%;
  height: 100%;
  --offset-x: 4px;
  --offset-y: 4px;
  animation: card-appear 0.25s ease both;
}

.mode-card:nth-child(1) { animation-delay: 0.04s; }
.mode-card:nth-child(2) { animation-delay: 0.08s; }
.mode-card:nth-child(3) { animation-delay: 0.12s; }

.mode-card.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Shadow layer (static) ── */
.mode-card__shadow {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: var(--color-shadow);
  transform: translate(var(--offset-x), var(--offset-y));
  pointer-events: none;
}

/* ── Surface layer ── */
.mode-card__surface {
  position: relative;
  display: grid;
  gap: 10px;
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  z-index: 1;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

/* Hover lift — applies to all non-disabled cards */
.mode-card:hover:not(.disabled) .mode-card__surface {
  transform: translateY(-2px);
  background: var(--color-wild-200);
}

/* Press — !important to beat hover specificity */
.mode-card:active:not(.disabled) .mode-card__surface {
  transform: translate(var(--offset-x), var(--offset-y)) !important;
  transition-duration: 0.06s;
}

/* Selected — same palette as the primary "Começar" button */
.mode-card.active .mode-card__surface {
  background: var(--color-deep-500);
  border-color: var(--color-mirage-800);
}

.mode-card.active:hover:not(.disabled) .mode-card__surface {
  background: var(--color-deep-600);
}

/* ── Contents ── */
.mode-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mode-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-mirage-800);
  transition: color 0.15s ease;
}

.mode-card.active .mode-title {
  color: #fff;
}

.mode-count {
  padding: 2px 8px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-mirage-600);
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.mode-card.active .mode-count {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
}

.mode-desc {
  margin: 0;
  font-size: 12px;
  color: var(--color-mirage-600);
  line-height: 1.4;
  transition: color 0.15s ease;
}

.mode-card.active .mode-desc {
  color: rgba(255, 255, 255, 0.75);
}

@keyframes card-appear {
  from {
    transform: translateY(8px) scale(0.97);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
</style>
