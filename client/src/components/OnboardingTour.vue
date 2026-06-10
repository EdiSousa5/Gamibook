<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { CheckIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'
import logoUrl from '@/assets/images/gamibook_logo.png'

export type TourStep = {
  selector?: string
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  route?: string
  hero?: boolean
}

const props = defineProps<{ steps: TourStep[] }>()
const emit = defineEmits<{ done: [] }>()

const router = useRouter()
const route = useRoute()

const PAD = 12
const GAP = 18
const TW_NORMAL = 320
const TW_HERO = 400
const TH_EST = 240

// ── State ────────────────────────────────────────────────
const currentStep = ref(0)
const spotlightRect = ref<DOMRect | null>(null)
const ready = ref(false)
const busy = ref(false)
const cardVisible = ref(false)
// Cached style: computed WHILE card is hidden, so it never jumps visually
const cachedStyle = ref<Record<string, string>>({
  left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
})

const step = computed(() => props.steps[currentStep.value]!)
const isLast = computed(() => currentStep.value === props.steps.length - 1)
const tw = computed(() => step.value.hero ? TW_HERO : TW_NORMAL)

// ── Helpers ──────────────────────────────────────────────
function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function getTargetRect(): DOMRect | null {
  const sel = step.value.selector
  if (!sel) return null
  const el = document.querySelector(sel)
  if (!el) return null
  const r = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (r.width === 0 || r.height === 0 || r.right <= 2 || r.bottom <= 2 || r.left >= vw - 2 || r.top >= vh - 2) return null
  return r
}

function computeStyleFromRect(s: TourStep, rect: DOMRect | null): Record<string, string> {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const M = 16
  const cardW = s.hero ? TW_HERO : TW_NORMAL

  if (!rect || !s.selector) {
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  }

  const placement = s.placement ?? 'bottom'
  const clampH = (l: number) => Math.max(M, Math.min(l, vw - cardW - M))
  const clampV = (t: number) => Math.max(M, Math.min(t, vh - TH_EST - M))

  const sR = rect.right  + PAD
  const sL = rect.left   - PAD
  const sT = rect.top    - PAD
  const sB = rect.bottom + PAD
  const cx = rect.left + rect.width / 2

  if (placement === 'right') return { left: `${Math.min(sR + GAP, vw - cardW - M)}px`, top: `${clampV(sT)}px` }
  if (placement === 'left')  return { left: `${Math.max(M, sL - GAP - cardW)}px`,       top: `${clampV(sT)}px` }
  if (placement === 'top')   return { left: `${clampH(cx - cardW / 2)}px`, top: `${Math.max(M, sT - GAP - TH_EST)}px` }
  return { left: `${clampH(cx - cardW / 2)}px`, top: `${Math.min(sB + GAP, vh - TH_EST - M)}px` }
}

async function navigateIfNeeded(s: TourStep) {
  if (!s.route || route.path === s.route) return
  await router.push(s.route)
  await wait(750)
}

async function findAndScroll(s: TourStep): Promise<DOMRect | null> {
  await nextTick()
  if (s.selector) {
    const el = document.querySelector(s.selector)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await wait(380)
    }
  }
  return getTargetRect()
}

// Core step runner — always:
//   1. hide card + spotlight
//   2. navigate if needed
//   3. find element
//   4. compute + cache style (while card still invisible)
//   5. show spotlight + card
async function runStep(s: TourStep) {
  busy.value = true
  cardVisible.value = false
  spotlightRect.value = null

  await wait(200)                     // let card fade out
  await navigateIfNeeded(s)
  const rect = await findAndScroll(s)

  cachedStyle.value = computeStyleFromRect(s, rect)
  spotlightRect.value = rect

  await nextTick()
  cardVisible.value = true
  busy.value = false
}

// ── Navigation ───────────────────────────────────────────
async function next() {
  if (isLast.value) {
    emit('done')
    return
  }
  currentStep.value++
}

