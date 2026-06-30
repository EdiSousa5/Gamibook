<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  KeyIcon,
  BookOpenIcon,
  TrophyIcon,
  ListBulletIcon,
  PencilSquareIcon,
  BookmarkIcon,
} from '@heroicons/vue/24/outline'
import UiButton from './ui/UiButton.vue'
import ExerciseOption from './ui/ExerciseOption.vue'
import logoUrl from '@/assets/images/gamibook_logo.png'

export type TourStep = {
  selector?: string
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  route?: string
  hero?: boolean
  noScroll?: boolean
  demoType?: 'qr-unlock' | 'exercise' | 'features'
  routeDelay?: number
  spotlightRadius?: string
}

const props = defineProps<{ steps: TourStep[]; demoCoverUrl?: string }>()
const emit = defineEmits<{ done: [] }>()

const router = useRouter()
const route = useRoute()

const PAD = 12
const GAP = 18
const TW_NORMAL = 340
const TW_HERO = 420
const TH_EST = 300

// ── State ────────────────────────────────────────────────
const currentStep = ref(0)
const spotlightRect = ref<DOMRect | null>(null)
const ready = ref(false)
const busy = ref(false)
const cardVisible = ref(false)
const cachedStyle = ref<Record<string, string>>({
  left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
})

// Animation states
const qrPhase = ref(0)  // 0 = scanning, 1 = unlocked
const exPhase = ref(0)  // 0 = idle, 1 = selecting, 2 = correct

const step = computed(() => props.steps[currentStep.value]!)
const isLast = computed(() => currentStep.value === props.steps.length - 1)
const isFirst = computed(() => currentStep.value === 0)
const hasDemoWindow = computed(() =>
  !!step.value.demoType && step.value.demoType !== 'features',
)

// ── Exercise demo options ─────────────────────────────────
const EX_OPTIONS = [
  'Conquistas por módulos concluídos',
  'Total de XP acumulado',
  'Livros na tua coleção',
  'Dias de login consecutivos',
]

// ── Confetti for unlock demo ─────────────────────────────
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  color: ['#2e7f7b', '#1a5e5b', '#4ade80', '#86efac', '#34d399', '#6ee7b7'][i % 6],
  left: `${(i * 4.7 + (i % 7) * 2.4) % 100}%`,
  delay: `${(i * 0.09) % 1.2}s`,
  dur: `${2.2 + (i % 5) * 0.25}s`,
  w: `${5 + (i % 4) * 2}px`,
  h: `${7 + (i % 3) * 4}px`,
}))

// ── Timers ────────────────────────────────────────────────
let qrTimer: ReturnType<typeof setTimeout> | null = null
let exTimer1: ReturnType<typeof setTimeout> | null = null
let exTimer2: ReturnType<typeof setTimeout> | null = null

function clearAnimTimers() {
  if (qrTimer) { clearTimeout(qrTimer); qrTimer = null }
  if (exTimer1) { clearTimeout(exTimer1); exTimer1 = null }
  if (exTimer2) { clearTimeout(exTimer2); exTimer2 = null }
}

function startQrAnimation() {
  qrPhase.value = 0
  qrTimer = setTimeout(() => { qrPhase.value = 1 }, 2000)
}

function startExAnimation() {
  exPhase.value = 0
  exTimer1 = setTimeout(() => { exPhase.value = 1 }, 1000)
  exTimer2 = setTimeout(() => { exPhase.value = 2 }, 1900)
}

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

  // Mobile: centre steps with no spotlight target (hero/intro/features), pin the rest to bottom
  // so the spotlighted element above stays visible.
  if (vw < 560) {
    if (s.hero || !rect || !s.selector) {
      return {
        left: '14px',
        right: '14px',
        top: '50%',
        bottom: 'auto',
        width: 'auto',
        transform: 'translateY(-50%)',
      }
    }
    return {
      left: '14px',
      right: '14px',
      bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      top: 'auto',
      width: 'auto',
      transform: 'none',
    }
  }

  // Steps with a demo window: pin tour card to bottom-center to leave center clear
  if (s.demoType && s.demoType !== 'features') {
    return {
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: '24px',
      top: 'auto',
    }
  }

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
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  await wait(s.routeDelay ?? 550)
}

async function findAndScroll(s: TourStep): Promise<DOMRect | null> {
  await nextTick()
  if (s.noScroll) {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    await wait(60)
  } else if (s.selector) {
    const el = document.querySelector(s.selector)
    if (el) {
      const r = el.getBoundingClientRect()
      const alreadyVisible = r.top >= 0 && r.bottom <= window.innerHeight
      if (!alreadyVisible) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await wait(320)
      }
    }
  }
  return getTargetRect()
}

