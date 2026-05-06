<script setup lang="ts">
import { AcademicCapIcon } from '@heroicons/vue/24/solid'

export type BookBadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'galaxy'

const labelMap: Record<BookBadgeTier, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  diamond: 'Diamante',
  galaxy: 'Galáxia',
}

withDefaults(
  defineProps<{
    tier: BookBadgeTier
    size?: 'xs' | 'sm' | 'md' | 'lg'
  }>(),
  { size: 'sm' },
)
</script>

<template>
  <div
    class="book-badge"
    :class="[`book-badge--${tier}`, `book-badge--${size}`]"
    role="img"
    :aria-label="`Badge ${labelMap[tier]}`"
  >
    <div class="badge-shadow" />
    <div class="badge-face">

      <!-- Diamond: sweeping glint -->
      <div v-if="tier === 'diamond'" class="badge-glint" />

      <!-- Galaxy: rotating nebula + twinkling stars -->
      <template v-else-if="tier === 'galaxy'">
        <div class="badge-nebula" />
        <span class="badge-star" style="--sx: 20%; --sy: 25%; --sd: 0s"   />
        <span class="badge-star" style="--sx: 65%; --sy: 18%; --sd: 1.3s" />
        <span class="badge-star" style="--sx: 75%; --sy: 65%; --sd: 0.7s" />
        <span class="badge-star" style="--sx: 28%; --sy: 72%; --sd: 2s"   />
        <span class="badge-star" style="--sx: 52%; --sy: 14%; --sd: 0.4s" />
      </template>

      <AcademicCapIcon class="badge-icon" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.book-badge {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}

/* ── Shadow ────────────────────────── */
.badge-shadow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  transform: translate(2px, 2px);
  background: var(--badge-shadow-color);
}

/* ── Face ──────────────────────────── */
.badge-face {
  position: relative;
  width: var(--badge-size);
  height: var(--badge-size);
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  background: var(--badge-bg);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.badge-icon {
  position: relative;
  z-index: 3;
  width: var(--badge-icon-size);
  height: var(--badge-icon-size);
  color: var(--badge-icon-color);
}

/* ── Sizes ─────────────────────────── */
.book-badge--xs {
  --badge-size: 30px;
  --badge-icon-size: 15px;
}

.book-badge--sm {
  --badge-size: 44px;
  --badge-icon-size: 22px;
}

.book-badge--md {
  --badge-size: 64px;
  --badge-icon-size: 32px;
}

.book-badge--lg {
  --badge-size: 90px;
  --badge-icon-size: 44px;
}

/* ── Tier colours ──────────────────── */

/* Bronze — warm copper */
.book-badge--bronze {
  --badge-bg: var(--color-amber-300);
  --badge-shadow-color: var(--color-amber-700);
  --badge-icon-color: var(--color-amber-1000);
}

/* Silver — cool steel */
.book-badge--silver {
  --badge-bg: var(--color-mirage-100);
  --badge-shadow-color: var(--color-mirage-500);
  --badge-icon-color: var(--color-mirage-700);
}

/* Gold — true gold yellow */
.book-badge--gold {
  --badge-bg: #FFD700;
  --badge-shadow-color: #a67c00;
  --badge-icon-color: #5c4e00;
}

/* Diamond — icy crystal */
.book-badge--diamond {
  --badge-bg: #8bd6e4;
  --badge-shadow-color: #2f5161;
  --badge-icon-color: #374852;
}

/* Galaxy — deep violet cosmic */
.book-badge--galaxy {
  --badge-bg: #0d0020;
  --badge-shadow-color: #3b0066;
  --badge-icon-color: #ddb4fe;
}

/* ── Diamond glint ─────────────────── */
.badge-glint {
  position: absolute;
  top: -10%;
  left: -80%;
  width: 45%;
  height: 120%;
  background: linear-gradient(
    to right,
    transparent,
    rgba(194, 251, 255, 0.75),
    transparent
  );
  transform: skewX(-18deg);
  z-index: 1;
  animation: diamond-glint 10s ease-in-out infinite;
}

@keyframes diamond-glint {
  0%,  55% { left: -80%;  opacity: 0; }
  60%       { opacity: 1; }
  75%       { left: 140%; opacity: 0; }
  75%, 100% { left: 140%; opacity: 0; }
}

/* ── Galaxy nebula ─────────────────── */
.badge-nebula {
  position: absolute;
  inset: -50%;
  border-radius: 50%;
  z-index: 1;
  background: conic-gradient(
    from 0deg,
    transparent              0deg,
    rgba(139, 92,  246, 0.60)  55deg,
    transparent             115deg,
    rgba(192, 132, 252, 0.35) 175deg,
    transparent             235deg,
    rgba(109,  40, 217, 0.55) 305deg,
    transparent             360deg
  );
  animation: galaxy-spin 9s linear infinite;
}

@keyframes galaxy-spin {
  to { transform: rotate(360deg); }
}

/* Twinkling stars */
.badge-star {
  position: absolute;
  left: var(--sx);
  top:  var(--sy);
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #fff;
  z-index: 2;
  animation: star-twinkle 2.6s ease-in-out infinite;
  animation-delay: var(--sd);
}

@keyframes star-twinkle {
  0%, 100% { opacity: 0.85; transform: scale(1);   }
  50%       { opacity: 0.10; transform: scale(0.3); }
}
</style>