watch(currentStep, (idx) => runStep(props.steps[idx]!))

// ── Lifecycle ────────────────────────────────────────────
onMounted(async () => {
  await wait(450)
  ready.value = true
  await runStep(props.steps[0]!)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => window.removeEventListener('resize', onResize))

function onResize() {
  if (!spotlightRect.value) return
  spotlightRect.value = getTargetRect()
  if (cardVisible.value) {
    cachedStyle.value = computeStyleFromRect(step.value, spotlightRect.value)
  }
}

// ── Spotlight style ──────────────────────────────────────
const highlightStyle = computed(() => {
  const r = spotlightRect.value
  if (!r) return {}
  return {
    left:   `${r.left - PAD}px`,
    top:    `${r.top  - PAD}px`,
    width:  `${r.width  + PAD * 2}px`,
    height: `${r.height + PAD * 2}px`,
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div v-if="ready" class="tour-root" role="dialog" aria-modal="true" aria-label="Guia de boas-vindas">

        <!-- Backdrop — dims when no spotlight -->
        <div class="tour-backdrop" :class="{ 'tour-backdrop--dim': !spotlightRect }" />

        <!-- Spotlight -->
        <Transition name="spot">
          <div v-if="spotlightRect" class="tour-spotlight" :style="highlightStyle" aria-hidden="true" />
        </Transition>

        <!-- Tooltip card — v-if so it fully unmounts between steps -->
        <Transition name="tip">
          <div v-if="cardVisible" class="tour-card" :class="{ 'tour-card--hero': step.hero }" :style="cachedStyle">

            <!-- Hero header -->
            <div v-if="step.hero" class="tour-hero-header">
              <img :src="logoUrl" alt="GamiBook" class="tour-hero-logo" />
            </div>

            <!-- Progress -->
            <div class="tour-header">
              <span class="tour-count">{{ currentStep + 1 }}&thinsp;/&thinsp;{{ steps.length }}</span>
              <div class="tour-dots" aria-hidden="true">
                <span
                  v-for="(_, i) in steps"
                  :key="i"
                  class="tour-dot"
                  :class="{ active: i === currentStep }"
                />
              </div>
            </div>

            <h3 class="tour-title">{{ step.title }}</h3>
            <p class="tour-desc">{{ step.description }}</p>

            <div class="tour-footer">
              <button class="tour-btn" :disabled="busy" @click="next">
                <template v-if="isLast">
                  <CheckIcon class="tour-btn-icon" aria-hidden="true" />
                  Começar!
                </template>
                <template v-else>
                  Próximo
                  <ArrowRightIcon class="tour-btn-icon" aria-hidden="true" />
                </template>
              </button>
            </div>
          </div>
        </Transition>

      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tour-root {
  position: fixed;
  inset: 0;
  z-index: 99980;
  pointer-events: none;
}

/* Click blocker; darkens everything when there is no spotlight */
.tour-backdrop {
  position: fixed;
  inset: 0;
  pointer-events: all;
  cursor: default;
  background: transparent;
  transition: background 0.35s ease;
}
.tour-backdrop--dim {
  background: rgba(8, 12, 18, 0.72);
}

/* The spotlight div itself is transparent — its box-shadow creates the overlay */
.tour-spotlight {
  position: fixed;
  border-radius: 16px;
  pointer-events: none;
  z-index: 99981;
  box-shadow:
    0 0 0 9999px rgba(8, 12, 18, 0.72),
    inset 0 0 0 3px var(--color-deep-400);
  animation: tour-pulse 2.6s ease-in-out infinite;
}

@keyframes tour-pulse {
  0%, 100% {
    box-shadow:
      0 0 0 9999px rgba(8, 12, 18, 0.72),
      inset 0 0 0 3px var(--color-deep-400);
  }
  50% {
    box-shadow:
      0 0 0 9999px rgba(8, 12, 18, 0.72),
      inset 0 0 0 3px var(--color-deep-300),
      0 0 0 7px rgba(50, 140, 134, 0.2);
  }
}

/* ── Card ───────────────────────────────────────────────── */
.tour-card {
  position: fixed;
  z-index: 99999;
  pointer-events: all;
  width: 320px;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 20px;
  box-shadow:
    6px 6px 0 var(--color-shadow),
    0 12px 40px rgba(8, 12, 18, 0.28);
  overflow: hidden;
  display: grid;
  gap: 0.625rem;
  padding: var(--space-400);
}

.tour-card--hero {
  width: 400px;
  padding: 0;
  gap: 0;
}

.tour-card--hero .tour-header,
.tour-card--hero .tour-title,
.tour-card--hero .tour-desc,
.tour-card--hero .tour-footer {
  padding-left: var(--space-400);
  padding-right: var(--space-400);
}

.tour-card--hero .tour-header {
  padding-top: var(--space-300);
}

.tour-card--hero .tour-title {
  font-size: 18px;
}

.tour-card--hero .tour-footer {
  padding-bottom: var(--space-400);
  padding-top: var(--space-200);
}

.tour-card--hero .tour-desc {
  padding-bottom: var(--space-100);
}

/* Hero header with logo */
.tour-hero-header {
  background: linear-gradient(135deg, var(--color-deep-600) 0%, var(--color-deep-400) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-400) var(--space-500);
  border-bottom: 2px solid var(--color-mirage-800);
  min-height: 100px;
}

.tour-hero-logo {
  width: 160px;
  height: auto;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.95;
}

/* ── Header / dots ──────────────────────────────────────── */
.tour-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-200);
}

.tour-count {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
}

.tour-dots {
  display: flex;
  gap: 5px;
  align-items: center;
}

.tour-dot {
  display: block;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--color-mirage-300);
  transition:
    width 0.32s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.2s ease;
  flex-shrink: 0;
}
.tour-dot.active {
  width: 20px;
  background: var(--color-deep-500);
}

/* ── Content ────────────────────────────────────────────── */
.tour-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 800;
  color: var(--color-mirage-900);
  line-height: 1.25;
}

