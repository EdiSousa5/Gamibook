<script setup lang="ts">
import BookBadge from '@/components/ui/BookBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'

defineProps<{
  visible: boolean
  tier: BookBadgeTier | null
  bookTitle?: string
}>()

defineEmits<{ close: [] }>()

const tierLabel: Record<BookBadgeTier, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  diamond: 'Diamante',
  galaxy: 'Galáxia',
}

const COLORS = ['#2e7f7b', '#1a5e5b', '#4ade80', '#86efac', '#34d399', '#6ee7b7', '#166534', '#a7f3d0', '#059669', '#6ee7b7']
const confetti = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  color: COLORS[i % COLORS.length],
  left: `${(i * 3.25 + (i % 5) * 1.1) % 100}%`,
  delay: `${(i * 0.1) % 1.4}s`,
  dur: `${2.2 + (i % 6) * 0.3}s`,
  w: `${6 + (i % 4) * 3}px`,
  h: `${8 + (i % 3) * 5}px`,
  rot: `${(i * 53) % 360}deg`,
}))
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div v-if="visible && tier" class="badge-overlay" role="dialog" aria-modal="true" aria-label="Novo badge desbloqueado!">
        <div class="badge-card">

          <div class="confetti-wrap" aria-hidden="true">
            <span
              v-for="p in confetti"
              :key="p.id"
              class="cp"
              :style="{ '--c': p.color, '--l': p.left, '--d': p.delay, '--dur': p.dur, width: p.w, height: p.h, '--r': p.rot }"
            />
          </div>

          <div class="badge-icon-wrap" aria-hidden="true">
            <BookBadge :tier="tier" size="lg" />
          </div>

          <p class="up-label">BADGE DESBLOQUEADO!</p>

          <h2 class="badge-title">{{ tierLabel[tier] }}</h2>

          <p class="badge-desc">
            Conquistaste o badge <strong>{{ tierLabel[tier] }}</strong>
            <template v-if="bookTitle"> em <em>{{ bookTitle }}</em></template>.
            Continua assim!
          </p>

          <UiButton variant="primary" style="width: 100%; display: flex;" @click="$emit('close')">
            Continuar
          </UiButton>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.badge-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 24px;
}

.badge-card {
  position: relative;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 24px;
  padding: 48px 40px 40px;
  max-width: 460px;
  width: 100%;
  text-align: center;
  box-shadow: 6px 6px 0 var(--color-shadow);
  overflow: hidden;
  display: grid;
  gap: 16px;
  place-items: center;
  animation: card-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes card-pop {
  from { transform: scale(0.65) translateY(24px); opacity: 0; }
  to   { transform: scale(1)    translateY(0);    opacity: 1; }
}

/* Confetti */
.confetti-wrap {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.cp {
  position: absolute;
  top: -14px;
  left: var(--l);
  background: var(--c);
  border-radius: 2px;
  transform: rotate(var(--r));
  animation: fall var(--dur) var(--d) ease-in forwards;
}

@keyframes fall {
  0%   { transform: translateY(0)     rotate(0deg);   opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateY(700px) rotate(900deg); opacity: 0; }
}

/* Badge icon */
.badge-icon-wrap {
  animation: badge-bounce 0.7s 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes badge-bounce {
  from { transform: scale(0) rotate(-20deg); opacity: 0; }
  to   { transform: scale(1) rotate(0deg);   opacity: 1; }
}

/* Labels */
.up-label {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--color-deep-600);
}

.badge-title {
  margin: 0;
  font-size: 36px;
  font-weight: 900;
  color: var(--color-mirage-800);
  line-height: 1;
}

.badge-desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-600);
  line-height: 1.6;
  max-width: 320px;
}

.badge-desc strong {
  color: var(--color-mirage-800);
  font-weight: 700;
}

.badge-desc em {
  font-style: normal;
  font-weight: 700;
  color: var(--color-mirage-700);
}

/* Overlay transition */
.overlay-fade-enter-active { animation: overlay-in 0.3s ease both; }
.overlay-fade-leave-active { animation: overlay-in 0.2s ease reverse both; }

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