async function runStep(s: TourStep) {
  busy.value = true
  cardVisible.value = false
  spotlightRect.value = null
  clearAnimTimers()
  qrPhase.value = 0
  exPhase.value = 0

  await wait(110)
  await navigateIfNeeded(s)
  const rect = await findAndScroll(s)

  cachedStyle.value = computeStyleFromRect(s, rect)
  spotlightRect.value = rect

  await nextTick()
  cardVisible.value = true
  busy.value = false

  if (s.demoType === 'qr-unlock') startQrAnimation()
  if (s.demoType === 'exercise') startExAnimation()
}

// ── Navigation ───────────────────────────────────────────
async function next() {
  if (isLast.value) { emit('done'); return }
  currentStep.value++
}

function prev() {
  if (!isFirst.value) currentStep.value--
}

watch(currentStep, (idx) => runStep(props.steps[idx]!))

// ── Lifecycle ────────────────────────────────────────────
onMounted(async () => {
  await wait(350)
  ready.value = true
  await runStep(props.steps[0]!)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  clearAnimTimers()
})

function onResize() {
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
    left:         `${r.left - PAD}px`,
    top:          `${r.top  - PAD}px`,
    width:        `${r.width  + PAD * 2}px`,
    height:       `${r.height + PAD * 2}px`,
    borderRadius: step.value.spotlightRadius ?? '16px',
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div v-if="ready" class="tour-root" role="dialog" aria-modal="true" aria-label="Guia de boas-vindas">

        <!-- Backdrop dims when there's no spotlight to do it, or when there's a demo window -->
        <div class="tour-backdrop" :class="{ 'tour-backdrop--dim': !spotlightRect || hasDemoWindow }" />

        <!-- Spotlight -->
        <Transition name="spot">
          <div v-if="spotlightRect" class="tour-spotlight" :style="highlightStyle" aria-hidden="true" />
        </Transition>

        <!-- ── Demo Window ───────────────────────────────────── -->
        <Transition name="demo-win-fade">
          <div v-if="cardVisible && hasDemoWindow" class="demo-win-wrap">

            <!-- Código de Ativação Window -->
            <div v-if="step.demoType === 'qr-unlock'" class="demo-win">
              <Transition name="demo-swap" mode="out-in">
                <!-- Phase 0: code input -->
                <div v-if="qrPhase === 0" key="code" class="demo-qr-body">
                  <div class="demo-code-wrap">
                    <KeyIcon class="demo-code-ico" aria-hidden="true" />
                    <div class="demo-code-input" aria-hidden="true">
                      <span class="demo-code-text">GBKX-A2B3-C4D5</span>
                      <span class="demo-code-cursor" />
                    </div>
                  </div>
                  <p class="demo-win-label">A ativar código...</p>
                </div>
                <!-- Phase 1: unlock card -->
                <div v-else key="unlock" class="demo-unlock-body">
                  <p class="demo-unlock-eyebrow">Livro Desbloqueado!</p>
                  <div class="demo-unlock-cover" aria-hidden="true">
                    <img
                      v-if="demoCoverUrl"
                      :src="demoCoverUrl"
                      alt="Capa do livro"
                      class="demo-unlock-cover-img"
                    />
                    <BookOpenIcon v-else class="demo-unlock-cover-ico" />
                  </div>
                  <h3 class="demo-unlock-title">GamiBook — Guia da Plataforma</h3>
                  <p class="demo-unlock-desc">O teu guia completo para aprender a usar a plataforma.</p>
                  <div class="demo-confetti-wrap" aria-hidden="true">
                    <span
                      v-for="p in CONFETTI"
                      :key="p.id"
                      class="demo-cp"
                      :style="{ '--c': p.color, '--l': p.left, '--d': p.delay, '--dur': p.dur, width: p.w, height: p.h }"
                    />
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Exercise Window -->
            <div v-else-if="step.demoType === 'exercise'" class="demo-win demo-ex-win">
              <p class="demo-ex-q">O que são os Badges?</p>
              <div class="demo-ex-grid">
                <ExerciseOption
                  v-for="(opt, i) in EX_OPTIONS"
                  :key="opt"
                  :value="opt"
                  :index="i"
                  :selected="exPhase === 1 && i === 0"
                  :correct="exPhase >= 2 && i === 0"
                  :locked="exPhase >= 2 && i !== 0"
                  @select="() => {}"
                />
              </div>
              <Transition name="demo-pop">
                <div v-if="exPhase >= 2" class="demo-ex-result">
                  <CheckIcon class="demo-ex-result-ico" aria-hidden="true" />
                  Correto! +10 XP
                </div>
              </Transition>
            </div>

          </div>
        </Transition>

        <!-- ── Tour Card ─────────────────────────────────────── -->
        <Transition name="tip">
          <div v-if="cardVisible" class="tour-card" :class="{ 'tour-card--hero': step.hero }" :style="cachedStyle">

            <!-- Hero header -->
            <div v-if="step.hero" class="tour-hero-header">
              <img :src="logoUrl" alt="GamiBook" class="tour-hero-logo" />
            </div>

            <!-- Compact logo bar for non-hero steps -->
            <div v-else class="tour-logo-bar">
              <img :src="logoUrl" alt="GamiBook" class="tour-logo-bar-img" />
            </div>

            <!-- Body -->
            <div class="tour-body">

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

              <!-- Features list (in-card demo) -->
              <div v-if="step.demoType === 'features'" class="demo-features">
                <div class="demo-feature">
                  <BookmarkIcon class="demo-feature-icon" aria-hidden="true" />
                  <div>
                    <strong>Badges</strong>
                    <span>Bronze, Silver, Gold, Diamond, Galaxy</span>
                  </div>
                </div>
                <div class="demo-feature">
                  <ListBulletIcon class="demo-feature-icon" aria-hidden="true" />
                  <div>
                    <strong>Módulos</strong>
                    <span>Exercícios organizados por tema</span>
                  </div>
                </div>
                <div class="demo-feature">
                  <PencilSquareIcon class="demo-feature-icon" aria-hidden="true" />
                  <div>
                    <strong>Exercícios</strong>
                    <span>Escolha múltipla e Verdadeiro/Falso</span>
                  </div>
                </div>
                <div class="demo-feature">
                  <TrophyIcon class="demo-feature-icon" aria-hidden="true" />
                  <div>
                    <strong>Quiz Final</strong>
                    <span>10 perguntas, desbloqueado no Diamond</span>
                  </div>
                </div>
                <div class="demo-feature">
                  <BookOpenIcon class="demo-feature-icon" aria-hidden="true" />
                  <div>
                    <strong>Modo Livre</strong>
                    <span>Pratica todos os exercícios sem pontuação</span>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="tour-footer">
                <UiButton
                  v-if="!isFirst"
                  variant="outline"
                  size="sm"
                  :disabled="busy"
                  @click="prev"
                >
                  <template #icon-left>
                    <ArrowLeftIcon class="tour-btn-icon" aria-hidden="true" />
                  </template>
                  Anterior
                </UiButton>
                <div v-else class="tour-footer-spacer" />

                <div class="tour-footer-right">
                  <UiButton
                    v-if="!isLast"
                    variant="ghost"
                    size="sm"
                    @click="emit('done')"
                  >
                    Saltar
                  </UiButton>
                  <UiButton
                    v-if="isLast"
                    variant="primary"
                    size="sm"
                    :disabled="busy"
                    @click="next"
                  >
                    <template #icon-left>
                      <CheckIcon class="tour-btn-icon" aria-hidden="true" />
                    </template>
                    Começar!
                  </UiButton>
                  <UiButton
                    v-else
                    variant="primary"
                    size="sm"
                    :disabled="busy"
                    @click="next"
                  >
                    Próximo
                    <template #icon-right>
                      <ArrowRightIcon class="tour-btn-icon" aria-hidden="true" />
                    </template>
                  </UiButton>
                </div>
              </div>

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

/* ── Backdrop ───────────────────────────────────────────── */
.tour-backdrop {
  position: fixed;
  inset: 0;
  pointer-events: all;
  cursor: default;
  background: transparent;
  transition: background 0.3s ease;
}
.tour-backdrop--dim {
  background: rgba(8, 12, 18, 0.72);
}

/* ── Spotlight ──────────────────────────────────────────── */
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
      0 0 0 7px rgba(50, 140, 134, 0.22);
  }
}