.tour-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-600);
  line-height: 1.65;
}

/* ── Footer / button ────────────────────────────────────── */
.tour-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--space-150);
}

.tour-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-150);
  padding: var(--space-150) 0.875rem;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-deep-500);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: var(--font-base);
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--color-deep-800);
  transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.15s ease;
}
.tour-btn:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--color-deep-800);
}
.tour-btn:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--color-deep-800);
}
.tour-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.tour-btn-icon {
  width: 15px;
  height: 15px;
  stroke-width: 2.5;
  flex-shrink: 0;
}

/* ── Transitions ─────────────────────────────────────────── */
.tour-fade-enter-active,
.tour-fade-leave-active {
  transition: opacity 0.3s ease;
}
.tour-fade-enter-from,
.tour-fade-leave-to {
  opacity: 0;
}

/* Spotlight fades smoothly */
.spot-enter-active { transition: opacity 0.28s ease; }
.spot-leave-active { transition: opacity 0.16s ease; }
.spot-enter-from,
.spot-leave-to     { opacity: 0; }

/* Card enters at its final position (style cached before mount) */
.tip-enter-active {
  transition:
    opacity 0.26s ease,
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tip-leave-active {
  transition: opacity 0.16s ease, transform 0.14s ease;
}
.tip-enter-from {
  opacity: 0;
  transform: scale(0.88) translateY(8px);
}
.tip-leave-to {
  opacity: 0;
  transform: scale(0.94);
}

/* ── Mobile ─────────────────────────────────────────────── */
@media (max-width: 44em) {
  .tour-card,
  .tour-card--hero {
    width: min(340px, calc(100vw - 28px));
  }
}
</style>
