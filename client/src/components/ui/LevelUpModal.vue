<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { TrophyIcon, ArrowRightIcon, LockOpenIcon, ChevronRightIcon, ChevronLeftIcon, BoltIcon } from '@heroicons/vue/24/outline'
import UiButton from './UiButton.vue'
import UiModal from './UiModal.vue'
import UiScrollArea from './UiScrollArea.vue'
import { getLevelProgressFromPoints } from '@/utils/gamification'
import { generateConfetti } from '@/utils/confetti'

type UnlockType = 'color' | 'bg' | 'effect' | 'border' | 'feature'

type UnlockItem = {
  label: string
  type: UnlockType
  hex?: string
  gradVar?: string
  desc?: string
}

const UNLOCKS_BY_LEVEL: Record<number, UnlockItem[]> = {
  2: [
    { label: 'Teal Claro', type: 'color', hex: '#a7d2cf' },
  ],
  3: [
    { label: 'Desafios Diários', type: 'feature', desc: 'Um desafio por dia, por livro' },
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

// Animation phases
type Phase = 'idle' | 'filling' | 'flip' | 'settled'
const phase = ref<Phase>('idle')
const barWidth = ref(0)
const displayLevel = ref(props.oldLevel)
let timers: number[] = []

// Slide: 'level' = slide 1, 'unlocks' = slide 2
const slide = ref<'level' | 'unlocks'>('level')

const clearTimers = () => { timers.forEach(clearTimeout); timers = [] }

const newLevelInfo = computed(() => getLevelProgressFromPoints(props.currentPoints))

const startAnimation = () => {
  clearTimers()
  slide.value = 'level'
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
  else { clearTimers(); phase.value = 'idle'; slide.value = 'level' }
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
const hasUnlocks = computed(() => newUnlocks.value.length > 0)

// Group unlocks by category
type UnlockGroup = { label: string; items: UnlockItem[] }

const unlockGroups = computed<UnlockGroup[]>(() => {
  const all = newUnlocks.value
  const groups: UnlockGroup[] = []

  const features = all.filter(u => u.type === 'feature')
  if (features.length) groups.push({ label: 'Funcionalidades', items: features })

  const colors = all.filter(u => u.type === 'color')
  if (colors.length) groups.push({ label: 'Cores do Avatar', items: colors })

  const borders = all.filter(u => u.type === 'border')
  if (borders.length) groups.push({ label: 'Bordas do Avatar', items: borders })

  const effects = all.filter(u => u.type === 'effect')
  if (effects.length) groups.push({ label: 'Efeitos do Avatar', items: effects })

  const bgs = all.filter(u => u.type === 'bg')
  if (bgs.length) groups.push({ label: 'Fundos', items: bgs })

  return groups
})

function bgStyle(item: UnlockItem): Record<string, string> {
  if (!item.gradVar) return {}
  return { background: `var(${item.gradVar})` }
}

const borderClass = (item: UnlockItem) => {
  if (item.label === 'Borda Anel') return 'preview-border--ring'
  if (item.label === 'Borda Pesada') return 'preview-border--heavy'
  return 'preview-border--minimal'
}
</script>

<template>
  <UiModal :visible="visible" aria-label="Subiste de nível!">
    <div class="levelup-card">

      <!-- Confetti -->
      <div class="confetti-wrap" aria-hidden="true">
        <span
          v-for="p in confetti"
          :key="p.id"
          class="cp"
          :style="{ '--c': p.color, '--l': p.left, '--d': p.delay, '--dur': p.dur, width: p.w, height: p.h, '--r': p.rot }"
        />
      </div>

      <!-- ─── Slide 1: Nível ─── -->
      <Transition name="slide-fade" mode="out-in">
        <div v-if="slide === 'level'" class="slide slide-level" key="level">

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
            <Transition name="hint-fade">
              <p v-if="hasUnlocks && phase === 'settled'" class="unlock-hint">
                Desbloqueaste {{ newUnlocks.length }} {{ newUnlocks.length === 1 ? 'novidade' : 'novidades' }} neste nível!
              </p>
            </Transition>
          </div>

          <div class="actions-row">
            <UiButton
              v-if="hasUnlocks && (phase === 'flip' || phase === 'settled')"
              variant="secondary"
              style="flex: 1;"
              @click="slide = 'unlocks'"
            >
              Ver o que desbloqueaste
            </UiButton>
            <UiButton variant="primary" style="flex: 1;" @click="emit('close')">
              Continuar
            </UiButton>
          </div>

        </div>

        <!-- ─── Slide 2: Novidades ─── -->
        <div v-else class="slide slide-unlocks" key="unlocks">

          <div class="unlocks-top">
            <button class="slide-back-btn" type="button" @click="slide = 'level'" aria-label="Voltar">
              <ChevronLeftIcon style="width:16px;height:16px;stroke-width:2.5;" aria-hidden="true" />
            </button>
            <div class="unlocks-title-row">
              <LockOpenIcon class="unlocks-title-icon" aria-hidden="true" />
              <h2 class="unlocks-title">Novidades desbloqueadas!</h2>
            </div>
          </div>

          <p class="unlocks-count">
            {{ newUnlocks.length }} {{ newUnlocks.length === 1 ? 'item desbloqueado' : 'itens desbloqueados' }} neste nível
          </p>

          <UiScrollArea max-height="320px">
          <div class="groups-list">
            <div v-for="group in unlockGroups" :key="group.label" class="group">
              <p class="group-label">{{ group.label }}</p>

              <!-- Features (funcionalidades) -->
              <div v-if="group.items[0].type === 'feature'" class="feature-list">
                <div v-for="item in group.items" :key="item.label" class="feature-item">
                  <div class="feature-icon-wrap" aria-hidden="true">
                    <BoltIcon class="feature-icon" />
                  </div>
                  <div class="feature-text">
                    <span class="feature-name">{{ item.label }}</span>
                    <span v-if="item.desc" class="feature-desc">{{ item.desc }}</span>
                  </div>
                </div>
              </div>

              <!-- Cosméticos -->
              <div v-else class="cosmetics-grid">
                <div v-for="item in group.items" :key="item.label" class="unlock-item">

                  <div v-if="item.type === 'color'" class="unlock-preview preview-color">
                    <span class="color-swatch" :style="{ background: item.hex }" />
                  </div>

                  <div v-else-if="item.type === 'bg'" class="unlock-preview preview-bg" :style="bgStyle(item)" />

                  <div v-else-if="item.type === 'effect'" class="unlock-preview preview-effect">
                    <span class="effect-label">{{ EFFECT_LABELS[item.label] ?? item.label }}</span>
                  </div>

                  <div v-else-if="item.type === 'border'" class="unlock-preview preview-border" :class="borderClass(item)">
                    <span class="border-inner" />
                  </div>

                  <span class="unlock-item-label">{{ item.label }}</span>
                </div>
              </div>
            </div>
          </div>
          </UiScrollArea>

          <UiButton variant="primary" style="width:100%;display:flex;" @click="emit('close')">
            Fechar
          </UiButton>

        </div>
      </Transition>

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

/* Slide transitions */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.slide-fade-enter-from { opacity: 0; transform: translateX(24px); }
.slide-fade-leave-to   { opacity: 0; transform: translateX(-24px); }

.slide {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Slide 1 ── */
.slide-level {
  align-items: center;
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
.lvl-bubble.old.dimmed { opacity: 0.35; transform: scale(0.88); }
.lvl-bubble.new { opacity: 0.4; transform: scale(0.88); background: var(--color-teal-100); border-color: var(--btn-border); }
.lvl-bubble.new.lit { opacity: 1; transform: scale(1.1); box-shadow: 6px 6px 0 var(--color-shadow); }
.lvl-num { font-size: 40px; font-weight: 800; color: var(--color-mirage-800); line-height: 1; display: block; }
.arrow-icon { width: 28px; height: 28px; color: var(--color-mirage-400); flex-shrink: 0; }

/* Progress bar */
.bar-section { margin-bottom: 24px; width: 100%; }
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

/* Unlock hint */
.unlock-hint {
  margin: 10px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-deep-600);
  text-align: center;
}

.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

/* Actions */
.actions-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

/* ── Slide 2 ── */
.slide-unlocks {
  text-align: left;
  gap: 20px;
}

.unlocks-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slide-back-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
  cursor: pointer;
  color: var(--color-mirage-700);
  transition: background 0.15s ease, transform 0.1s ease;
  flex-shrink: 0;
}
.slide-back-btn:hover { background: var(--color-wild-300); }
.slide-back-btn:active { transform: translate(2px, 2px); box-shadow: none; }

.unlocks-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
}
.unlocks-title-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
  color: var(--color-deep-600);
  flex-shrink: 0;
}
.unlocks-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-mirage-800);
  margin: 0;
}

