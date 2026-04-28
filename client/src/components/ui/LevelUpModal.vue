<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { TrophyIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'
import UiButton from './UiButton.vue'
import { getLevelProgressFromPoints } from '@/utils/gamification'

const props = defineProps<{
  visible: boolean
  oldLevel: number
  newLevel: number
  currentPoints: number
}>()

const emit = defineEmits<{ close: [] }>()

type Phase = 'idle' | 'filling' | 'flip' | 'settled'
const phase = ref<Phase>('idle')
const barWidth = ref(0)
const displayLevel = ref(props.oldLevel)
let timers: number[] = []

const clearTimers = () => { timers.forEach(clearTimeout); timers = [] }

const newLevelInfo = computed(() => getLevelProgressFromPoints(props.currentPoints))

const startAnimation = () => {
  clearTimers()
  phase.value = 'filling'
  barWidth.value = 0
  displayLevel.value = props.oldLevel

  timers.push(window.setTimeout(() => { barWidth.value = 100 }, 200))
  timers.push(window.setTimeout(() => {
    phase.value = 'flip'
    displayLevel.value = props.newLevel
    barWidth.value = 0
  }, 2200))
  timers.push(window.setTimeout(() => {
    phase.value = 'settled'
    const { progress, nextLevelXp } = newLevelInfo.value
    barWidth.value = Math.max(2, Math.round((progress / nextLevelXp) * 100))
  }, 2700))
}

watch(() => props.visible, (val) => {
  if (val) startAnimation()
  else { clearTimers(); phase.value = 'idle' }
})

onUnmounted(clearTimers)

const rightLabel = computed(() => {
  if (phase.value === 'flip' || phase.value === 'settled') {
    const { progress, nextLevelXp } = newLevelInfo.value
    return `${progress}/${nextLevelXp} XP`
  }
  return `Nível ${displayLevel.value + 1}`
})

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
      <div v-if="visible" class="levelup-overlay" role="dialog" aria-modal="true" aria-label="Subiste de nível!">
        <div class="levelup-card">

          <div class="confetti-wrap" aria-hidden="true">
            <span
              v-for="p in confetti"
              :key="p.id"
              class="cp"
              :style="{ '--c': p.color, '--l': p.left, '--d': p.delay, '--dur': p.dur, width: p.w, height: p.h, '--r': p.rot }"
            />
          </div>

          <div class="trophy-wrap" aria-hidden="true">
            <TrophyIcon class="trophy-icon" />
          </div>

          <p class="up-label">SUBISTE DE NÍVEL!</p>

          <div class="levels-row">
            <div class="lvl-bubble old" :class="{ dimmed: phase === 'flip' || phase === 'settled' }">
              <strong class="lvl-num">{{ oldLevel }}</strong>
            </div>

            <ArrowRightIcon class="arrow-icon" aria-hidden="true" />

            <div class="lvl-bubble new" :class="{ lit: phase === 'flip' || phase === 'settled' }">
              <strong class="lvl-num">{{ newLevel }}</strong>
            </div>
          </div>

          <div class="bar-section">
            <div class="bar-labels">
              <span>Nível {{ displayLevel }}</span>
              <span>{{ rightLabel }}</span>
            </div>
            <div class="bar-track" role="progressbar" :aria-valuenow="barWidth" aria-valuemin="0" aria-valuemax="100">
              <div
                class="bar-fill"
                :style="{
                  width: `${barWidth}%`,
                  transition: phase === 'flip' ? 'width 0.25s ease' : 'width 1.8s cubic-bezier(0.4,0,0.2,1)',
                }"
              />
            </div>
          </div>

          <UiButton variant="primary" style="width: 100%; display: flex;" @click="emit('close')">
            Continuar
          </UiButton>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.levelup-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 24px;
}

.levelup-card {
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

/* Trophy */
.trophy-wrap {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: var(--color-deep-500);
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  animation: trophy-bounce 0.7s 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes trophy-bounce {
  from { transform: scale(0) rotate(-20deg); opacity: 0; }
  to   { transform: scale(1) rotate(0deg);   opacity: 1; }
}

.trophy-icon {
  width: 40px;
  height: 40px;
  color: #fff;
  stroke-width: 1.5;
}

/* Up label */
.up-label {
  margin: 0 0 24px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--color-deep-600);
}

/* Level row */
.levels-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 28px;
}

.lvl-bubble {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 10px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.lvl-bubble.old.dimmed {
  opacity: 0.35;
  transform: scale(0.88);
}

.lvl-bubble.new {
  opacity: 0.4;
  transform: scale(0.88);
  background: var(--color-teal-100);
  border-color: var(--btn-border);
}

.lvl-bubble.new.lit {
  opacity: 1;
  transform: scale(1.1);
  box-shadow: 6px 6px 0 var(--color-shadow);
}

.lvl-num {
  font-size: 40px;
  font-weight: 800;
  color: var(--color-mirage-800);
  line-height: 1;
  display: block;
}

.arrow-icon {
  width: 28px;
  height: 28px;
  color: var(--color-mirage-400);
  flex-shrink: 0;
}

/* Progress bar — matches UiProgress visually */
.bar-section {
  margin-bottom: 32px;
}

.bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
  margin-bottom: 8px;
}

.bar-track {
  width: 100%;
  height: 14px;
  background: var(--color-wild-100);
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-500));
  border-radius: inherit;
}

/* Overlay transition */
.overlay-fade-enter-active { animation: overlay-in 0.3s ease both; }
.overlay-fade-leave-active { animation: overlay-in 0.2s ease reverse both; }

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