/* ── Demo Window Wrap ───────────────────────────────────── */
.demo-win-wrap {
  position: fixed;
  inset: 0;
  z-index: 99990;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  /* leave vertical space for the tour card pinned to bottom */
  padding: var(--space-500) var(--space-500) 210px;
}

/* ── Demo Window Card ───────────────────────────────────── */
.demo-win {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 22px;
  box-shadow: 6px 6px 0 var(--color-shadow), 0 20px 60px rgba(8, 12, 18, 0.35);
  overflow: hidden;
  max-width: 420px;
  width: calc(100vw - 40px);
  position: relative;
}

/* ── Código de Ativação Demo ─────────────────────────────── */
.demo-qr-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-300);
  padding: var(--space-500);
}

.demo-code-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-300);
  width: 180px;
}

.demo-code-ico {
  width: 36px;
  height: 36px;
  color: var(--color-deep-600);
  stroke-width: 1.5;
}

.demo-code-input {
  display: flex;
  align-items: center;
  gap: 2px;
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.demo-code-text {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--color-mirage-800);
  overflow: hidden;
  white-space: nowrap;
  width: 0;
  animation: code-reveal 1.4s steps(14, end) 0.3s forwards;
}

@keyframes code-reveal {
  to { width: 9em; }
}

.demo-code-cursor {
  display: inline-block;
  width: 2px;
  height: 16px;
  background: var(--color-deep-600);
  border-radius: 1px;
  animation: code-blink 0.8s step-end infinite;
}

