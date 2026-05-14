<script setup lang="ts">
import { computed } from 'vue'
import UiButton from './UiButton.vue'
import UiModal from './UiModal.vue'
import UiStatCard from './UiStatCard.vue'
import ModeCard from './ModeCard.vue'
import {
  BookOpenIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/vue/24/outline'

type SessionMode = 'normal' | 'retry' | 'review'

const props = defineProps<{
  visible: boolean
  stats: { total: number; answered: number; correct: number; wrong: number; remaining: number } | null
  selectedMode: SessionMode
}>()

const emit = defineEmits<{
  close: []
  start: [mode: SessionMode]
  'update:selectedMode': [mode: SessionMode]
}>()

const modeCounts = computed(() => {
  const s = props.stats
  if (!s) return { normal: 0, retry: 0, review: 0 }
  return {
    normal: s.remaining + s.wrong,
    retry: s.wrong,
    review: s.correct,
  }
})

const canStart = (mode: SessionMode) => {
  const s = props.stats
  if (!s) return false
  if (mode === 'normal') return modeCounts.value.normal > 0
  if (mode === 'retry') return modeCounts.value.retry > 0
  return s.total > 0 && s.correct > 0
}
</script>

<template>
  <UiModal :visible="visible" close-on-overlay @close="emit('close')">
    <div class="mode-modal" role="dialog" aria-modal="true" aria-label="Escolher modo">

      <header class="mode-modal__header">
        <p class="mode-modal__eyebrow">Exercícios do módulo</p>
        <h2 class="mode-modal__title">Escolhe o modo</h2>
      </header>

      <div class="mode-stats">
        <UiStatCard label="Total" :value="stats?.total ?? 0">
          <template #icon>
            <BookOpenIcon class="stat-icon" aria-hidden="true" />
          </template>
        </UiStatCard>
        <UiStatCard label="Certas" :value="stats?.correct ?? 0">
          <template #icon>
            <CheckCircleIcon class="stat-icon stat-icon--correct" aria-hidden="true" />
          </template>
        </UiStatCard>
        <UiStatCard label="Erradas" :value="stats?.wrong ?? 0">
          <template #icon>
            <XCircleIcon class="stat-icon stat-icon--wrong" aria-hidden="true" />
          </template>
        </UiStatCard>
        <UiStatCard label="Por fazer" :value="stats?.remaining ?? 0">
          <template #icon>
            <ClockIcon class="stat-icon" aria-hidden="true" />
          </template>
        </UiStatCard>
      </div>

      <div class="mode-grid">
        <ModeCard
          title="Normal"
          description="Exercícios novos e os que erraste anteriormente."
          :count="modeCounts.normal"
          :active="selectedMode === 'normal'"
          :disabled="!canStart('normal')"
          @select="emit('update:selectedMode', 'normal')"
        />
        <ModeCard
          title="Repetir errados"
          description="Foca-te apenas nos exercícios que falhaste."
          :count="modeCounts.retry"
          :active="selectedMode === 'retry'"
          :disabled="!canStart('retry')"
          @select="emit('update:selectedMode', 'retry')"
        />
        <ModeCard
          title="Rever"
          description="Revê os exercícios que já concluíste."
          :count="modeCounts.review"
          :active="selectedMode === 'review'"
          :disabled="!canStart('review')"
          @select="emit('update:selectedMode', 'review')"
        />
      </div>

      <p class="xp-footnote">
        * Só ganhas XP no modo <strong>Normal</strong>, para exercícios ainda sem resposta certa.
        Os modos <em>Repetir errados</em> e <em>Rever</em> não atribuem XP.
      </p>

      <div class="mode-actions">
        <UiButton variant="outline" @click="emit('close')">Fechar</UiButton>
        <UiButton variant="primary" :disabled="!canStart(selectedMode)" @click="emit('start', selectedMode)">
          Começar
        </UiButton>
      </div>

    </div>
  </UiModal>
</template>

<style scoped>
.mode-modal {
  width: min(860px, 100%);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 20px;
  box-shadow: 8px 8px 0 var(--color-shadow);
  padding: 32px;
  display: grid;
  gap: var(--space-400);
}

/* ── Header ───────────────────────────── */
.mode-modal__header {
  display: grid;
  gap: 4px;
}

.mode-modal__eyebrow {
  margin: 0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-deep-600);
  font-weight: 800;
}

.mode-modal__title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--color-mirage-900);
}

/* ── Stat row ─────────────────────────── */
.mode-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-200);
}

.stat-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  stroke-width: 1.8;
  color: var(--color-mirage-500);
}

.stat-icon--correct { color: var(--color-deep-600); }
.stat-icon--wrong   { color: var(--color-error-strong); }

/* ── Mode grid ────────────────────────── */
.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: stretch;
  gap: var(--space-300);
}

/* ── XP footnote ──────────────────────── */
.xp-footnote {
  margin: 0;
  font-size: 11px;
  color: var(--color-mirage-400);
  line-height: 1.5;
}

.xp-footnote strong { font-weight: 700; color: var(--color-mirage-500); }
.xp-footnote em     { font-style: normal; }

/* ── Actions ──────────────────────────── */
.mode-actions {
  display: flex;
  gap: var(--space-300);
  flex-wrap: wrap;
  justify-content: flex-end;
}
</style>
