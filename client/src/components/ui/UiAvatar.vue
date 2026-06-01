<script setup lang="ts">
import { ref, watch, computed, toRef } from 'vue'
import type { Component } from 'vue'
import type { AvatarBorder, AvatarColor, AvatarEffect, AvatarShadow, AvatarCracha } from '@/types/avatar'
import {
  TrophyIcon,
  AcademicCapIcon,
  FireIcon,
  StarIcon,
} from '@heroicons/vue/24/solid'
import { useAuthAsset } from '@/composables/useAuthAsset'

type Props = {
  src?: string
  assetId?: string | null
  alt?: string
  size?: number
  status?: 'online' | 'away' | 'busy' | 'offline'
  ring?: boolean
  border?: AvatarBorder
  avatarColor?: AvatarColor
  effect?: AvatarEffect
  shadow?: AvatarShadow
  cracha?: AvatarCracha
  crachaValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  assetId: undefined,
  alt: 'avatar',
  size: 48,
  status: undefined,
  ring: false,
  border: undefined,
  avatarColor: undefined,
  effect: undefined,
  shadow: 'default',
  cracha: undefined,
  crachaValue: undefined,
})

const imgError = ref(false)

const blobUrl = useAuthAsset(toRef(props, 'assetId'))
const resolvedSrc = computed(() => props.assetId ? blobUrl.value : props.src)

watch(resolvedSrc, () => { imgError.value = false })

const CRACHA_ICONS: Record<AvatarCracha, Component> = {
  rank:    TrophyIcon,
  level:   StarIcon,
  streak:  FireIcon,
  bronze:  AcademicCapIcon,
  silver:  AcademicCapIcon,
  gold:    AcademicCapIcon,
  diamond: AcademicCapIcon,
  galaxy:  AcademicCapIcon,
}

const crachaIconComp = computed(() => props.cracha ? CRACHA_ICONS[props.cracha] : null)

const classes = computed(() => {
  const crachaClass = props.cracha ? 'has-cracha' : ''
  return [
    props.avatarColor ? `av-color-${props.avatarColor}` : '',
    `av-border-${props.border ?? 'default'}`,
    props.effect && props.effect !== 'none' ? `av-effect-${props.effect}` : '',
    props.shadow !== 'default' ? `av-shadow-${props.shadow}` : '',
    crachaClass,
    { ring: props.ring },
  ]
})
</script>

<template>
  <div class="ui-avatar" :class="classes" :style="{ width: `${size}px`, height: `${size}px` }">
    <img v-if="resolvedSrc && !imgError" :src="resolvedSrc" :alt="alt" @error="imgError = true" />
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

.cracha-rank   { background: var(--color-mirage-800); color: var(--color-wild-100); }
.cracha-streak { background: var(--color-amber-500);  color: var(--color-mirage-800); }
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

/* ══════════════════════════════════════════════════════
   CUSTOMISATION SYSTEM — three independent composable layers
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

/* ── Effects ─────────────────────────────────────────── */

/* Brilho: halo suave na cor da borda */
.av-effect-glow {
  filter: drop-shadow(0 0 4px var(--av-border-color));
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
    transparent 40%,
    rgba(26, 38, 46, 0.30) 100%
  );
  z-index: 2;
  pointer-events: none;
}

.has-cracha.av-effect-sombra::before {
  clip-path: circle(50%);
}

/* Filtros aplicados apenas à imagem / letra de fallback — borda e sombra não são afetadas */

.av-effect-retro img,
.av-effect-retro > span:not(.status):not(.cracha) {
  filter: sepia(0.6) contrast(1.05) brightness(0.95);
}

.av-effect-mono img,
.av-effect-mono > span:not(.status):not(.cracha) {
  filter: grayscale(100%) contrast(1.15);
}

.av-effect-vivid img,
.av-effect-vivid > span:not(.status):not(.cracha) {
  filter: saturate(1.9) contrast(1.08);
}


</style>