@keyframes code-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

.demo-win-label {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-mirage-500);
  letter-spacing: 0.3px;
}

/* ── Unlock Card ────────────────────────────────────────── */
.demo-unlock-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-200);
  padding: var(--space-500) var(--space-500) var(--space-400);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.demo-unlock-eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2.5px;
  color: var(--color-deep-600);
  animation: fade-up 0.4s ease both;
}

.demo-unlock-cover {
  width: 80px;
  height: 120px;
  border-radius: 8px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  background: var(--color-wild-300);
  display: grid;
  place-items: center;
  animation: cover-pop 0.45s 0.1s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.demo-unlock-cover-ico {
  width: 36px;
  height: 36px;
  color: var(--color-mirage-400);
  stroke-width: 1.2;
}

.demo-unlock-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.demo-unlock-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 800;
  color: var(--color-mirage-800);
  animation: fade-up 0.4s 0.2s ease both;
}

.demo-unlock-desc {
  margin: 0;
  font-size: 12px;
  color: var(--color-mirage-500);
  line-height: 1.5;
  animation: fade-up 0.4s 0.3s ease both;
}

@keyframes cover-pop {
  from { transform: scale(0.65) translateY(10px) rotate(-3deg); opacity: 0; }
  to   { transform: scale(1) translateY(0) rotate(0); opacity: 1; }
}

@keyframes fade-up {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

/* Confetti */
.demo-confetti-wrap {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.demo-cp {
  position: absolute;
  top: -10px;
  left: var(--l);
  background: var(--c);
  border-radius: 2px;
  animation: confetti-fall var(--dur) var(--d) ease-in forwards;
}

@keyframes confetti-fall {
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translateY(500px) rotate(360deg); opacity: 0; }
}

/* ── Exercise Window ────────────────────────────────────── */
.demo-ex-win {
  padding: var(--space-400) var(--space-400) var(--space-300);
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
  max-width: 540px;
}

.demo-ex-q {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-mirage-800);
  line-height: 1.35;
  font-family: var(--font-display);
}

.demo-ex-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-200);
  zoom: 0.78;
}

.demo-ex-result {
  display: inline-flex;
  align-items: center;
  gap: var(--space-150);
  background: var(--color-deep-600);
  color: #fff;
  font-weight: 800;
  font-size: 13px;
  padding: var(--space-150) var(--space-300);
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-deep-900);
  align-self: flex-start;
}

.demo-ex-result-ico {
  width: 14px;
  height: 14px;
  stroke-width: 2.5;
}

/* ── Tour Card ──────────────────────────────────────────── */
.tour-card {
  position: fixed;
  z-index: 99999;
  pointer-events: all;
  width: 340px;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 20px;
  box-shadow: 6px 6px 0 var(--color-shadow), 0 16px 48px rgba(8, 12, 18, 0.3);
  overflow: hidden;
}

.tour-card--hero {
  width: 420px;
}

.tour-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
  padding: var(--space-500);
}

.tour-card--hero .tour-body {
  padding: var(--space-400) var(--space-500) var(--space-500);
}

/* Hero header */
.tour-hero-header {
  background: linear-gradient(135deg, var(--color-teal-200) 0%, var(--color-teal-100) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-500) var(--space-600);
  border-bottom: 2px solid var(--color-mirage-800);
  min-height: 110px;
}

