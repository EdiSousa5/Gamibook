<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { TrophyIcon, ArrowRightIcon, LockOpenIcon } from '@heroicons/vue/24/outline'
import UiButton from './UiButton.vue'
import UiModal from './UiModal.vue'
import { getLevelProgressFromPoints } from '@/utils/gamification'
import { generateConfetti } from '@/utils/confetti'

type UnlockType = 'color' | 'bg' | 'effect' | 'border'

type UnlockItem = {
  label: string
  type: UnlockType
  hex?: string
  gradVar?: string
}

const UNLOCKS_BY_LEVEL: Record<number, UnlockItem[]> = {
  2: [
    { label: 'Teal Claro', type: 'color', hex: '#a7d2cf' },
  ],
  3: [
    { label: 'Borda Mínima', type: 'border' },
    { label: 'Água Clara', type: 'bg', gradVar: '--grad-3' },
  ],
  5: [
    { label: 'Teal Escuro', type: 'color', hex: '#075056' },
    { label: 'Âmbar', type: 'color', hex: '#ff8a50' },
    { label: 'Efeito Brilho', type: 'effect' },
    { label: 'Efeito Sombra', type: 'effect' },
    { label: 'Carmesim Suave', type: 'bg', gradVar: '--grad-27' },
    { label: 'Âmbar Claro', type: 'bg', gradVar: '--grad-28' },
    { label: 'Amanhecer', type: 'bg', gradVar: '--grad-2' },
    { label: 'Pêssego', type: 'bg', gradVar: '--grad-9' },
  ],
  7: [
    { label: 'Borda Pesada', type: 'border' },
  ],
  8: [
    { label: 'Abóbora', type: 'color', hex: '#ffa74f' },
    { label: 'Âmbar Escuro', type: 'color', hex: '#e8611e' },
    { label: 'Efeito Lustro', type: 'effect' },
    { label: 'Menta', type: 'bg', gradVar: '--grad-6' },
  ],
  10: [
    { label: 'Carmesim', type: 'color', hex: '#d85252' },
    { label: 'Ardósia', type: 'color', hex: '#52656f' },
    { label: 'Borda Anel', type: 'border' },
    { label: 'Efeito Mono', type: 'effect' },
    { label: 'Aurora Ligeira', type: 'bg', gradVar: '--grad-7' },
    { label: 'Coral', type: 'bg', gradVar: '--grad-5' },
  ],
  12: [
    { label: 'Efeito Vívido', type: 'effect' },
    { label: 'Bosque Profundo', type: 'bg', gradVar: '--grad-20' },
    { label: 'Dourado', type: 'bg', gradVar: '--grad-16' },
    { label: 'Ondas Suaves', type: 'bg', gradVar: '--grad-10' },
  ],
  14: [
    { label: 'Ardósia Escuro', type: 'color', hex: '#22313a' },
    { label: 'Efeito Retro', type: 'effect' },
    { label: 'Aurora Suave', type: 'bg', gradVar: '--grad-12' },
    { label: 'Doce Carmesim', type: 'bg', gradVar: '--grad-18' },
  ],
  15: [
    { label: 'Carmesim Escuro', type: 'color', hex: '#9e2828' },
    { label: 'Rosado', type: 'bg', gradVar: '--grad-14' },
    { label: 'Brisa Quente', type: 'bg', gradVar: '--grad-11' },
  ],
  16: [
    { label: 'Flutuar', type: 'bg', gradVar: '--grad-13' },
    { label: 'Respiração', type: 'bg', gradVar: '--grad-17' },
  ],
  18: [
    { label: 'Fogo Boreal', type: 'bg', gradVar: '--grad-30' },
  ],
  20: [
    { label: 'Pulso Marinho', type: 'bg', gradVar: '--grad-31' },
  ],
}

const EFFECT_LABELS: Record<string, string> = {
  'Efeito Brilho': 'Brilho',
  'Efeito Sombra': 'Sombra',
  'Efeito Lustro': 'Lustro',
  'Efeito Mono': 'Mono',
  'Efeito Vívido': 'Vívido',
  'Efeito Retro': 'Retro',
}

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

const confetti = generateConfetti()

const newUnlocks = computed(() => UNLOCKS_BY_LEVEL[props.newLevel] ?? [])

function bgStyle(item: UnlockItem): Record<string, string> {
  if (!item.gradVar) return {}
  return { background: `var(${item.gradVar})` }
}
</script>

