<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UiButton from './UiButton.vue'
import UiModal from './UiModal.vue'
import UiCheckbox from './UiCheckbox.vue'
import UiStatCard from './UiStatCard.vue'
import {
  BookOpenIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
} from '@heroicons/vue/24/outline'
import type { SessionMode } from '@/composables/useModuleSession'

const props = defineProps<{
  visible: boolean
  stats: { total: number; answered: number; correct: number; wrong: number; remaining: number } | null
}>()

const emit = defineEmits<{
  close: []
  start: [mode: SessionMode]
}>()

const includeUnanswered = ref(true)
const includeWrong = ref(true)

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    includeUnanswered.value = (props.stats?.remaining ?? 0) > 0
    includeWrong.value = (props.stats?.wrong ?? 0) > 0
  },
)

const hasUnanswered = computed(() => (props.stats?.remaining ?? 0) > 0)
const hasWrong = computed(() => (props.stats?.wrong ?? 0) > 0)

const computedMode = computed<SessionMode | null>(() => {
  if (includeUnanswered.value && includeWrong.value) return 'normal'
  if (includeWrong.value) return 'retry'
  if (includeUnanswered.value) return 'fresh'
  return null
})

const canStart = computed(() => computedMode.value !== null)

const handleStart = () => {
  if (!computedMode.value) return
  emit('start', computedMode.value)
}

const toggleUnanswered = () => { if (hasUnanswered.value) includeUnanswered.value = !includeUnanswered.value }
const toggleWrong = () => { if (hasWrong.value) includeWrong.value = !includeWrong.value }
</script>

<template>
  <UiModal :visible="visible" close-on-overlay @close="emit('close')">
    <div class="mode-modal" role="dialog" aria-modal="true" aria-label="Configurar sessão">

      <header class="mode-modal__header">
        <p class="mode-modal__eyebrow">Exercícios do módulo</p>
        <h2 class="mode-modal__title">Configurar sessão</h2>
        <p class="mode-modal__sub">Escolhe que tipos de perguntas queres praticar.</p>
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

      <div class="filter-section">
        <button
          type="button"
          class="filter-option"
          :class="{ 'filter-option--active': includeUnanswered && hasUnanswered, 'filter-option--disabled': !hasUnanswered }"
          :disabled="!hasUnanswered"
          @click="toggleUnanswered"
        >
          <div class="filter-option__icon filter-option__icon--new">
            <ClipboardDocumentListIcon class="filter-icon" aria-hidden="true" />
          </div>
          <div class="filter-option__body">
            <span class="filter-option__title">Perguntas não respondidas</span>
            <span class="filter-option__count">
              {{ stats?.remaining ?? 0 }} pergunta{{ (stats?.remaining ?? 0) === 1 ? '' : 's' }}
            </span>
          </div>
          <div class="filter-option__check">
            <UiCheckbox
              :model-value="includeUnanswered && hasUnanswered"
              :disabled="!hasUnanswered"
              @update="toggleUnanswered"
            />
          </div>
        </button>

        <button
          type="button"
          class="filter-option filter-option--wrong"
          :class="{ 'filter-option--active': includeWrong && hasWrong, 'filter-option--disabled': !hasWrong }"
          :disabled="!hasWrong"
          @click="toggleWrong"
        >
          <div class="filter-option__icon filter-option__icon--wrong">
            <ArrowPathIcon class="filter-icon" aria-hidden="true" />
          </div>
          <div class="filter-option__body">
            <span class="filter-option__title">Perguntas que errei</span>
            <span class="filter-option__count">
              {{ stats?.wrong ?? 0 }} pergunta{{ (stats?.wrong ?? 0) === 1 ? '' : 's' }}
            </span>
          </div>
          <div class="filter-option__check">
            <UiCheckbox
              :model-value="includeWrong && hasWrong"
              :disabled="!hasWrong"
              tone="accent"
              @update="toggleWrong"
            />
          </div>
        </button>
      </div>

      <p v-if="!hasUnanswered && !hasWrong" class="complete-notice">
        Completaste todos os exercícios deste módulo. Usa o Modo Estudo para rever.
      </p>

      <div class="mode-actions">
        <UiButton variant="outline" @click="emit('close')">Fechar</UiButton>
        <UiButton variant="primary" :disabled="!canStart" @click="handleStart">
          Começar
        </UiButton>
      </div>

      <p class="xp-footnote">* Exercícios que já erraste não dão pontos.</p>

    </div>
  </UiModal>
</template>

<style scoped>
.mode-modal {
  width: min(640px, 100%);
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
  font-size: 24px;
  font-weight: 800;
  color: var(--color-mirage-900);
}

.mode-modal__sub {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
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

/* ── Filter section ───────────────────── */
.filter-section {
  display: grid;
  gap: var(--space-200);
}

.filter-option {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  padding: 16px 18px;
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 4px 4px 0 var(--color-shadow);
  cursor: pointer;
  text-align: left;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  width: 100%;
}

.filter-option:hover:not(.filter-option--disabled) {
  transform: translateY(-2px);
  box-shadow: 5px 6px 0 var(--color-shadow);
}

.filter-option--active {
  background: var(--color-wild-100);
  border-color: var(--color-mirage-900);
}

.filter-option--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Option icon box ──────────────────── */
.filter-option__icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  display: grid;
  place-items: center;
}

.filter-option__icon--new {
  background: var(--color-deep-100);
}

.filter-option__icon--wrong {
  background: var(--color-error-muted);
}

.filter-icon {
  width: 22px;
  height: 22px;
  color: var(--color-mirage-700);
  stroke-width: 1.5;
}

.filter-option__icon--wrong .filter-icon {
  color: var(--color-error-strong);
}

/* ── Option body ──────────────────────── */
.filter-option__body {
  flex: 1;
  display: grid;
  gap: 2px;
}

.filter-option__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.filter-option__count {
  font-size: 12px;
  color: var(--color-mirage-500);
  font-weight: 600;
}

/* ── Checkbox slot ────────────────────── */
.filter-option__check {
  flex-shrink: 0;
  pointer-events: none;
}

/* ── Complete notice ──────────────────── */
.complete-notice {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
  text-align: center;
  padding: 14px;
  border-radius: 12px;
  border: 2px dashed var(--color-mirage-300);
}

/* ── Actions ──────────────────────────── */
.mode-actions {
  display: flex;
  gap: var(--space-300);
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* ── XP footnote ──────────────────────── */
.xp-footnote {
  margin: 0;
  font-size: 11px;
  color: var(--color-mirage-400);
  text-align: right;
}

@media (max-width: 640px) {
  .mode-modal {
    width: min(640px, calc(100vw - 1rem));
    padding: 18px;
  }

  .mode-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-option {
    padding: 14px;
    align-items: flex-start;
  }

  .filter-option__icon {
    width: 40px;
    height: 40px;
  }

  .filter-option__title {
    font-size: 14px;
  }

  .mode-actions {
    flex-direction: column;
  }

  .mode-actions :deep(.ui-button) {
    width: 100%;
  }

  .xp-footnote {
    text-align: left;
  }
}
</style>