.tour-hero-logo {
  width: 260px;
  height: auto;
  object-fit: contain;
}

/* ── Compact logo bar (non-hero cards) ─────────────────── */
.tour-logo-bar {
  background: linear-gradient(135deg, var(--color-deep-600) 0%, var(--color-deep-400) 100%);
  display: flex;
  align-items: center;
  padding: var(--space-150) var(--space-400);
  border-bottom: 2px solid var(--color-mirage-800);
}

.tour-logo-bar-img {
  height: 22px;
  width: auto;
  object-fit: contain;
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
  transition: width 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;
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
  font-size: 17px;
  font-weight: 800;
  color: var(--color-mirage-900);
  line-height: 1.25;
}

.tour-desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-600);
  line-height: 1.65;
}

/* ── Features (in-card) ─────────────────────────────────── */
.demo-features {
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
}

.demo-feature {
  display: flex;
  align-items: flex-start;
  gap: var(--space-200);
  padding: var(--space-200) var(--space-300);
  background: var(--color-wild-300);
  border-radius: 10px;
  border: 1.5px solid var(--color-wild-600);
}

.demo-feature-icon {
  width: 18px;
  height: 18px;
  color: var(--color-deep-500);
  stroke-width: var(--icon-stroke);
  flex-shrink: 0;
  margin-top: 1px;
}

.demo-feature div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.demo-feature strong {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.demo-feature span {
  font-size: 11px;
  color: var(--color-mirage-500);
  line-height: 1.3;
}

/* ── Footer ────────────────────────────────────────────── */
.tour-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-200);
  padding-top: var(--space-100);
}

.tour-footer-spacer {
  flex: 0 0 auto;
  /* matches approximate width of Anterior button to keep Próximo right-aligned */
  width: 100px;
}

.tour-footer-right {
  display: flex;
  align-items: center;
  gap: var(--space-150);
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
.tour-fade-leave-to { opacity: 0; }

.spot-enter-active { transition: opacity 0.24s ease; }
.spot-leave-active { transition: opacity 0.14s ease; }
.spot-enter-from, .spot-leave-to { opacity: 0; }

.tip-enter-active {
  transition: opacity 0.22s ease, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tip-leave-active {
  transition: opacity 0.14s ease, transform 0.12s ease;
}
.tip-enter-from {
  opacity: 0;
  transform: scale(0.88) translateY(8px);
}
.tip-leave-to {
  opacity: 0;
  transform: scale(0.94);
}

.demo-win-fade-enter-active {
  transition: opacity 0.28s ease, transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.demo-win-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.15s ease;
}
.demo-win-fade-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(12px);
}
.demo-win-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.demo-swap-enter-active {
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.demo-swap-leave-active {
  transition: opacity 0.18s ease, transform 0.14s ease;
}
.demo-swap-enter-from {
  opacity: 0;
  transform: scale(0.8);
}
.demo-swap-leave-to {
  opacity: 0;
  transform: scale(0.88);
}

.demo-pop-enter-active {
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
}
.demo-pop-enter-from {
  transform: scale(0.4) translateY(6px);
  opacity: 0;
}

/* ── Mobile ─────────────────────────────────────────────── */
@media (max-width: 35em) {
  .tour-card,
  .tour-card--hero {
    max-height: min(72vh, calc(100vh - 32px - env(safe-area-inset-bottom, 0px)));
    overflow-y: auto;
    border-radius: 18px 18px 14px 14px;
  }

  .tour-body {
    padding: var(--space-400);
    gap: var(--space-200);
  }

  .tour-hero-logo { width: 200px; }
  .tour-hero-header { padding: var(--space-400); min-height: 90px; }

  .tour-title { font-size: 15px; }
  .tour-desc  { font-size: 13px; }

  .tour-footer {
    flex-wrap: wrap;
  }

  .tour-footer-spacer { width: 60px; }

  .demo-features { gap: var(--space-100); }
  .demo-feature { padding: var(--space-150) var(--space-200); }

  .demo-win-wrap {
    padding: var(--space-400) var(--space-300) 220px;
    align-items: flex-start;
  }

  .demo-ex-grid {
    zoom: 0.65;
  }

  .demo-win {
    max-width: calc(100vw - 32px);
  }
}

@media (max-width: 23em) {
  .demo-ex-grid {
    grid-template-columns: 1fr;
    zoom: 0.85;
  }
}
</style>
