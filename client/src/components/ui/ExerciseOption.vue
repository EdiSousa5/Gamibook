<script setup lang="ts">
import { getOptionText } from '@/utils/exerciseUtils'

const props = defineProps<{
  value: string
  index: number
  selected?: boolean
  attempted?: boolean
  correct?: boolean
  wrong?: boolean
  locked?: boolean
}>()

const emit = defineEmits<{ select: [value: string] }>()
</script>

<template>
  <button class="option"
    :class="{ selected: props.selected, attempted: props.attempted, correct: props.correct, wrong: props.wrong, locked: props.locked }"
    type="button" @click="emit('select', props.value)">
    <span class="option-shadow"></span>
    <span class="option-panel"></span>
    <span class="option-content">
      <span class="option-letter">
        <span class="letter-shadow"></span>
        <span class="letter-face"></span>
        <span class="letter-text">{{ String.fromCharCode(65 + props.index) }}</span>
      </span>
      <span class="option-text">{{ getOptionText(props.value) }}</span>
    </span>
  </button>
</template>

<style scoped>
.option {
  position: relative;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  transition: color 0.15s ease;
  --option-press-x: 3px;
  --option-press-y: 4px;
  --option-shadow-x: 14px;
  --option-shadow-y: 12px;
}

.option-shadow {
  position: absolute;
  inset: var(--option-shadow-y) 0 0 var(--option-shadow-x);
  background: var(--color-shadow);
  border-radius: 12px;
  z-index: 0;
  transform: translate(var(--option-press-x), var(--option-press-y));
  transition: background 0.2s ease;
}

.option-panel {
  position: absolute;
  inset: 0;
  background: var(--color-wild-100);
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  z-index: 1;
  transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
  transform: translate(0, 0);
}

.option-content {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 16px;
  padding: 24px 22px;
  transform: translate(0, 0);
  transition: transform 0.15s ease;
}

.option-letter {
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
}

.letter-shadow {
  position: absolute;
  inset: 0;
  background: var(--color-shadow);
  border-radius: 999px;
  transition: background 0.2s ease, opacity 0.15s ease;
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.letter-face {
  position: absolute;
  inset: 0;
  background: var(--color-wild-100);
  border-radius: 999px;
  border: 2px solid #373737;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.letter-text {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 28px;
  font-weight: 600;
  color: var(--color-mirage-800);
  transition: color 0.2s ease;
}

.option-text {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-mirage-800);
  transition: color 0.2s ease;
}

/* ── Hover (mouse only — not touch) ──────────────── */
@media (hover: hover) {
  .option:not(.locked):not(.selected):not(.correct):not(.wrong):not(.attempted):hover .option-panel {
    background: var(--color-teal-300);
  }

  .option:not(.locked):not(.selected):not(.correct):not(.wrong):not(.attempted):hover .option-shadow {
    background: var(--color-deep-600);
  }

  .option:not(.locked):not(.selected):not(.correct):not(.wrong):not(.attempted):hover .letter-shadow {
    background: var(--color-deep-600);
  }

  .option:not(.locked):not(.selected):not(.correct):not(.wrong):not(.attempted):hover .letter-face {
    background: var(--color-teal-100);
  }
}

/* ── Pressed (:active) ───────────────────────────── */
.option:active .option-panel {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option:active .option-content {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option:active .letter-shadow {
  opacity: 0;
}

/* ── Selected ────────────────────────────────────── */
.option.selected .option-panel {
  background: var(--color-teal-500);
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.selected .option-shadow {
  background: var(--color-deep-1000);
}

.option.selected .option-content {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.selected .letter-face {
  background: var(--color-deep-200);
}

.option.selected .letter-shadow {
  opacity: 0;
}

.option.selected .option-text {
  color: var(--color-wild-100);
}

/* ── Attempted (wrong answer already tried) ──────── */
.option.attempted .option-panel {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.attempted .option-content {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.attempted .letter-shadow {
  opacity: 0;
}

/* ── Correct ─────────────────────────────────────── */
.option.correct .option-panel {
  background: var(--color-deep-600);
  border-color: var(--color-deep-700);
  transform: translate(var(--option-press-x), var(--option-press-y));
  animation: option-correct 0.4s ease;
}

.option.correct .option-shadow {
  background: var(--color-deep-800);
}

.option.correct .option-content {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.correct .option-text {
  color: var(--color-brand-white);
}

.option.correct .letter-face {
  background: var(--color-deep-400);
  border-color: var(--color-deep-700);
}

.option.correct .letter-text {
  color: var(--color-brand-white);
}

.option.correct .letter-shadow {
  opacity: 0;
}

/* Revealed correct after failure — lighter teal to distinguish from "I answered correctly" */
.option.correct:not(.selected) .option-panel {
  background: var(--color-teal-500);
  border-color: var(--color-teal-700);
}

.option.correct:not(.selected) .option-shadow {
  background: var(--color-teal-800);
}

/* ── Wrong ───────────────────────────────────────── */
.option.wrong .option-panel {
  background: var(--color-error-muted);
  border-color: var(--color-red-500);
  transform: translate(var(--option-press-x), var(--option-press-y));
  animation: option-wrong 0.4s ease;
}

.option.wrong .option-shadow {
  background: var(--color-red-700, var(--color-crimson-700));
}

.option.wrong .option-content {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.wrong .letter-face {
  background: var(--color-red-200);
  border-color: var(--color-red-500);
}

.option.wrong .letter-shadow {
  opacity: 0;
}

.option.wrong .letter-text {
  color: var(--color-error-strong);
}

.option.wrong .option-text {
  color: var(--color-error-strong);
}

/* ── Locked ──────────────────────────────────────── */
.option.locked {
  cursor: not-allowed;
}

/* ── Mobile ──────────────────────────────────────── */
@media (max-width: 640px) {
  .option {
    --option-press-x: 2px;
    --option-press-y: 3px;
    --option-shadow-x: 10px;
    --option-shadow-y: 8px;
  }

  .option-content {
    padding: 14px 14px;
    gap: 10px;
  }

  .option-letter {
    width: 40px;
    height: 40px;
  }

  .letter-text {
    font-size: 20px;
  }

  .option-text {
    font-size: 15px;
    line-height: 1.35;
  }
}

/* ── Animations ──────────────────────────────────── */
@keyframes option-correct {
  0%   { transform: translate(var(--option-press-x), var(--option-press-y)) scale(1); }
  25%  { transform: translate(var(--option-press-x), var(--option-press-y)) scale(1.02); }
  60%  { transform: translate(var(--option-press-x), var(--option-press-y)) scale(0.99); }
  100% { transform: translate(var(--option-press-x), var(--option-press-y)) scale(1); }
}

@keyframes option-wrong {
  0%   { transform: translate(var(--option-press-x), var(--option-press-y)); }
  18%  { transform: translate(calc(var(--option-press-x) - 4px), var(--option-press-y)); }
  36%  { transform: translate(calc(var(--option-press-x) + 4px), var(--option-press-y)); }
  54%  { transform: translate(calc(var(--option-press-x) - 3px), var(--option-press-y)); }
  72%  { transform: translate(calc(var(--option-press-x) + 3px), var(--option-press-y)); }
  100% { transform: translate(var(--option-press-x), var(--option-press-y)); }
}
</style>
