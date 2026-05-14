<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Component } from 'vue'
import type { AvatarBorder, AvatarColor, AvatarEffect, AvatarShadow, AvatarCracha } from '@/types/avatar'
import {
  TrophyIcon,
  AcademicCapIcon,
  FireIcon,
  BoltIcon,
  StarIcon,
  SparklesIcon,
  GlobeAltIcon,
  PencilIcon,
  BookOpenIcon,
} from '@heroicons/vue/24/solid'
import Book from '@/views/Book.vue'

type Frame = 'essence' | 'bloom' | 'ember' | 'aurora' | 'nebula' | 'ethereal' | 'void'

type Props = {
  src?: string
  alt?: string
  size?: number
  status?: 'online' | 'away' | 'busy' | 'offline'
  ring?: boolean
  // legacy
  tone?: 'primary' | 'accent' | 'neutral'
  frame?: Frame
  // new three-part system
  border?: AvatarBorder
  avatarColor?: AvatarColor
  effect?: AvatarEffect
  shadow?: AvatarShadow
  cracha?: AvatarCracha
  crachaValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  alt: 'avatar',
  size: 48,
  status: undefined,
  tone: 'primary',
  ring: false,
  frame: 'essence',
  border: undefined,
  avatarColor: undefined,
  effect: undefined,
  shadow: 'default',
  cracha: undefined,
  crachaValue: undefined,
})

const imgError = ref(false)
watch(() => props.src, () => { imgError.value = false })

const CRACHA_ICONS: Record<NonNullable<Props['cracha']>, Component> = {
  rank:      TrophyIcon,
  exercises: BookOpenIcon,
  streak:    FireIcon,
  level:     StarIcon,
  bronze:    AcademicCapIcon,
  silver:    AcademicCapIcon,
  gold:      AcademicCapIcon,
  diamond:   AcademicCapIcon,
  galaxy:    AcademicCapIcon,
}

const crachaIconComp = computed(() => props.cracha ? CRACHA_ICONS[props.cracha] : null)

const classes = computed(() => {
  const useNew = props.border !== undefined || props.avatarColor !== undefined || props.effect !== undefined
  const crachaClass = props.cracha ? 'has-cracha' : ''
  if (useNew) {
    return [
      props.avatarColor ? `av-color-${props.avatarColor}` : '',
      `av-border-${props.border ?? 'default'}`,
      props.effect && props.effect !== 'none' ? `av-effect-${props.effect}` : '',
      props.shadow !== 'default' ? `av-shadow-${props.shadow}` : '',
      crachaClass,
      { ring: props.ring },
    ]
  }
  return [`tone-${props.tone}`, `frame-${props.frame}`, crachaClass, { ring: props.ring }]
})
</script>

<template>
  <div class="ui-avatar" :class="classes" :style="{ width: `${size}px`, height: `${size}px` }">
    <img v-if="src && !imgError" :src="src" :alt="alt" @error="imgError = true" />
    <span v-else>{{ alt.charAt(0).toUpperCase() }}</span>
    <span v-if="status" class="status" :class="status"></span>
    <span v-if="cracha" class="cracha" :class="`cracha-${cracha}`">
      <component :is="crachaIconComp" class="cracha-icon" />{{ crachaValue ?? '?' }}
    </span>
  </div>
</template>

<style scoped>
/* ── Base ────────────────────────────────────────────── */

.ui-avatar {
  /* CSS vars consumed by the border + color systems */
  --av-border-color: var(--color-mirage-800);
  --av-shadow:       var(--color-shadow);
  /* shadow shorthand vars — overridden by av-shadow-* modifiers */
  --av-hard-shadow:  4px 4px 0 var(--av-shadow);
  --av-ring-shadow:  4px 4px 0 7px var(--av-shadow);

  border-radius: var(--radius-full);
  background: var(--color-deep-500);
  color: #fff;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-weight: 700;
  position: relative;
  flex-shrink: 0;
}

.ui-avatar img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Crachá: pill sobreposto na base do avatar */
.has-cracha {
  overflow: visible;
}

.has-cracha img {
  clip-path: circle(50%);
}

.cracha {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.5;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
  letter-spacing: 0.3px;
}

.cracha-icon {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}