<template>
  <UiModal :visible="visible" aria-label="Subiste de nível!">
    <div class="levelup-card">

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

          <div v-if="newUnlocks.length > 0 && (phase === 'flip' || phase === 'settled')" class="unlocks-section">
            <div class="unlocks-header">
              <LockOpenIcon class="unlock-icon" aria-hidden="true" />
              <span>Desbloqueaste {{ newUnlocks.length === 1 ? 'uma novidade' : `${newUnlocks.length} novidades` }}!</span>
            </div>

            <div class="unlocks-grid">
              <div v-for="item in newUnlocks" :key="item.label" class="unlock-item">

                <!-- Cor -->
                <div v-if="item.type === 'color'" class="unlock-preview preview-color">
                  <span class="color-swatch" :style="{ background: item.hex }" />
                </div>

                <!-- Fundo -->
                <div v-else-if="item.type === 'bg'" class="unlock-preview preview-bg" :style="bgStyle(item)" />

                <!-- Efeito -->
                <div v-else-if="item.type === 'effect'" class="unlock-preview preview-effect">
                  <span class="effect-label">{{ EFFECT_LABELS[item.label] ?? item.label }}</span>
                </div>

                <!-- Borda -->
                <div v-else-if="item.type === 'border'" class="unlock-preview preview-border"
                  :class="item.label === 'Borda Anel' ? 'preview-border--ring' : item.label === 'Borda Pesada' ? 'preview-border--heavy' : 'preview-border--minimal'">
                  <span class="border-inner" />
                </div>

                <span class="unlock-item-label">{{ item.label }}</span>
              </div>
            </div>
          </div>

          <UiButton variant="primary" style="width: 100%; display: flex;" @click="emit('close')">
            Continuar
          </UiButton>

          <div class="confetti-wrap" aria-hidden="true">
            <span
              v-for="p in confetti"
              :key="p.id"
              class="cp"
              :style="{ '--c': p.color, '--l': p.left, '--d': p.delay, '--dur': p.dur, width: p.w, height: p.h, '--r': p.rot }"
            />
          </div>

        </div>
  </UiModal>
</template>

<style scoped>
.levelup-card {
  position: relative;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 24px;
  padding: 48px 40px 40px;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 6px 6px 0 var(--color-shadow);
  overflow: hidden;
  animation: card-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  will-change: transform, opacity;
}

@keyframes card-pop {
  from { transform: scale(0.82) translateY(20px); opacity: 0; }
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
  will-change: transform, opacity;
  animation: fall var(--dur) var(--d) ease-in forwards;
}

@keyframes fall {
  0%   { transform: translateY(0)     rotate(0deg);   opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translateY(600px) rotate(360deg); opacity: 0; }
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
  animation: trophy-bounce 0.5s 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  will-change: transform, opacity;
}

@keyframes trophy-bounce {
  from { transform: scale(0.4) rotate(-12deg); opacity: 0; }
  to   { transform: scale(1)   rotate(0deg);   opacity: 1; }
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

/* Progress bar */
.bar-section {
  margin-bottom: 20px;
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

/* Unlocks section */
.unlocks-section {
  margin-bottom: 20px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--color-wild-200);
  border: 2px solid var(--color-deep-600);
  box-shadow: 3px 3px 0 var(--color-shadow);
  text-align: left;
  animation: fade-in-up 0.3s ease both;
  will-change: transform, opacity;
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.unlocks-header {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 800;
  color: var(--color-deep-700);
  margin-bottom: 12px;
}

.unlock-icon {
  width: 15px;
  height: 15px;
  stroke-width: 2.5;
  flex-shrink: 0;
}

/* Grid de itens */
.unlocks-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.unlock-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 58px;
}

.unlock-preview {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 rgba(0,0,0,0.15);
  flex-shrink: 0;
  overflow: hidden;
}

/* Cor: fundo branco + círculo colorido centrado */
.preview-color {
  background: var(--color-wild-200);
  display: grid;
  place-items: center;
}

.color-swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  display: block;
  box-shadow: 1px 1px 0 rgba(0,0,0,0.2);
}

/* Fundo: mostra o gradiente diretamente */
.preview-bg {
  /* background set by inline style */
}

/* Efeito: pill com texto */
.preview-effect {
  background: var(--color-deep-700);
  display: grid;
  place-items: center;
  border-radius: 10px;
}

.effect-label {
  font-size: 9px;
  font-weight: 800;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  padding: 0 4px;
}

/* Borda: mostra o estilo de borda */
.preview-border {
  background: var(--color-wild-100);
  display: grid;
  place-items: center;
}

.border-inner {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
}

.preview-border--minimal .border-inner {
  border: 1px solid var(--color-mirage-800);
}

.preview-border--heavy .border-inner {
  border: 4px solid var(--color-mirage-800);
}

.preview-border--ring .border-inner {
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  outline: 3px solid var(--color-deep-500);
  outline-offset: 2px;
}

.unlock-item-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-mirage-700);
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
}
</style>
