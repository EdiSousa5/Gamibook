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
  --option-press-x: clamp(3px, 0.6vw, 4px);
  --option-press-y: clamp(4px, 0.9vw, 6px);
  --option-shadow-x: clamp(12px, 2.6vw, 20px);
  --option-shadow-y: clamp(10px, 2.2vw, 16px);
}

.option-shadow {
  position: absolute;
  inset: var(--option-shadow-y) 0 0 var(--option-shadow-x);
  background: var(--color-shadow);
  border-radius: 12px;
  z-index: 0;
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option-panel {
  position: absolute;
  inset: 0;
  background: var(--color-wild-100);
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  z-index: 1;
  transition: transform 0.15s ease, background 0.2s ease;
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
  transition: transform 0.2s ease;
}

.letter-shadow {
  position: absolute;
  inset: 0;
  background: var(--color-shadow);
  border-radius: 999px;
  transition: transform 0.2s ease, background 0.2s ease, opacity 0.2s ease;
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.letter-face {
  position: absolute;
  inset: 0;
  background: var(--color-wild-100);
  border-radius: 999px;
  border: 2px solid #373737;
  transition: transform 0.2s ease, background 0.2s ease;
}

.letter-text {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 28px;
  font-weight: 600;
  color: var(--color-mirage-800);
  transition: transform 0.2s ease, color 0.2s ease;
}

.option-text {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-mirage-800);
}

.option:hover .option-panel {
  background: var(--color-teal-300);
}

.option:hover .option-shadow {
  background: var(--color-deep-600);
}

.option:hover .letter-shadow {
  background: var(--color-deep-600);
}

.option:hover .letter-face {
  background: var(--color-teal-100);
}

.option:active .option-panel,
.option.selected .option-panel {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option:active .option-content,
.option.selected .option-content,
.option.attempted .option-content {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option:active .letter-face,
.option:active .letter-text {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option:active .letter-shadow,
.option.selected .letter-shadow,
.option.attempted .letter-shadow {
  opacity: 0;
}

.option.selected .option-panel {
  background: var(--color-teal-500);
}

.option.selected .option-shadow {
  background: var(--color-deep-1000);
}

.option.selected .letter-face {
  background: var(--color-deep-200);
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.selected .letter-text {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.selected .option-text {
  color: var(--color-wild-100);
}

.option.attempted .option-panel,
.option.attempted .letter-face,
.option.attempted .letter-text {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.option.correct .option-panel {
  background: var(--color-deep-600);
  animation: option-correct 0.4s ease;
}

.option.wrong .option-panel {
  background: var(--color-error-muted);
  border-color: var(--color-red-500);
  animation: option-wrong 0.4s ease;
}

.option.wrong .letter-face {
  background: var(--color-red-200);
  border-color: var(--color-red-500);
}

.option.wrong .letter-shadow {
  background: var(--color-red-500);
}

.option.wrong .letter-text {
  color: var(--color-error-strong);
}

.option.wrong .option-text {
  color: var(--color-error-strong);
}

.option.locked {
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .option-content {
    padding: 14px 14px;
    gap: 10px;
  }

  .option-letter {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
  }

  .letter-text {
    font-size: 20px;
  }

  .option-text {
    font-size: 15px;
    line-height: 1.35;
  }
}

@keyframes option-correct {
  0% {
    transform: translate(var(--option-press-x), var(--option-press-y)) scale(1);
  }

  25% {
    transform: translate(var(--option-press-x), var(--option-press-y)) scale(1.02);
  }

  60% {
    transform: translate(var(--option-press-x), var(--option-press-y)) scale(0.99);
  }

  100% {
    transform: translate(var(--option-press-x), var(--option-press-y)) scale(1);
  }
}

@keyframes option-wrong {
  0% {
    transform: translate(var(--option-press-x), var(--option-press-y));
  }

  18% {
    transform: translate(calc(var(--option-press-x) - 3px), var(--option-press-y));
  }

  36% {
    transform: translate(calc(var(--option-press-x) + 3px), var(--option-press-y));
  }

  54% {
    transform: translate(calc(var(--option-press-x) - 2px), var(--option-press-y));
  }

  72% {
    transform: translate(calc(var(--option-press-x) + 2px), var(--option-press-y));
  }

  100% {
    transform: translate(var(--option-press-x), var(--option-press-y));
  }
}
</style>