/* Unlocks count message */
.unlocks-count {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-mirage-500);
}

/* Groups */
.groups-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 6px;
}

.group {}

.group-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
  margin: 0 0 8px;
}

/* Features */
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--color-deep-100);
  border: 2px solid var(--color-deep-400);
  box-shadow: 2px 2px 0 var(--color-shadow);
}
.feature-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-deep-600);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.feature-icon { width: 18px; height: 18px; color: #fff; stroke-width: 2; }
.feature-text { display: flex; flex-direction: column; gap: 2px; }
.feature-name { font-size: 13px; font-weight: 800; color: var(--color-deep-800); }
.feature-desc { font-size: 11px; font-weight: 500; color: var(--color-deep-600); }

/* Cosmetics grid */
.cosmetics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 10px;
}

.unlock-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.unlock-preview {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 rgba(0,0,0,0.12);
  overflow: hidden;
}

/* Color */
.preview-color {
  background: var(--color-wild-200);
  display: grid;
  place-items: center;
}
.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 1px 1px 0 rgba(0,0,0,0.2);
  display: block;
}

/* BG */
.preview-bg { /* background set inline */ }

/* Effect */
.preview-effect {
  background: var(--color-deep-700);
  display: grid;
  place-items: center;
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

/* Border */
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
.preview-border--minimal .border-inner { border: 1px solid var(--color-mirage-800); }
.preview-border--heavy   .border-inner { border: 4px solid var(--color-mirage-800); }
.preview-border--ring    .border-inner {
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
  max-width: 60px;
}
</style>