.cracha-rank      { background: var(--color-mirage-800); color: var(--color-wild-100); }
.cracha-exercises { background: var(--color-deep-500);   color: var(--color-wild-100); }
.cracha-streak    { background: var(--color-amber-500);  color: var(--color-mirage-800); }
.cracha-level     { background: var(--color-deep-100);   color: var(--color-deep-700); border-color: var(--color-deep-500); box-shadow: 2px 2px 0 var(--color-deep-400); }
.cracha-bronze    { background: var(--color-amber-300);  color: var(--color-amber-900); }
.cracha-silver    { background: var(--color-mirage-200); color: var(--color-mirage-700); }
.cracha-gold      { background: #FFD700;                  color: #5c4e00; }
.cracha-diamond   { background: #8bd6e4;                  color: #374852; }
.cracha-galaxy    { background: #0d0020;                  color: #ddb4fe; border-color: #4c1d95; box-shadow: 2px 2px 0 #3b0066; }

.status {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-wild-100);
  background: var(--color-mirage-500);
  z-index: 3;
}

.status.online  { background: var(--color-deep-500); }
.status.away    { background: var(--color-amber-500); }
.status.busy    { background: #d74c4c; }
.status.offline { background: var(--color-mirage-400); }

/* ── Legacy tone ─────────────────────────────────────── */

.tone-accent  { background: var(--color-amber-500); }
.tone-neutral { background: var(--color-mirage-500); }

/* ── Legacy frame system ─────────────────────────────── */

.frame-essence {
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.frame-bloom {
  border: 2px dashed var(--color-mirage-700);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.frame-ember {
  border: 3px solid var(--color-mirage-800);
  box-shadow: 6px 6px 0 var(--color-shadow);
}

.frame-aurora {
  border: 2px solid var(--color-mirage-800);
  box-shadow:
    0 0 0 4px var(--color-wild-100),
    0 0 0 6px var(--color-mirage-800),
    4px 4px 0 var(--color-shadow);
}

.frame-nebula {
  border: 3px solid var(--color-deep-600);
  box-shadow:
    0 0 0 4px var(--color-deep-200),
    5px 5px 0 var(--color-shadow);
  animation: frame-marca-pulse 3s ease-in-out infinite;
}

@keyframes frame-marca-pulse {
  0%, 100% { box-shadow: 0 0 0 4px var(--color-deep-200), 5px 5px 0 var(--color-shadow); }
  50%       { box-shadow: 0 0 0 6px var(--color-deep-300), 5px 5px 0 var(--color-shadow); }
}

.frame-ethereal {
  border: 3px solid var(--color-amber-600);
  box-shadow:
    0 0 0 4px var(--color-amber-100),
    5px 5px 0 var(--color-shadow);
  animation: frame-destaque-pulse 3s ease-in-out infinite;
}

@keyframes frame-destaque-pulse {
  0%, 100% { box-shadow: 0 0 0 4px var(--color-amber-100), 5px 5px 0 var(--color-shadow); }
  50%       { box-shadow: 0 0 0 6px var(--color-amber-200), 5px 5px 0 var(--color-shadow); }
}

.frame-void {
  border: 3px solid var(--color-deep-700);
  box-shadow:
    0 0 0 3px var(--color-wild-100),
    0 0 0 6px var(--color-deep-600),
    0 0 0 9px var(--color-deep-300),
    6px 6px 0 var(--color-shadow);
  animation: frame-lenda-pulse 4s ease-in-out infinite;
}

@keyframes frame-lenda-pulse {
  0%, 100% {
    box-shadow:
      0 0 0 3px var(--color-wild-100),
      0 0 0 6px var(--color-deep-600),
      0 0 0 9px var(--color-deep-300),
      6px 6px 0 var(--color-shadow);
  }
  50% {
    box-shadow:
      0 0 0 3px var(--color-wild-100),
      0 0 0 6px var(--color-deep-500),
      0 0 0 11px var(--color-deep-200),
      6px 6px 0 var(--color-shadow);
  }
}

/* ══════════════════════════════════════════════════════
   NEW SYSTEM — three independent composable layers
   ══════════════════════════════════════════════════════ */

/* ── Borders ─────────────────────────────────────────── */
/*
  A sombra mantém-se sempre em 4px 4px independentemente
  do peso da borda — é a assinatura visual do site.
  A cor da borda e da sombra são controladas via CSS vars.
*/

.av-border-minimal {
  border: 1px solid var(--av-border-color);
  box-shadow: var(--av-hard-shadow);
}

.av-border-default {
  border: 2px solid var(--av-border-color);
  box-shadow: var(--av-hard-shadow);
}

.av-border-heavy {
  border: 4px solid var(--av-border-color);
  box-shadow: var(--av-hard-shadow);
}

/* Anel: gap branco + anel externo — igual ao avatar-wrap do pódio top-3 */
.av-border-ring {
  border: 2px solid var(--av-border-color);
  box-shadow:
    0 0 0 5px var(--color-wild-100),
    0 0 0 7px var(--av-border-color),
    var(--av-ring-shadow);
}

/* ── Shadow modifiers ────────────────────────────────── */

.av-shadow-none  {
  --av-hard-shadow: 0 0 0 0 transparent;
  --av-ring-shadow: 0 0 0 0 transparent;
}

.av-shadow-small {
  --av-hard-shadow: 2px 2px 0 var(--av-shadow);
  --av-ring-shadow: 2px 2px 0 7px var(--av-shadow);
}

/* ── Colors — definem CSS vars, nunca tocam no background ─── */

/* Sem cor: borda e sombra transparentes */
.av-color-none {
  --av-border-color: transparent;
  --av-shadow: transparent;
}

.av-color-teal         { --av-border-color: var(--color-deep-500);    --av-shadow: var(--color-deep-700); }
.av-color-teal-dark    { --av-border-color: var(--color-deep-700);    --av-shadow: var(--color-deep-800); }
.av-color-teal-light   { --av-border-color: var(--color-deep-300);    --av-shadow: var(--color-deep-600); }
.av-color-amber        { --av-border-color: var(--color-amber-500);   --av-shadow: var(--color-amber-700); }
.av-color-amber-dark   { --av-border-color: var(--color-amber-700);   --av-shadow: var(--color-amber-800); }
.av-color-pumpkin      { --av-border-color: var(--color-pumpkin-600); --av-shadow: var(--color-pumpkin-800); }
.av-color-crimson      { --av-border-color: var(--color-crimson-500); --av-shadow: var(--color-crimson-700); }
.av-color-crimson-dark { --av-border-color: var(--color-crimson-700); --av-shadow: var(--color-crimson-800); }
.av-color-slate        { --av-border-color: var(--color-mirage-500);  --av-shadow: var(--color-mirage-700); }
.av-color-slate-dark   { --av-border-color: var(--color-mirage-700);  --av-shadow: var(--color-mirage-900); }
.av-color-black        { --av-border-color: #111111;                  --av-shadow: #000000; }

/* ── Especiais: animam border-color lentamente ───────────── */

.av-color-galaxy {
  --av-border-color: #4c1d95;
  --av-shadow: #3b0066;
  animation: av-galaxy 14s linear infinite;
}

@keyframes av-galaxy {
  0%   { border-color: #1a004a; }
  20%  { border-color: #4c1d95; }
  40%  { border-color: #7c3aed; }
  60%  { border-color: #5b21b6; }
  80%  { border-color: #2e1065; }
  100% { border-color: #1a004a; }
}

/* Oceano: azuis e turquesas de mar aberto */
.av-color-ocean {
  --av-border-color: #0369a1;
  --av-shadow: #0c4a6e;
  animation: av-ocean 9s ease-in-out infinite;
}

@keyframes av-ocean {
  0%, 100% { border-color: #0c4a6e; }
  40%       { border-color: #0891b2; }
  70%       { border-color: #38bdf8; }
}

.av-color-inferno {
  --av-border-color: var(--color-crimson-700);
  --av-shadow: var(--color-crimson-800);
  animation: av-inferno 5s ease-in-out infinite;
}

@keyframes av-inferno {
  0%, 100% { border-color: var(--color-crimson-700); }
  30%       { border-color: var(--color-amber-500);  }
  65%       { border-color: var(--color-crimson-500); }
  85%       { border-color: #e8611e; }
}

/* Floresta: ciclo nos tons deep do design system */
.av-color-forest {
  --av-border-color: var(--color-deep-600);
  --av-shadow: var(--color-deep-800);
  animation: av-forest 11s ease-in-out infinite;
}

@keyframes av-forest {
  0%, 100% { border-color: var(--color-deep-800); }
  40%       { border-color: var(--color-deep-500); }
  70%       { border-color: var(--color-deep-200); }
}

/* ── Effects ─────────────────────────────────────────── */

/* Brilho: halo suave na cor da borda */
.av-effect-glow {
  filter: drop-shadow(0 0 7px var(--av-border-color));
}

/* Lustro: feixe de luz a varrer — clipped ao círculo pelo overflow:hidden */
.av-effect-shine::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 20%,
    rgba(255, 255, 255, 0.45) 50%,
    transparent 80%
  );
  animation: av-shine 3.5s ease-in-out infinite;
  z-index: 2;
  pointer-events: none;
}

/* quando has-cracha activa overflow:visible, forçar clip circular nos pseudo-elementos */
.has-cracha.av-effect-shine::after {
  clip-path: circle(50%);
}

@keyframes av-shine {
  0%        { transform: translateX(-180%); }
  40%, 100% { transform: translateX(180%); }
}

/* Aura: halo suave e lento na cor da borda */
.av-effect-aura {
  animation: av-aura 4.5s ease-in-out infinite;
}

@keyframes av-aura {
  0%, 100% { filter: drop-shadow(0 0 1px var(--av-border-color)); }
  50%       { filter: drop-shadow(0 0 5px var(--av-border-color)); }
}

/*
  Sombra: vinheta escura por cima da imagem — simula
  uma sombra projetada sobre o próprio avatar.
  Usa ::before dentro do clip do overflow:hidden.
*/
.av-effect-sombra::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle,
    transparent 35%,
    rgba(26, 38, 46, 0.55) 100%
  );
  z-index: 2;
  pointer-events: none;
}

.has-cracha.av-effect-sombra::before {
  clip-path: circle(50%);
}

</style>
