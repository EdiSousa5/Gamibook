<script setup lang="ts">
defineProps<{
  result: 'correct' | 'wrong'
  points?: number
}>()
</script>

<template>
  <div class="result-pill" :class="result">
    <span class="result-pill__label">{{ result === 'correct' ? 'Certo!' : 'Errado' }}</span>
    <strong v-if="points && points > 0" class="result-pill__xp">+{{ points }} XP</strong>
  </div>
</template>

<style scoped>
.result-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  font-weight: 700;
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  animation: feedback-pop 0.35s ease;
  white-space: nowrap;
}

.result-pill.correct { background: var(--color-deep-100); }

.result-pill.wrong {
  background: var(--color-error-muted);
  border-color: var(--color-red-500);
}

.result-pill__label {
  font-size: 13px;
  color: var(--color-mirage-800);
}

.result-pill.wrong .result-pill__label { color: var(--color-error-strong); }

.result-pill__xp {
  font-size: 12px;
  color: var(--color-deep-700);
}

.result-pill.wrong .result-pill__xp { color: var(--color-error-strong); }

@keyframes feedback-pop {
  0%   { transform: translateY(-6px) scale(0.95); opacity: 0; }
  60%  { transform: translateY(0) scale(1.02);    opacity: 1; }
  100% { transform: translateY(0) scale(1);        opacity: 1; }
}
</style>
