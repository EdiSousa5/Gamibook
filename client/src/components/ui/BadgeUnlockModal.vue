<script setup lang="ts">
import BookBadge from '@/components/ui/BookBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'
import { generateConfetti } from '@/utils/confetti'

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

const confetti = generateConfetti()
</script>

<template>
  <UiModal :visible="visible && !!tier" aria-label="Novo badge desbloqueado!">
    <div v-if="tier" class="badge-card">

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

          <p class="up-label" :class="tier === 'galaxy' ? 'up-label--galaxy' : tier === 'diamond' ? 'up-label--diamond' : ''">
            {{ tier === 'galaxy' ? 'MISSÃO COMPLETA!' : tier === 'diamond' ? 'INCRÍVEL!' : 'BADGE DESBLOQUEADO!' }}
          </p>

          <h2 class="badge-title">{{ tierLabel[tier] }}</h2>

          <p class="badge-desc">
            <template v-if="tier === 'galaxy'">
              Completaste todos os exercícios e passaste o quiz final
              <template v-if="bookTitle"> de <em>{{ bookTitle }}</em></template>!
              Atingiste o patamar máximo. És incrível!
            </template>
            <template v-else-if="tier === 'diamond'">
              Completaste 100% dos exercícios
              <template v-if="bookTitle"> de <em>{{ bookTitle }}</em></template>!
              O quiz final está desbloqueado — podes agora conquistar o Galaxy!
            </template>
            <template v-else>
              Conquistaste o badge <strong>{{ tierLabel[tier] }}</strong>
              <template v-if="bookTitle"> em <em>{{ bookTitle }}</em></template>.
              Continua assim!
            </template>
          </p>

          <UiButton variant="primary" style="width: 100%; display: flex;" @click="$emit('close')">
            {{ tier === 'galaxy' ? 'Fantástico!' : 'Continuar' }}
          </UiButton>

        </div>
  </UiModal>
</template>

<style scoped>
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

.up-label--galaxy {
  font-size: 14px;
  letter-spacing: 4px;
  color: var(--color-deep-700);
}

.up-label--diamond {
  color: var(--color-teal-600);
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

</style>
