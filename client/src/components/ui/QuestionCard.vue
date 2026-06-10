<script setup lang="ts">
defineProps<{
  questionText: string
  timeLeft: number
  timerDash: string
}>()
</script>

<template>
  <div class="question-card">
    <div class="question-card__shadow" />
    <div class="question-card__panel">
      <div v-if="timeLeft >= 0" class="question-timer">
        <svg class="timer-ring" viewBox="0 0 72 72" aria-hidden="true">
          <circle class="timer-ring__track" cx="36" cy="36" r="26" />
          <circle class="timer-ring__progress" cx="36" cy="36" r="26"
            :style="{ strokeDasharray: timerDash }" />
        </svg>
        <span class="timer-value">{{ String(timeLeft).padStart(2, '0') }}</span>
      </div>
      <div class="question-top">
        <div class="question-title"><slot name="label">Pergunta</slot></div>
        <slot name="actions" />
      </div>
      <div class="question-divider" />
      <p class="question-text">{{ questionText }}</p>
    </div>
  </div>
</template>

<style scoped>
.question-card {
  position: relative;
  width: min(960px, 100%);
  margin: 0 auto;
  padding-top: 40px;
}

.question-card__shadow {
  position: absolute;
  inset: 52px 0 0;
  background: var(--color-deep-600);
  border-radius: 16px;
  z-index: 0;
}

.question-card__panel {
  position: relative;
  z-index: 1;
  padding: 40px 32px 32px;
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 8px 8px 0 rgba(46, 127, 123, 0.35);
}

.question-timer {
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  width: 70px;
  height: 70px;
  border-radius: 999px;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--color-mirage-800);
  box-shadow: 0 6px 0 rgba(46, 127, 123, 0.35);
}

.timer-ring {
  width: 64px;
  height: 64px;
  transform: rotate(-90deg);
}

.timer-ring__track {
  fill: none;
  stroke: rgba(46, 127, 123, 0.2);
  stroke-width: 6;
}

.timer-ring__progress {
  fill: none;
  stroke: var(--color-deep-500);
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dasharray 0.9s ease-in-out;
}

.timer-value {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 16px;
}

.question-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-300);
  margin-top: var(--space-400);
}

.question-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--color-mirage-800);
}

.question-divider {
  height: 1px;
  background: var(--color-mirage-800);
  margin: 18px 0;
}

.question-text {
  margin: 0;
  font-size: 22px;
  line-height: 30px;
  color: var(--color-mirage-800);
}

@media (max-width: 720px) {
  .question-card__panel {
    padding: 28px 18px 22px;
  }

  .question-top {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--space-200);
  }

  .question-title {
    font-size: 22px;
    justify-content: center;
  }

  .question-text {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .question-card__panel {
    padding: 20px 16px 18px;
  }

  .question-top {
    align-items: center;
    text-align: center;
    margin-top: var(--space-300);
  }

  .question-title {
    font-size: 18px;
    justify-content: center;
  }

  .question-text {
    font-size: 15px;
    line-height: 1.5;
    text-align: center;
  }

  .question-timer {
    width: 58px;
    height: 58px;
    top: -26px;
  }

  .timer-ring {
    width: 52px;
    height: 52px;
  }

  .timer-value {
    font-size: 14px;
  }
}
</style>
