<script setup lang="ts">
import { ref, computed } from 'vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import BookBadge from '@/components/ui/BookBadge.vue'
import BookMockup from '@/components/ui/BookMockup.vue'
import BookShelf from '@/components/ui/BookShelf.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'
import UiChip from '@/components/ui/UiChip.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiPillButton from '@/components/ui/UiPillButton.vue'
import UiProgress from '@/components/ui/UiProgress.vue'
import UiRadio from '@/components/ui/UiRadio.vue'
import UiSearch from '@/components/ui/UiSearch.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import UiSlider from '@/components/ui/UiSlider.vue'
import UiSwitch from '@/components/ui/UiSwitch.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'
import UiToast from '@/components/ui/UiToast.vue'
import UiStatCard from '@/components/ui/UiStatCard.vue'
import UiResultPill from '@/components/ui/UiResultPill.vue'
import RankingListItem from '@/components/ui/RankingListItem.vue'
import LevelUpModal from '@/components/ui/LevelUpModal.vue'
import BadgeUnlockModal from '@/components/ui/BadgeUnlockModal.vue'
import BookUnlockModal from '@/components/ui/BookUnlockModal.vue'
import UiConfirmModal from '@/components/ui/UiConfirmModal.vue'
import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'
import type { Book } from '@/types'
import wintonUrl from '@/assets/images/winton.webp'
import { AVATAR_FRAMES } from '@/types/avatar'
import type { AvatarFrame, AvatarBorder, AvatarColor, AvatarEffect, AvatarShadow, AvatarCracha } from '@/types/avatar'
import {
  BellAlertIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaperClipIcon,
  BookOpenIcon,
  StarIcon,
  FireIcon,
  ArrowPathIcon,
} from '@heroicons/vue/24/outline'

const frameCategoryLabels: Record<string, string> = {
  basic: 'Básico',
  premium: 'Premium',
  epic: 'Épico',
}

const framesByCategory = (() => {
  const cats: Record<string, AvatarFrame[]> = { basic: [], premium: [], epic: [] }
  for (const id of Object.keys(AVATAR_FRAMES) as AvatarFrame[]) {
    cats[AVATAR_FRAMES[id].category]?.push(id)
  }
  return cats
})()

/* ── Avatar customization demo data ────────────────── */

const BORDER_DEMOS: { id: AvatarBorder; label: string }[] = [
  { id: 'default', label: 'Padrão' },
  { id: 'minimal', label: 'Mínimo' },
  { id: 'heavy', label: 'Pesada' },
  { id: 'ring', label: 'Anel' },
]

const COLOR_DEMOS: { id: AvatarColor; label: string; hex: string }[] = [
  { id: 'none', label: 'Sem cor', hex: 'none' },
  { id: 'teal', label: 'Teal', hex: '#4e9d98' },
  { id: 'teal-dark', label: 'Teal Escuro', hex: '#075056' },
  { id: 'teal-light', label: 'Teal Claro', hex: '#a7d2cf' },
  { id: 'amber', label: 'Âmbar', hex: '#ff8a50' },
  { id: 'amber-dark', label: 'Âmbar Escuro', hex: '#e8611e' },
  { id: 'pumpkin', label: 'Abóbora', hex: '#ffa74f' },
  { id: 'crimson', label: 'Carmesim', hex: '#d85252' },
  { id: 'crimson-dark', label: 'Carmesim Esc.', hex: '#9e2828' },
  { id: 'slate', label: 'Ardósia', hex: '#52656f' },
  { id: 'slate-dark', label: 'Ardósia Esc.', hex: '#22313a' },
  { id: 'black', label: 'Preto', hex: '#111111' },
]

const EFFECT_DEMOS: { id: AvatarEffect; label: string; desc: string }[] = [
  { id: 'none', label: 'Nenhum', desc: 'Sem efeito' },
  { id: 'glow', label: 'Brilho', desc: 'Halo suave' },
  { id: 'shine', label: 'Lustro', desc: 'Feixe de luz' },
  { id: 'sombra', label: 'Sombra', desc: 'Vinheta na imagem' },
  { id: 'retro', label: 'Retro', desc: 'Tom sépia suave' },
  { id: 'mono', label: 'Mono', desc: 'Escala de cinzentos' },
  { id: 'vivid', label: 'Vívido', desc: 'Cores reforçadas' },
]

const SHADOW_DEMOS: { id: AvatarShadow; label: string; desc: string }[] = [
  { id: 'none', label: 'Sem sombra', desc: 'Sem offset' },
  { id: 'small', label: 'Pequena', desc: '2px offset' },
  { id: 'default', label: 'Normal', desc: '4px offset' },
]

const CRACHA_DEMOS: { id: AvatarCracha; label: string; value: string }[] = [
  { id: 'rank', label: 'Classificação', value: '#12' },
  { id: 'exercises', label: 'Exercícios', value: '127' },
  { id: 'streak', label: 'Streak', value: '14d' },
  { id: 'level', label: 'Nível', value: 'Nv5' },
  { id: 'bronze', label: 'Bronze', value: '3' },
  { id: 'silver', label: 'Prata', value: '2' },
  { id: 'gold', label: 'Ouro', value: '1' },
  { id: 'diamond', label: 'Diamante', value: '1' },
  { id: 'galaxy', label: 'Galáxia', value: '1' },
]

/* ── Playtest state ──────────────────────────────────── */
const playtestBorder = ref<AvatarBorder>('default')
const playtestColor = ref<AvatarColor | null>(null)
const playtestEffect = ref<AvatarEffect>('none')
const playtestShadow = ref<AvatarShadow>('default')
const playtestCracha = ref<AvatarCracha | null>(null)

const playtestCrachaValue = computed(() =>
  playtestCracha.value
    ? (CRACHA_DEMOS.find(c => c.id === playtestCracha.value)?.value ?? '?')
    : undefined
)

/* ── Form state ──────────────────────────────────────── */
const inputValue = ref<string | number>('')
const textareaValue = ref('')
const selectValue = ref<string | number | null>('opt-1')
const checkboxValue = ref(false)
const radioValue = ref<string | number>('a')
const switchValue = ref(true)
const switchAlt = ref(false)
const sliderValue = ref(35)
const segmentedValue = ref('grid')
const searchValue = ref('')
const modalOpen = ref(false)

/* ── Animation modals ────────────────────────────────────── */
const levelUpVisible = ref(false)
const badgeUnlockVisible = ref(false)
const badgeTierDemo = ref<BookBadgeTier>('bronze')
const bookUnlockVisible = ref(false)
const confirmModalVisible = ref(false)

const mockBook: Book = {
  book_id: 0,
  title: 'O Principezinho',
  description: 'Uma história sobre a amizade e a imaginação de um pequeno príncipe que viaja pelos planetas.',
  cover_img: null,
}

function openBadge(tier: BookBadgeTier) {
  badgeTierDemo.value = tier
  badgeUnlockVisible.value = true
}

const selectOptions = [
  { label: 'Opção 1', value: 'opt-1' },
  { label: 'Opção 2', value: 'opt-2' },
  { label: 'Opção 3', value: 'opt-3' },
]
const segmentedOptions = [
  { label: 'Grelha', value: 'grid' },
  { label: 'Lista', value: 'list' },
]

/* ── Interactive exercise ────────────────────────────── */
const exercisePick = ref<string | null>(null)
function pickOption(letter: string) {
  exercisePick.value = exercisePick.value === letter ? null : letter
}
function optionClass(letter: string) {
  if (exercisePick.value === letter) return 'is-selected'
  return ''
}

/* ── Color palette ───────────────────────────────────── */
const colorFamilies = [
  {
    name: 'Deep', label: 'Primária de marca',
    shades: [
      { step: 100, hex: '#e8f5f4' }, { step: 200, hex: '#cbe7e5' },
      { step: 300, hex: '#a7d2cf' }, { step: 400, hex: '#7fb8b4' },
      { step: 500, hex: '#4e9d98' }, { step: 600, hex: '#2e7f7b' },
      { step: 700, hex: '#075056' }, { step: 800, hex: '#053e43' },
      { step: 900, hex: '#032e32' }, { step: 1000, hex: '#021d20' },
    ],
  },
  {
    name: 'Teal', label: 'Secundária',
    shades: [
      { step: 100, hex: '#e2f1ef' }, { step: 200, hex: '#c3e1dd' },
      { step: 300, hex: '#9fcbc7' }, { step: 400, hex: '#74b0aa' },
      { step: 500, hex: '#48958f' }, { step: 600, hex: '#257b74' },
      { step: 700, hex: '#0d584f' }, { step: 800, hex: '#0a4540' },
      { step: 900, hex: '#06322e' }, { step: 1000, hex: '#041f1d' },
    ],
  },
  {
    name: 'Amber', label: 'Destaque / CTA',
    shades: [
      { step: 100, hex: '#fff0e7' }, { step: 200, hex: '#ffdcc7' },
      { step: 300, hex: '#ffc29f' }, { step: 400, hex: '#ffa874' },
      { step: 500, hex: '#ff8a50' }, { step: 600, hex: '#ff7a3a' },
      { step: 700, hex: '#e8611e' }, { step: 800, hex: '#ba4c15' },
      { step: 900, hex: '#8c370d' }, { step: 1000, hex: '#5e2306' },
    ],
  },
  {
    name: 'Pumpkin', label: 'Streak / Caloroso',
    shades: [
      { step: 100, hex: '#fff4e0' }, { step: 200, hex: '#ffe4b8' },
      { step: 300, hex: '#ffd28a' }, { step: 400, hex: '#ffbd63' },
      { step: 500, hex: '#ffaa51' }, { step: 600, hex: '#ffa74f' },
      { step: 700, hex: '#e38c35' }, { step: 800, hex: '#b66c24' },
      { step: 900, hex: '#874e17' }, { step: 1000, hex: '#5a320c' },
    ],
  },
  {
    name: 'Mirage', label: 'Neutro escuro',
    shades: [
      { step: 100, hex: '#e6ebed' }, { step: 200, hex: '#c9d3d8' },
      { step: 300, hex: '#a8b5bc' }, { step: 400, hex: '#7d8f98' },
      { step: 500, hex: '#52656f' }, { step: 600, hex: '#34434d' },
      { step: 700, hex: '#22313a' }, { step: 800, hex: '#1a262e' },
      { step: 900, hex: '#16232b' }, { step: 1000, hex: '#0e161b' },
    ],
  },
  {
    name: 'Wild', label: 'Neutro claro / Superfícies',
    shades: [
      { step: 100, hex: '#ffffff' }, { step: 200, hex: '#f9fbfb' },
      { step: 300, hex: '#f3f7f8' }, { step: 400, hex: '#ecf2f3' },
      { step: 500, hex: '#e4eef0' }, { step: 600, hex: '#d6e4e7' },
      { step: 700, hex: '#c2d1d5' }, { step: 800, hex: '#aab9be' },
      { step: 900, hex: '#8b9ba1' }, { step: 1000, hex: '#65747a' },
    ],
  },
  {
    name: 'Crimson', label: 'Erro / Incorreto',
    shades: [
      { step: 100, hex: '#fceeee' }, { step: 200, hex: '#f8d3d3' },
      { step: 300, hex: '#f0adad' }, { step: 400, hex: '#e47e7e' },
      { step: 500, hex: '#d85252' }, { step: 600, hex: '#bd3636' },
      { step: 700, hex: '#9e2828' }, { step: 800, hex: '#802323' },
      { step: 900, hex: '#682020' }, { step: 1000, hex: '#421010' },
    ],
  },
]

const semanticTokens = [
  { name: 'Primary', token: '--color-primary', hex: '#2e7f7b', note: 'deep-600' },
  { name: 'Accent', token: '--color-accent', hex: '#ff7a3a', note: 'amber-600' },
  { name: 'Shadow', token: '--color-shadow', hex: '#7fb8b4', note: 'deep-400' },
  { name: 'Error', token: '--color-error', hex: '#bd3636', note: 'crimson-600' },
  { name: 'Surface', token: '--color-surface', hex: '#f9fbfb', note: 'wild-200' },
  { name: 'Text', token: '--color-text', hex: '#1a1a1a', note: 'brand-black' },
  { name: 'Text Muted', token: '--color-text-muted', hex: '#52656f', note: 'mirage-500' },
]

const gradients = [
  { id: 'bg-1', name: 'Original', style: 'var(--grad-1)' },
  { id: 'bg-2', name: 'Amanhecer', style: 'var(--grad-2)' },
  { id: 'bg-3', name: 'Água Clara', style: 'var(--grad-3)' },
  { id: 'bg-5', name: 'Coral', style: 'var(--grad-5)' },
  { id: 'bg-6', name: 'Menta', style: 'var(--grad-6)' },
  { id: 'bg-7', name: 'Aurora Ligeira', style: 'var(--grad-7)' },
  { id: 'bg-9', name: 'Pêssego', style: 'var(--grad-9)' },
  { id: 'bg-10', name: 'Ondas Suaves', style: 'var(--grad-10)' },
  { id: 'bg-11', name: 'Brisa Quente', style: 'var(--grad-11)' },
  { id: 'bg-12', name: 'Aurora Suave', style: 'var(--grad-12)' },
  { id: 'bg-13', name: 'Flutuar', style: 'var(--grad-13)' },
  { id: 'bg-14', name: 'Rosado', style: 'var(--grad-14)' },
  { id: 'bg-16', name: 'Dourado', style: 'var(--grad-16)' },
  { id: 'bg-17', name: 'Respiração', style: 'var(--grad-17)' },
  { id: 'bg-18', name: 'Doce Carmesim', style: 'var(--grad-18)' },
  { id: 'bg-20', name: 'Bosque Profundo', style: 'var(--grad-20)' },
  { id: 'bg-22', name: 'Branco Puro', style: 'var(--grad-22)' },
  { id: 'bg-24', name: 'Menta Claro', style: 'var(--grad-24)' },
  { id: 'bg-25', name: 'Areia', style: 'var(--grad-25)' },
  { id: 'bg-26', name: 'Teal Claro', style: 'var(--grad-26)' },
  { id: 'bg-27', name: 'Carmesim Suave', style: 'var(--grad-27)' },
  { id: 'bg-28', name: 'Âmbar Claro', style: 'var(--grad-28)' },
  { id: 'bg-30', name: 'Fogo Boreal', style: 'var(--grad-30)' },
  { id: 'bg-31', name: 'Pulso Marinho', style: 'var(--grad-31)' },
]

/* ── Helpers ─────────────────────────────────────────── */
function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}
</script>

<template>
  <div class="kit">

    <!-- Hero ───────────────────────────────────────────── -->
    <header class="kit-hero">
      <div class="kit-hero-body">
        <p class="kit-kicker">Sistema visual</p>
        <h1>Ui Kit</h1>
        <p class="kit-subtitle">
          Referência completa de todos os componentes, estados e variantes da plataforma GamiBook.
        </p>
      </div>
    </header>

    <!-- ━━━ 01 TIPOGRAFIA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section v-once class="kit-section">
      <div class="kit-section-head">
        <span class="kit-section-num">01</span>
        <h2>Tipografia</h2>
      </div>
      <UiCard class="card-standalone">
        <div class="type-cols">
          <div class="type-group">
            <p class="group-caption">Display — Outfit</p>
            <div class="type-list">
              <div class="type-row">
                <span class="type-meta">H1 · 32px · 700</span>
                <span class="t-h1">Título principal</span>
              </div>
              <div class="type-row">
                <span class="type-meta">H2 · 24px · 700</span>
                <span class="t-h2">Secção do livro</span>
              </div>
              <div class="type-row">
                <span class="type-meta">H3 · 20px · 700</span>
                <span class="t-h3">Nome do módulo</span>
              </div>
              <div class="type-row">
                <span class="type-meta">H4 · 16px · 700</span>
                <span class="t-h4">Subtítulo de card</span>
              </div>
            </div>
          </div>
          <div class="type-group">
            <p class="group-caption">Corpo — Manrope</p>
            <div class="type-list">
              <div class="type-row">
                <span class="type-meta">Body · 16px</span>
                <span class="t-body">Texto de leitura principal com linha de 1.6.</span>
              </div>
              <div class="type-row">
                <span class="type-meta">Small · 14px</span>
                <span class="t-small">Texto secundário em cards e descrições.</span>
              </div>
              <div class="type-row">
                <span class="type-meta">Caption · 12px · 600</span>
                <span class="t-caption">Metadados e informação auxiliar</span>
              </div>
              <div class="type-row">
                <span class="type-meta">Kicker · 11px · 700</span>
                <span class="t-kicker">CATEGORIA · ETIQUETA</span>
              </div>
            </div>
          </div>
        </div>
      </UiCard>

      <div class="grid two-col">
        <UiCard>
          <h3 class="card-h">Cores de texto</h3>
          <div class="column">
            <div class="ctxt-row"><span class="ctxt-dot" style="background:var(--color-mirage-800)" /><span
                style="color:var(--color-mirage-800);font-weight:700">Primário — mirage-800</span></div>
            <div class="ctxt-row"><span class="ctxt-dot" style="background:var(--color-mirage-600)" /><span
                style="color:var(--color-mirage-600);font-weight:600">Secundário — mirage-600</span></div>
            <div class="ctxt-row"><span class="ctxt-dot" style="background:var(--color-mirage-500)" /><span
                style="color:var(--color-mirage-500)">Muted — mirage-500</span></div>
            <div class="ctxt-row"><span class="ctxt-dot" style="background:var(--color-deep-600)" /><span
                style="color:var(--color-deep-600);font-weight:700">Marca — deep-600</span></div>
            <div class="ctxt-row"><span class="ctxt-dot" style="background:var(--color-amber-600)" /><span
                style="color:var(--color-amber-600);font-weight:700">Destaque — amber-600</span></div>
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">Superfícies</h3>
          <div class="surface-grid">
            <div class="surface-item">
              <div class="surface-box"
                style="background:var(--color-wild-100);box-shadow:4px 4px 0 var(--color-shadow)" />
              <span class="surface-lbl">wild-100 · sombra</span>
            </div>
            <div class="surface-item">
              <div class="surface-box" style="background:var(--color-wild-200)" />
              <span class="surface-lbl">wild-200 · base</span>
            </div>
            <div class="surface-item">
              <div class="surface-box" style="background:var(--color-deep-100)" />
              <span class="surface-lbl">deep-100 · marca</span>
            </div>
            <div class="surface-item">
              <div class="surface-box" style="background:var(--color-amber-100)" />
              <span class="surface-lbl">amber-100 · acento</span>
            </div>
          </div>
        </UiCard>
      </div>
    </section>

    <!-- ━━━ 02 PALETE DE CORES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section v-once class="kit-section">
      <div class="kit-section-head">
        <span class="kit-section-num">02</span>
        <h2>Palete de Cores</h2>
      </div>

      <UiCard class="card-standalone">
        <h3 class="card-h">Famílias cromáticas</h3>
        <div class="palette-families">
          <div v-for="family in colorFamilies" :key="family.name" class="palette-family">
            <div class="palette-family-header">
              <strong class="palette-family-name">{{ family.name }}</strong>
              <span class="palette-family-desc">{{ family.label }}</span>
            </div>
            <div class="palette-shades">
              <div v-for="shade in family.shades" :key="shade.step" class="palette-swatch"
                :style="{ background: shade.hex }"
                :title="`--color-${family.name.toLowerCase()}-${shade.step}\n${shade.hex}`">
                <span class="swatch-step" :class="{ dark: isDark(shade.hex) }">{{ shade.step }}</span>
                <span class="swatch-hex" :class="{ dark: isDark(shade.hex) }">{{ shade.hex }}</span>
              </div>
            </div>
          </div>
        </div>
      </UiCard>

      <UiCard class="card-standalone">
        <h3 class="card-h">Tokens semânticos</h3>
        <div class="semantic-grid">
          <div v-for="t in semanticTokens" :key="t.token" class="semantic-item">
            <div class="semantic-swatch" :style="{ background: t.hex, border: '2px solid var(--color-mirage-800)' }" />
            <div class="semantic-info">
              <strong class="semantic-name">{{ t.name }}</strong>
              <code class="semantic-token">{{ t.token }}</code>
              <span class="semantic-note">{{ t.note }} · {{ t.hex }}</span>
            </div>
          </div>
        </div>
      </UiCard>

      <UiCard class="card-standalone">
        <h3 class="card-h">Fundos de aplicação — 24 opções</h3>
        <div class="grad-grid">
          <div v-for="g in gradients" :key="g.id" class="grad-card" :style="{ background: g.style }" :title="g.id">
            <span class="grad-badge">{{ g.id }}</span>
            <span class="grad-name">{{ g.name }}</span>
          </div>
        </div>
      </UiCard>
    </section>

    <!-- ━━━ 03 BOTÕES & ACÇÕES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section v-once class="kit-section">
      <div class="kit-section-head">
        <span class="kit-section-num">03</span>
        <h2>Botões & Acções</h2>
      </div>
      <div class="grid">
        <UiCard class="card-wide">
          <h3 class="card-h">UiButton</h3>
          <div class="btn-block">
            <span class="tag">Variantes</span>
            <div class="btn-grid">
              <UiButton variant="primary">Primary</UiButton>
              <UiButton variant="secondary">Secondary</UiButton>
              <UiButton variant="outline">Outline</UiButton>
              <UiButton variant="ghost">Ghost</UiButton>
            </div>
          </div>
          <div class="btn-block">
            <span class="tag">Tamanhos</span>
            <div class="row a-end">
              <UiButton size="sm" variant="primary">Small</UiButton>
              <UiButton size="md" variant="primary">Medium</UiButton>
              <UiButton size="lg" variant="primary">Large</UiButton>
            </div>
          </div>
          <div class="btn-block">
            <span class="tag">Estados</span>
            <div class="row">
              <UiButton variant="primary" :disabled="true">Desactivado</UiButton>
              <UiButton variant="primary" :loading="true">A carregar</UiButton>
              <UiButton variant="secondary" :disabled="true">Desactivado</UiButton>
              <UiButton variant="outline" :disabled="true">Desactivado</UiButton>
            </div>
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">UiIconButton</h3>
          <div class="column">
            <div>
              <span class="tag">Círculo</span>
              <div class="row mt-2">
                <UiIconButton size="sm" aria-label="sm">+</UiIconButton>
                <UiIconButton size="md" aria-label="md">+</UiIconButton>
                <UiIconButton size="lg" aria-label="lg">+</UiIconButton>
              </div>
            </div>
            <div>
              <span class="tag">Quadrado</span>
              <div class="row mt-2">
                <UiIconButton size="sm" shape="square" aria-label="sm">+</UiIconButton>
                <UiIconButton size="md" shape="square" aria-label="md">+</UiIconButton>
                <UiIconButton size="lg" shape="square" aria-label="lg">+</UiIconButton>
              </div>
            </div>
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">UiPillButton</h3>
          <div class="column">
            <span class="tag">Variantes</span>
            <div class="row">
              <UiPillButton>Fechar</UiPillButton>
              <UiPillButton variant="primary">Confirmar</UiPillButton>
            </div>
          </div>
        </UiCard>
      </div>
    </section>

    <!-- ━━━ 04 FORMULÁRIOS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section class="kit-section">
      <div class="kit-section-head">
        <span class="kit-section-num">04</span>
        <h2>Formulários</h2>
      </div>
      <div class="grid">
        <UiCard>
          <h3 class="card-h">UiInput</h3>
          <div class="column">
            <UiInput label="Nome" placeholder="O teu nome" :model-value="inputValue" @update="inputValue = $event" />
            <UiInput label="Email" placeholder="nome@exemplo.pt" :model-value="''" @update="() => { }"
              error="Endereço inválido" />
            <UiInput label="Desactivado" placeholder="Não editável" :model-value="'Valor fixo'" :disabled="true"
              @update="() => { }" />
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">UiTextarea & UiSelect</h3>
          <div class="column">
            <UiTextarea label="Descrição" placeholder="Escreve um resumo curto…" :model-value="textareaValue"
              @update="textareaValue = $event" />
            <UiSelect label="Nível" :options="selectOptions" :model-value="selectValue"
              @update="selectValue = $event" />
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">Ficheiro</h3>
          <div class="column">
            <label class="file-field">
              <span class="field-label">Carregar ficheiro</span>
              <div class="file-picker">
                <PaperClipIcon class="file-icon" aria-hidden="true" />
                <span class="file-name">Nenhum ficheiro escolhido</span>
                <span class="file-action">Selecionar</span>
                <input type="file" />
              </div>
            </label>
            <p class="helper">Formatos suportados: JPG, PNG, PDF até 5 MB.</p>
          </div>
        </UiCard>
      </div>
    </section>

    <!-- ━━━ 05 CONTROLOS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section class="kit-section">
      <div class="kit-section-head">
        <span class="kit-section-num">05</span>
        <h2>Controlos & Selecção</h2>
      </div>
      <div class="grid">
        <UiCard>
          <h3 class="card-h">Checkbox & Radio</h3>
          <div class="column">
            <span class="tag">Checkbox</span>
            <UiCheckbox label="Aceito os termos e condições" :model-value="checkboxValue"
              @update="checkboxValue = $event" />
            <UiCheckbox tone="accent" label="Subscrever newsletter" :model-value="checkboxValue"
              @update="checkboxValue = $event" />
            <span class="tag">Radio</span>
            <UiRadio name="demo-r" label="Opção A" value="a" :model-value="radioValue" @update="radioValue = $event" />
            <UiRadio name="demo-r" label="Opção B" value="b" :model-value="radioValue" @update="radioValue = $event" />
            <UiRadio name="demo-r" label="Opção C (destaque)" value="c" tone="accent" :model-value="radioValue"
              @update="radioValue = $event" />
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">Switch & Slider</h3>
          <div class="column">
            <span class="tag">Switch</span>
            <div class="row">
              <UiSwitch :model-value="switchValue" @update="switchValue = $event" /><span class="helper">Notificações
                activas</span>
            </div>
            <div class="row">
              <UiSwitch size="sm" :model-value="switchValue" @update="switchValue = $event" /><span
                class="helper">Tamanho pequeno</span>
            </div>
            <div class="row">
              <UiSwitch tone="accent" :model-value="switchAlt" @update="switchAlt = $event" /><span class="helper">Tom
                de destaque</span>
            </div>
            <span class="tag">Slider</span>
            <div class="row">
              <UiSlider :model-value="sliderValue" @update="sliderValue = $event" /><span class="helper">{{ sliderValue
              }}%</span>
            </div>
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">Segmented & Search</h3>
          <div class="column">
            <span class="tag">Segmented</span>
            <UiSegmented :model-value="segmentedValue" :options="segmentedOptions" @update="segmentedValue = $event" />
            <span class="tag">Search</span>
            <UiSearch :model-value="searchValue" @update="searchValue = $event" />
          </div>
        </UiCard>
      </div>
    </section>

    <!-- ━━━ 06 FEEDBACK & ESTADO ━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section v-once class="kit-section">
      <div class="kit-section-head">
        <span class="kit-section-num">06</span>
        <h2>Feedback & Estado</h2>
      </div>
      <div class="grid">
        <UiCard>
          <h3 class="card-h">Badge & Chip</h3>
          <div class="column">
            <span class="tag">UiBadge</span>
            <div class="row">
              <UiBadge label="Top 1" />
              <UiBadge label="Top 3" />
              <UiBadge label="Novo" />
            </div>
            <span class="tag">UiChip</span>
            <div class="row">
              <UiChip label="Soft (padrão)" />
              <UiChip label="Filled" variant="filled" />
              <UiChip label="Outline" variant="outline" />
            </div>
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">Progress & Skeleton</h3>
          <div class="column">
            <span class="tag">UiProgress</span>
            <UiProgress :value="68" :max="100" />
            <UiProgress :value="30" :max="100" />
            <span class="tag">UiSkeleton</span>
            <div class="skel-row">
              <UiSkeleton width="48px" height="48px" radius="50%" />
              <div class="skel-lines">
                <UiSkeleton width="60%" height="14px" />
                <UiSkeleton width="40%" height="12px" />
              </div>
            </div>
            <UiSkeleton width="100%" height="80px" radius="12px" />
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">ResultPill</h3>
          <div class="column">
            <span class="tag">Certo</span>
            <div class="row">
              <UiResultPill result="correct" :points="10" />
              <UiResultPill result="correct" />
            </div>
            <span class="tag">Errado</span>
            <div class="row">
              <UiResultPill result="wrong" />
            </div>
          </div>
        </UiCard>
      </div>
    </section>

    <!-- ━━━ 07 NOTIFICAÇÕES & ALERTAS ━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section v-once class="kit-section">
      <div class="kit-section-head">
        <span class="kit-section-num">07</span>
        <h2>Notificações & Alertas</h2>
      </div>
      <div class="grid">
        <UiCard class="card-wide">
          <h3 class="card-h">UiToast — 4 tipos</h3>
          <div class="toast-grid">
            <UiToast type="info" title="Nova conquista" message="Completaste o módulo 3 com sucesso."
              @close="() => { }" />
            <UiToast type="success" title="Livro aprovado" message="O teu livro foi publicado e está disponível."
              @close="() => { }" />
            <UiToast type="warning" title="Falta uma etapa" message="Termina o módulo 4 para desbloquear o quiz final."
              @close="() => { }" />
            <UiToast type="error" title="Erro ao guardar"
              message="Não foi possível guardar as alterações. Tenta novamente." @close="() => { }" />
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">Notificações inline</h3>
          <div class="notif-list">
            <div class="notif info">
              <BellAlertIcon class="notif-icon" aria-hidden="true" />
              <div><strong class="notif-title">Nova conquista</strong><span class="notif-text">Ganhaste 50 pontos
                  hoje.</span></div>
            </div>
            <div class="notif success">
              <CheckCircleIcon class="notif-icon" aria-hidden="true" />
              <div><strong class="notif-title">Livro aprovado</strong><span class="notif-text">O teu livro foi
                  publicado.</span></div>
            </div>
            <div class="notif warning">
              <ExclamationTriangleIcon class="notif-icon" aria-hidden="true" />
              <div><strong class="notif-title">Falta uma etapa</strong><span class="notif-text">Termina o módulo
                  3.</span></div>
            </div>
          </div>
        </UiCard>
      </div>
    </section>

    <!-- ━━━ 08 AVATARES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section class="kit-section">
      <div class="kit-section-head">
        <span class="kit-section-num">08</span>
        <h2>Avatares</h2>
      </div>
      <div class="grid">
        <UiCard>
          <h3 class="card-h">Tamanhos & Tons</h3>
          <div class="column">
            <span class="tag">Tamanhos</span>
            <div class="row a-end">
              <UiAvatar alt="G" :size="32" />
              <UiAvatar alt="G" :size="48" />
              <UiAvatar alt="G" :size="64" />
              <UiAvatar alt="G" :size="80" />
              <UiAvatar :src="wintonUrl" alt="W" :size="96" />
            </div>
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">Status</h3>
          <div class="column">
            <span class="tag">Indicadores</span>
            <div class="row">
              <div class="av-item">
                <UiAvatar alt="G" :size="52" status="online" /><span class="helper">Online</span>
              </div>
              <div class="av-item">
                <UiAvatar alt="G" :size="52" status="away" /><span class="helper">Ausente</span>
              </div>
              <div class="av-item">
                <UiAvatar alt="G" :size="52" status="busy" /><span class="helper">Ocupado</span>
              </div>
              <div class="av-item">
                <UiAvatar alt="G" :size="52" status="offline" /><span class="helper">Offline</span>
              </div>
            </div>
          </div>
        </UiCard>
      </div>

      <!-- Customização em três partes -->
      <div class="av-custom-sections">

        <!-- Bordas -->
        <UiCard v-once>
          <h3 class="card-h">Bordas</h3>
          <p class="card-desc">Estilos de borda desbloqueáveis por nível. Todos usam apenas as cores do design system.
          </p>
          <div class="av-custom-row">
            <div v-for="b in BORDER_DEMOS" :key="b.id" class="av-custom-item">
              <UiAvatar alt="G" :size="56" :border="b.id" avatar-color="teal" />
              <span class="av-custom-label">{{ b.label }}</span>
            </div>
          </div>
        </UiCard>

        <!-- Cores -->
        <UiCard v-once class="card-wide">
          <h3 class="card-h">Cores</h3>
          <p class="card-desc">12 cores do design system + 4 cores especiais. As cores alteram a borda, não o avatar.
          </p>
          <div class="column">
            <div>
              <span class="tag">Palete</span>
              <div class="av-color-swatches">
                <div v-for="c in COLOR_DEMOS" :key="c.id" class="av-swatch-item">
                  <div class="av-swatch-dot" :class="{ 'swatch-none': c.hex === 'none' }"
                    :style="c.hex !== 'none' ? { background: c.hex } : {}" :title="c.label" />
                  <span class="av-custom-label">{{ c.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </UiCard>

        <!-- Efeitos -->
        <UiCard v-once>
          <h3 class="card-h">Efeitos</h3>
          <p class="card-desc">Animações e efeitos visuais que funcionam independentemente da borda e cor escolhidas.
          </p>
          <div class="av-effects-row">
            <div v-for="e in EFFECT_DEMOS" :key="e.id" class="av-custom-item">
              <UiAvatar alt="G" :size="56" avatar-color="teal" border="default" :effect="e.id" />
              <span class="av-custom-label">{{ e.label }}</span>
              <span class="av-custom-desc">{{ e.desc }}</span>
            </div>
          </div>
        </UiCard>

        <!-- Sombras -->
        <UiCard v-once>
          <h3 class="card-h">Sombra</h3>
          <p class="card-desc">Intensidade da sombra offset, independente da borda e cor escolhidas.</p>
          <div class="av-custom-row">
            <div v-for="s in SHADOW_DEMOS" :key="s.id" class="av-custom-item">
              <UiAvatar alt="G" :size="56" avatar-color="teal" border="default" :shadow="s.id" />
              <span class="av-custom-label">{{ s.label }}</span>
              <span class="av-custom-desc">{{ s.desc }}</span>
            </div>
          </div>
        </UiCard>

        <!-- Crachás -->
        <UiCard v-once class="card-wide">
          <h3 class="card-h">Crachás</h3>
          <p class="card-desc">Um crachá de cada vez — mostra classificação, exercícios, streak, nível ou o melhor badge
            conquistado.</p>
          <div class="av-crachas-grid">
            <div v-for="c in CRACHA_DEMOS" :key="c.id" class="av-cracha-item">
              <UiAvatar alt="G" :size="56" avatar-color="teal" border="default" :cracha="c.id"
                :cracha-value="c.value" />
              <span class="av-custom-label">{{ c.label }}</span>
            </div>
          </div>
        </UiCard>

        <!-- Playtest -->
        <UiCard class="card-wide">
          <h3 class="card-h">Playtest — cria a tua combinação</h3>
          <p class="card-desc">Seleciona borda, cor, efeito e sombra para pré-visualizar em tempo real.</p>
          <div class="playtest">

            <div class="playtest-preview">
              <UiAvatar alt="G" :size="96" :border="playtestBorder" :avatar-color="playtestColor ?? undefined"
                :effect="playtestEffect" :shadow="playtestShadow" :cracha="playtestCracha ?? undefined"
                :cracha-value="playtestCrachaValue" />
            </div>

            <div class="playtest-panel">
              <div class="playtest-group">
                <span class="tag">Borda</span>
                <div class="playtest-pills">
                  <button v-for="b in BORDER_DEMOS" :key="b.id" class="playtest-pill"
                    :class="{ active: playtestBorder === b.id }" @click="playtestBorder = b.id">{{ b.label }}</button>
                </div>
              </div>

              <div class="playtest-group">
                <span class="tag">Cor da borda</span>
                <div class="playtest-color-row">
                  <button class="playtest-swatch default-swatch" :class="{ active: playtestColor === null }"
                    title="Padrão (escuro)" @click="playtestColor = null" />
                  <button v-for="c in COLOR_DEMOS" :key="c.id" class="playtest-swatch"
                    :class="{ active: playtestColor === c.id, 'swatch-none': c.hex === 'none' }"
                    :style="c.hex !== 'none' ? { background: c.hex } : {}" :title="c.label"
                    @click="playtestColor = c.id" />
                </div>
              </div>

              <div class="playtest-group">
                <span class="tag">Efeito</span>
                <div class="playtest-pills">
                  <button v-for="e in EFFECT_DEMOS" :key="e.id" class="playtest-pill"
                    :class="{ active: playtestEffect === e.id }" @click="playtestEffect = e.id">{{ e.label }}</button>
                </div>
              </div>

              <div class="playtest-group">
                <span class="tag">Sombra</span>
                <div class="playtest-pills">
                  <button v-for="s in SHADOW_DEMOS" :key="s.id" class="playtest-pill"
                    :class="{ active: playtestShadow === s.id }" @click="playtestShadow = s.id">{{ s.label }}</button>
                </div>
              </div>

              <div class="playtest-group">
                <span class="tag">Crachá</span>
                <div class="playtest-pills">
                  <button class="playtest-pill" :class="{ active: playtestCracha === null }"
                    @click="playtestCracha = null">Nenhum</button>
                  <button v-for="c in CRACHA_DEMOS" :key="c.id" class="playtest-pill"
                    :class="{ active: playtestCracha === c.id }" @click="playtestCracha = c.id">{{ c.label }}</button>
                </div>
              </div>
            </div>

          </div>
        </UiCard>

      </div>
    </section>

    <!-- ━━━ 09 CARDS & DADOS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section class="kit-section">
      <div class="kit-section-head">
        <span class="kit-section-num">09</span>
        <h2>Cards & Dados</h2>
      </div>
      <div class="grid">
        <UiCard>
          <h3 class="card-h">UiCard</h3>
          <div class="column">
            <article class="sample-card">
              <h4>Card padrão</h4>
              <p>Conteúdo com borda, fundo e sombra de 4 px deslocada.</p>
              <div class="row">
                <UiChip label="Novo" />
                <UiChip label="Nível 2" variant="filled" />
              </div>
            </article>
            <article class="sample-card alt">
              <h4>Tom de marca</h4>
              <p>Fundo deep-100 para conteúdo em progresso.</p>
              <UiProgress :value="42" :max="100" />
            </article>
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">UiStatCard</h3>
          <div class="column">
            <UiStatCard label="Pontos totais" value="4 820">
              <template #icon>
                <div class="stat-icon-wrap">
                  <StarIcon class="stat-icon" aria-hidden="true" />
                </div>
              </template>
            </UiStatCard>
            <UiStatCard label="Streak diário" value="7 dias" delta="+3" deltaVariant="streak">
              <template #icon>
                <div class="stat-icon-wrap accent">
                  <FireIcon class="stat-icon" aria-hidden="true" />
                </div>
              </template>
            </UiStatCard>
            <UiStatCard label="Livros lidos" value="12">
              <template #icon>
                <div class="stat-icon-wrap">
                  <BookOpenIcon class="stat-icon" aria-hidden="true" />
                </div>
              </template>
            </UiStatCard>
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">Modal</h3>
          <div class="column">
            <p class="helper">Os modais são renderizados fora do fluxo principal via Teleport.</p>
            <UiPillButton variant="primary" @click="modalOpen = true">Abrir modal</UiPillButton>
          </div>
        </UiCard>
      </div>
    </section>

    <!-- ━━━ 10 ESTANTES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section v-once class="kit-section">
      <div class="kit-section-head">
        <span class="kit-section-num">10</span>
        <h2>Estantes — BookShelf</h2>
      </div>
      <div class="grid two-col">
        <UiCard>
          <h3 class="card-h">Estante</h3>
          <div class="shelf-demo">
            <div class="shelf-spines" />
            <BookShelf variant="small" />
          </div>
        </UiCard>

        <UiCard>
          <h3 class="card-h">Com livro</h3>
          <div class="shelf-demo">
            <div class="shelf-spines shelf-spines--center">
              <BookMockup title="O Principezinho" badge="gold" size="sm" />
            </div>
            <BookShelf variant="small" />
          </div>
        </UiCard>
      </div>
    </section>

    <!-- ━━━ 11 GAMIFICAÇÃO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section class="kit-section">
      <div class="kit-section-head">
        <span class="kit-section-num">11</span>
        <h2>Gamificação</h2>
      </div>
      <div class="grid">
        <UiCard v-once class="card-wide">
          <h3 class="card-h">BookBadge & BookMockup</h3>
          <div class="mockup-row">
            <div class="mockup-item">
              <BookMockup title="Sem badge" /><span class="badge-lbl">Sem badge</span>
            </div>
            <div class="mockup-item">
              <BookMockup title="Bronze" badge="bronze" /><span class="badge-lbl">Bronze · 25%</span>
            </div>
            <div class="mockup-item">
              <BookMockup title="Prata" badge="silver" /><span class="badge-lbl">Prata · 50%</span>
            </div>
            <div class="mockup-item">
              <BookMockup title="Ouro" badge="gold" /><span class="badge-lbl">Ouro · 75%</span>
            </div>
            <div class="mockup-item">
              <BookMockup title="Diamante" badge="diamond" /><span class="badge-lbl">Diamante · 100%</span>
            </div>
            <div class="mockup-item">
              <BookMockup title="Galáxia" badge="galaxy" /><span class="badge-lbl">Galáxia · Quiz</span>
            </div>
          </div>
          <div class="badge-icons-row">
            <div class="badge-icon-item">
              <BookBadge tier="bronze" /><span class="badge-lbl">Bronze</span>
            </div>
            <div class="badge-icon-item">
              <BookBadge tier="silver" /><span class="badge-lbl">Prata</span>
            </div>
            <div class="badge-icon-item">
              <BookBadge tier="gold" /><span class="badge-lbl">Ouro</span>
            </div>
            <div class="badge-icon-item">
              <BookBadge tier="diamond" /><span class="badge-lbl">Diamante</span>
            </div>
            <div class="badge-icon-item">
              <BookBadge tier="galaxy" /><span class="badge-lbl">Galáxia</span>
            </div>
          </div>
        </UiCard>

        <UiCard class="card-wide">
          <h3 class="card-h">Opções de exercício — interactivo</h3>
          <p class="card-desc">Clica nas opções para ver os estados. A é sempre mostrada como errada para contexto.</p>
          <div class="exercise-preview">
            <div class="exercise-question">
              <div class="exercise-question-shadow"></div>
              <div class="exercise-question-panel">
                <div class="exercise-timer">
                  <svg class="exercise-timer-ring" viewBox="0 0 72 72" aria-hidden="true">
                    <circle class="exercise-timer-track" cx="36" cy="36" r="26" />
                    <circle class="exercise-timer-progress" cx="36" cy="36" r="26" />
                  </svg>
                  <span class="exercise-timer-value">25</span>
                </div>
                <div class="exercise-question-top">
                  <div class="exercise-question-title">Pergunta <span>02</span></div>
                  <div class="exercise-attempts">2 tentativas</div>
                </div>
                <div class="exercise-divider"></div>
                <p class="exercise-question-text">
                  Which of the following energy sources cannot be replenished naturally on a human timescale?
                </p>
              </div>
            </div>
            <div class="exercise-options">
              <button class="exercise-option is-wrong" @click="pickOption('A')">
                <span class="exercise-option-shadow"></span>
                <span class="exercise-option-panel"></span>
                <span class="exercise-option-content">
                  <span class="exercise-letter">
                    <span class="exercise-letter-shadow"></span>
                    <span class="exercise-letter-face"></span>
                    <span class="exercise-letter-text">A</span>
                  </span>
                  <span class="exercise-option-text">Solar energy (sempre errada)</span>
                </span>
              </button>
              <button class="exercise-option" :class="optionClass('B')" @click="pickOption('B')">
                <span class="exercise-option-shadow"></span>
                <span class="exercise-option-panel"></span>
                <span class="exercise-option-content">
                  <span class="exercise-letter">
                    <span class="exercise-letter-shadow"></span>
                    <span class="exercise-letter-face"></span>
                    <span class="exercise-letter-text">B</span>
                  </span>
                  <span class="exercise-option-text">Wind power</span>
                </span>
              </button>
              <button class="exercise-option" :class="optionClass('C')" @click="pickOption('C')">
                <span class="exercise-option-shadow"></span>
                <span class="exercise-option-panel"></span>
                <span class="exercise-option-content">
                  <span class="exercise-letter">
                    <span class="exercise-letter-shadow"></span>
                    <span class="exercise-letter-face"></span>
                    <span class="exercise-letter-text">C</span>
                  </span>
                  <span class="exercise-option-text">Natural gas</span>
                </span>
              </button>
              <button class="exercise-option" :class="optionClass('D')" @click="pickOption('D')">
                <span class="exercise-option-shadow"></span>
                <span class="exercise-option-panel"></span>
                <span class="exercise-option-content">
                  <span class="exercise-letter">
                    <span class="exercise-letter-shadow"></span>
                    <span class="exercise-letter-face"></span>
                    <span class="exercise-letter-text">D</span>
                  </span>
                  <span class="exercise-option-text">Hydropower</span>
                </span>
              </button>
            </div>
            <div class="exercise-reset">
              <UiPillButton @click="exercisePick = null">
                <template #default>
                  <ArrowPathIcon style="width:14px;height:14px;margin-right:6px" aria-hidden="true" />
                  Repor seleção
                </template>
              </UiPillButton>
              <span v-if="exercisePick" class="helper">Opção {{ exercisePick }} seleccionada</span>
            </div>
          </div>
        </UiCard>

        <UiCard v-once class="card-wide">
          <h3 class="card-h">RankingListItem</h3>
          <ul class="ranking-demo">
            <RankingListItem :position="1" display-name="Guilherme Santos" :points="4820" :level="14"
              :badge-counts="{ bronze: 3, silver: 2, gold: 1, diamond: 0, galaxy: 0 }" :is-current-user="true" />
            <RankingListItem :position="2" display-name="Maria Ferreira" :points="4310" :level="12"
              :badge-counts="{ bronze: 2, silver: 2, gold: 0, diamond: 0, galaxy: 0 }" />
            <RankingListItem :position="3" display-name="João Almeida" :points="3980" :level="11"
              :badge-counts="{ bronze: 4, silver: 1, gold: 0, diamond: 0, galaxy: 0 }" />
          </ul>
        </UiCard>
      </div>
    </section>

    <!-- ━━━ 12 MODAIS & ANIMAÇÕES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <section class="kit-section">
      <div class="kit-section-head">
        <span class="kit-section-num">12</span>
        <h2>Modais & Animações</h2>
      </div>

      <!-- UiConfirmModal -->
      <div class="grid">
        <UiCard>
          <h3 class="card-h">UiConfirmModal</h3>
          <p class="card-desc">Modal de confirmação genérico com título, mensagem e botões de acção.</p>
          <UiPillButton variant="primary" @click="confirmModalVisible = true">Abrir confirmação</UiPillButton>
        </UiCard>
      </div>

      <!-- Animações de recompensa -->
      <UiCard class="card-standalone">
        <h3 class="card-h">Animações de Recompensa</h3>
        <p class="card-desc">Clica nos botões para pré-visualizar cada animação de gamificação com confetti e transições.</p>

        <div class="anim-blocks">
          <div class="anim-block">
            <span class="tag">Subir de Nível</span>
            <p class="anim-desc">Dispara ao subir de nível. Inclui barra de progresso animada e lista de cosméticos desbloqueados quando o nível tem novidades (ex.: nível 5).</p>
            <div class="row">
              <UiButton variant="primary" @click="levelUpVisible = true">
                Nível 4 → 5 (com cosméticos)
              </UiButton>
            </div>
          </div>

          <div class="anim-block">
            <span class="tag">Badges de Livro</span>
            <p class="anim-desc">Dispara ao atingir uma nova percentagem de conclusão do livro. Cada tier tem mensagem própria; Galaxy celebra o quiz final.</p>
            <div class="anim-badge-row">
              <button class="anim-badge-btn anim-badge-btn--bronze" @click="openBadge('bronze')">Bronze</button>
              <button class="anim-badge-btn anim-badge-btn--silver" @click="openBadge('silver')">Prata</button>
              <button class="anim-badge-btn anim-badge-btn--gold" @click="openBadge('gold')">Ouro</button>
              <button class="anim-badge-btn anim-badge-btn--diamond" @click="openBadge('diamond')">Diamante</button>
              <button class="anim-badge-btn anim-badge-btn--galaxy" @click="openBadge('galaxy')">Galáxia</button>
            </div>
          </div>

          <div class="anim-block">
            <span class="tag">Desbloquear Livro</span>
            <p class="anim-desc">Dispara ao desbloquear um livro via código QR. Mostra a capa, título e descrição com confetti verde.</p>
            <div class="row">
              <UiButton variant="outline" @click="bookUnlockVisible = true">Desbloquear Livro</UiButton>
            </div>
          </div>
        </div>
      </UiCard>
    </section>

  </div>

  <!-- Modal de demo ─────────────────────────────────────── -->
  <div v-if="modalOpen" class="kit-modal-overlay" @click.self="modalOpen = false">
    <div class="kit-modal">
      <div class="kit-modal-head">
        <strong>Modal de exemplo</strong>
        <UiPillButton @click="modalOpen = false">Fechar</UiPillButton>
      </div>
      <p>Coloca aqui uma mensagem curta ou uma acção rápida para o utilizador confirmar.</p>
      <div class="row">
        <UiPillButton variant="primary">Confirmar</UiPillButton>
        <UiPillButton @click="modalOpen = false">Cancelar</UiPillButton>
      </div>
    </div>
  </div>

  <!-- Modais de animação ─────────────────────────────────── -->
  <UiConfirmModal
    :visible="confirmModalVisible"
    title="Confirmar acção"
    message="Tens a certeza que queres realizar esta acção? Esta operação não pode ser desfeita."
    confirm-label="Sim, confirmar"
    cancel-label="Cancelar"
    @confirm="confirmModalVisible = false"
    @cancel="confirmModalVisible = false"
  />

  <LevelUpModal
    :visible="levelUpVisible"
    :old-level="4"
    :new-level="5"
    :current-points="590"
    @close="levelUpVisible = false"
  />

  <BadgeUnlockModal
    :visible="badgeUnlockVisible"
    :tier="badgeTierDemo"
    book-title="O Principezinho"
    @close="badgeUnlockVisible = false"
  />

  <BookUnlockModal
    :visible="bookUnlockVisible"
    :book="mockBook"
    @close="bookUnlockVisible = false"
  />
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────── */

.kit {
  display: grid;
  gap: var(--space-800);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-400);
}

.card-wide {
  grid-column: 1 / -1;
}

.card-standalone {
  margin: 0;
}

/* ── Hero ────────────────────────────────────────────────── */

.kit-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-500);
  padding: var(--space-600);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: var(--radius-400);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.kit-hero-body {
  display: grid;
  gap: var(--space-200);
}

.kit-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-mirage-500);
}

.kit-hero h1 {
  margin: 0;
  font-size: 36px;
  line-height: 1;
}

.kit-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-600);
  max-width: 480px;
}

.kit-hero-counts {
  display: flex;
  align-items: center;
  gap: var(--space-400);
  flex-shrink: 0;
}

.kit-hero-count {
  display: grid;
  gap: 2px;
  text-align: center;
}

.kit-count-val {
  font-size: 30px;
  font-weight: 700;
  color: var(--color-mirage-800);
  line-height: 1;
}

.kit-count-lbl {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
}

.kit-hero-sep {
  width: 2px;
  height: 36px;
  background: var(--color-wild-500);
  border-radius: 999px;
}

/* ── Section header ──────────────────────────────────────── */

.kit-section {
  display: grid;
  gap: var(--space-400);
}

.kit-section-head {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  padding-bottom: var(--space-300);
  border-bottom: 2px solid var(--color-mirage-800);
}

.kit-section-head h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-mirage-800);
}

.kit-section-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 8px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
  flex-shrink: 0;
  box-shadow: 2px 2px 0 var(--color-shadow);
}

/* ── Utilities ───────────────────────────────────────────── */

.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-200);
  align-items: center;
}

.a-end {
  align-items: flex-end;
}

.column {
  display: grid;
  gap: var(--space-300);
}

.mt-2 {
  margin-top: var(--space-200);
}

.helper {
  font-size: 12px;
  color: var(--color-mirage-500);
  font-weight: 600;
}

.two-col {
  grid-template-columns: 1fr 1fr;
}

.card-h {
  margin: 0 0 var(--space-300);
  font-size: 16px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.card-desc {
  margin: calc(-1 * var(--space-100)) 0 var(--space-300);
  font-size: 13px;
  color: var(--color-mirage-500);
}

.group-caption {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 2px 2px 0 var(--color-shadow);
  width: fit-content;
}

/* ── Tipografia ──────────────────────────────────────────── */

.type-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-600);
}

.type-group {
  display: grid;
  gap: var(--space-300);
}

.type-list {
  display: grid;
  gap: 0;
}

.type-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-400);
  padding: var(--space-200) 0;
  border-bottom: 1px solid var(--color-wild-500);
}

.type-meta {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-mirage-400);
  width: 110px;
  flex-shrink: 0;
}

.t-h1 {
  font-size: 32px;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-mirage-800);
}

.t-h2 {
  font-size: 24px;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-mirage-800);
}

.t-h3 {
  font-size: 20px;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--color-mirage-800);
}

.t-h4 {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.t-body {
  font-size: 16px;
  color: var(--color-mirage-800);
}

.t-small {
  font-size: 14px;
  color: var(--color-mirage-600);
}

.t-caption {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-mirage-500);
}

.t-kicker {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-mirage-500);
}

.ctxt-row {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  font-size: 14px;
}

.ctxt-dot {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, .1);
  flex-shrink: 0;
}

.surface-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-200);
}

.surface-item {
  display: grid;
  gap: var(--space-150);
}

.surface-box {
  height: 52px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
}

.surface-lbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-mirage-500);
}

/* ── Palete de cores ─────────────────────────────────────── */

.palette-families {
  display: grid;
  gap: var(--space-300);
}

.palette-family-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-200);
  margin-bottom: var(--space-150);
}

.palette-family-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.palette-family-desc {
  font-size: 12px;
  color: var(--color-mirage-500);
}

.palette-shades {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.palette-swatch {
  position: relative;
  height: 64px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 6px 5px;
  cursor: default;
  transition: flex 0.2s ease;
}

.palette-swatch:hover {
  flex: 1.5;
}

.swatch-step,
.swatch-hex {
  font-size: 9px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.5);
  line-height: 1;
  letter-spacing: 0.5px;
}

.swatch-step.dark,
.swatch-hex.dark {
  color: rgba(255, 255, 255, 0.65);
}

.swatch-hex {
  text-transform: uppercase;
  font-size: 8px;
}

.semantic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-300);
}

.semantic-item {
  display: flex;
  gap: var(--space-200);
  align-items: flex-start;
  padding: var(--space-300);
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.semantic-swatch {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
}

.semantic-info {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.semantic-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

code.semantic-token {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-deep-600);
  word-break: break-all;
}

.semantic-note {
  font-size: 10px;
  color: var(--color-mirage-500);
}

.grad-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-300);
}

.grad-card {
  height: 96px;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--space-200);
  overflow: hidden;
}

.grad-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  width: fit-content;
}

.grad-name {
  font-size: 12px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.5);
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

/* ── Botões ──────────────────────────────────────────────── */

.btn-block {
  display: grid;
  gap: var(--space-200);
  margin-bottom: var(--space-300);
}

.btn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-300);
}

/* ── Formulários ─────────────────────────────────────────── */

.file-field {
  display: grid;
  gap: var(--space-150);
}

.field-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-600);
}

.file-picker {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-200);
  padding: var(--space-200) var(--space-300);
  border-radius: 999px;
  border: 2px dashed var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  cursor: pointer;
}

.file-picker input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.file-icon {
  width: 18px;
  height: 18px;
  color: var(--color-mirage-700);
}

.file-name {
  font-size: 13px;
  color: var(--color-mirage-600);
}

.file-action {
  padding: 4px 10px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  font-size: 12px;
  font-weight: 700;
  box-shadow: 3px 3px 0 var(--color-shadow);
  transition: background 0.15s ease;
}

.file-picker:hover .file-action {
  background: var(--color-wild-200);
}

/* ── Feedback ────────────────────────────────────────────── */

.skel-row {
  display: flex;
  gap: var(--space-300);
  align-items: center;
}

.skel-lines {
  display: grid;
  gap: var(--space-150);
  flex: 1;
}

/* ── Notificações ────────────────────────────────────────── */

.toast-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-300);
}

.notif-list {
  display: grid;
  gap: var(--space-200);
}

.notif {
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  padding: var(--space-300);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-200);
  align-items: center;
}

.notif-icon {
  width: 20px;
  height: 20px;
  color: var(--color-mirage-800);
}

.notif-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.notif-text {
  display: block;
  font-size: 12px;
  color: var(--color-mirage-600);
}

.notif.info {
  background: var(--color-deep-100);
}

.notif.success {
  background: var(--color-deep-200);
}

.notif.warning {
  background: var(--color-amber-100);
}

/* ── Avatares ────────────────────────────────────────────── */

.av-item {
  display: grid;
  gap: var(--space-100);
  justify-items: center;
}

.frames-categories {
  display: grid;
  gap: var(--space-400);
}

.frames-category {
  display: grid;
  gap: var(--space-200);
}

.frames-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-400);
}

.frame-item {
  display: grid;
  gap: 6px;
  justify-items: center;
}

.frame-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.frame-lvl {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-mirage-500);
}

/* ── Avatar customization sections ──────────────────────── */

.av-custom-sections {
  display: grid;
  gap: var(--space-400);
}

.av-custom-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-500);
  margin-top: var(--space-300);
  align-items: flex-end;
}

.av-effects-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-500);
  margin-top: var(--space-300);
  align-items: flex-end;
}

.av-color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-400);
  margin-top: var(--space-200);
}

.av-specials-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-600);
  margin-top: var(--space-200);
}

.av-crachas-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-500);
  margin-top: var(--space-200);
  padding-bottom: var(--space-400);
}

.av-cracha-item {
  display: grid;
  gap: 18px;
  justify-items: center;
}

.av-custom-item {
  display: grid;
  gap: 5px;
  justify-items: center;
}

.av-custom-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-mirage-800);
  text-align: center;
  max-width: 72px;
}

.av-custom-desc {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-mirage-500);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* ── Color swatches ──────────────────────────────────────── */

.av-color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-300);
  margin-top: var(--space-200);
}

.av-swatch-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-100);
}

.av-swatch-dot {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  flex-shrink: 0;
}

/* "Sem cor": linha diagonal — sem borda */
.swatch-none,
.playtest-swatch.swatch-none {
  background:
    linear-gradient(to bottom right,
      transparent calc(50% - 1px),
      var(--color-mirage-400) calc(50% - 1px),
      var(--color-mirage-400) calc(50% + 1px),
      transparent calc(50% + 1px)),
    var(--color-wild-100);
}

/* ── Playtest ────────────────────────────────────────────── */

.playtest {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: var(--space-600);
  margin-top: var(--space-300);
  align-items: start;
}

.playtest-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-500);
  padding-bottom: calc(var(--space-500) + 14px);
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 4px 4px 0 var(--color-shadow);
  aspect-ratio: 1;
}

.playtest-panel {
  display: grid;
  gap: 0;
}

.playtest-group {
  display: grid;
  gap: var(--space-200);
  padding: var(--space-300) 0;
  border-top: 1px solid var(--color-wild-600);
}

.playtest-group:first-child {
  padding-top: 0;
  border-top: none;
}

/* tag dentro do grupo: label limpa, não o chip */
.playtest-group>.tag {
  all: unset;
  display: block;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
}

.playtest-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-150);
}

.playtest-pill {
  padding: 6px 14px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.playtest-pill:hover {
  background: var(--color-wild-300);
}

.playtest-pill.active {
  background: var(--color-deep-100);
  border-color: var(--color-deep-600);
  box-shadow: 2px 2px 0 var(--color-deep-400);
}

/* ── Playtest color swatches ─────────────────────────────── */

.playtest-color-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-200);
}

.playtest-swatch {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
  cursor: pointer;
  transition: outline-offset 0.1s ease;
  flex-shrink: 0;
  padding: 0;
  outline: 2px solid transparent;
  outline-offset: 0px;
}

.playtest-swatch:hover {
  outline-color: var(--color-mirage-500);
  outline-offset: 3px;
}

.playtest-swatch.active {
  outline-color: var(--color-mirage-800);
  outline-offset: 3px;
  box-shadow: 2px 2px 0 var(--color-shadow);
}

/* Padrão: círculo escuro — representa a cor default */
.playtest-swatch.default-swatch {
  background: var(--color-mirage-800);
}

.playtest-swatch.default-swatch.active {
  outline-color: var(--color-deep-500);
}

.playtest-swatch.special-swatch {
  background: transparent;
  border: none;
  box-shadow: none;
  width: auto;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border-radius: var(--radius-full);
  outline-offset: 0px;
}

.playtest-swatch.special-swatch:hover {
  outline-color: var(--color-mirage-500);
  outline-offset: 3px;
}

.playtest-swatch.special-swatch.active {
  outline-color: var(--color-mirage-800);
  outline-offset: 3px;
}

.playtest-swatch-sep {
  width: 1px;
  height: 22px;
  background: var(--color-wild-600);
  flex-shrink: 0;
}

@media (max-width: 720px) {
  .playtest {
    grid-template-columns: 1fr;
  }
}

/* ── Cards & dados ───────────────────────────────────────── */

.sample-card {
  padding: var(--space-300);
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  gap: var(--space-200);
}

.sample-card h4 {
  margin: 0;
  font-size: 14px;
}

.sample-card p {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-600);
}

.sample-card.alt {
  background: var(--color-deep-100);
}

.stat-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-deep-100);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.stat-icon-wrap.accent {
  background: var(--color-amber-100);
}

.stat-icon {
  width: 18px;
  height: 18px;
  color: var(--color-deep-700);
}

.stat-icon-wrap.accent .stat-icon {
  color: var(--color-amber-700);
}

/* ── Estantes ────────────────────────────────────────────── */

.shelf-demo {
  position: relative;
  margin-top: var(--space-200);
}

.shelf-spines {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 0 var(--space-300) 25px;
  min-height: 170px;
}

.shelf-spines--center {
  justify-content: center;
}


/* ── Gamificação ─────────────────────────────────────────── */

.mockup-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-500);
  align-items: flex-end;
  margin-bottom: var(--space-400);
  padding-bottom: var(--space-400);
  border-bottom: 2px solid var(--color-wild-400);
}

.mockup-item {
  display: grid;
  gap: var(--space-200);
  justify-items: center;
}

.badge-icons-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-400);
  align-items: center;
}

.badge-icon-item {
  display: grid;
  gap: var(--space-150);
  justify-items: center;
}

.badge-lbl {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
  text-align: center;
}

/* ── Exercise preview ─────────────────────────────────────── */

.exercise-preview {
  display: grid;
  gap: var(--space-500);
}

.exercise-question {
  position: relative;
  max-width: 980px;
  width: 100%;
  margin: 0 auto;
}

.exercise-question-shadow {
  position: absolute;
  inset: 12px 0 0;
  background: var(--color-deep-600);
  border-radius: 16px;
}

.exercise-question-panel {
  position: relative;
  z-index: 1;
  padding: 40px 32px 32px;
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 8px 8px 0 rgba(46, 127, 123, 0.35);
}

.exercise-timer {
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  width: 70px;
  height: 70px;
  border-radius: 999px;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  display: grid;
  place-items: center;
  box-shadow: 0 6px 0 rgba(46, 127, 123, 0.35);
}

.exercise-timer-ring {
  width: 64px;
  height: 64px;
  transform: rotate(-90deg);
}

.exercise-timer-track {
  fill: none;
  stroke: rgba(46, 127, 123, 0.2);
  stroke-width: 6;
}

.exercise-timer-progress {
  fill: none;
  stroke: var(--color-deep-500);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 110 163;
}

.exercise-timer-value {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 16px;
  color: var(--color-mirage-800);
}

.exercise-question-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-300);
}

.exercise-question-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--color-mirage-800);
}

.exercise-question-title span {
  color: var(--color-teal-600);
}

.exercise-attempts {
  padding: 6px 12px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-teal-100);
  font-weight: 700;
  font-size: 12px;
  color: var(--color-mirage-800);
}

.exercise-divider {
  height: 1px;
  background: var(--color-mirage-800);
  margin: 18px 0;
}

.exercise-question-text {
  margin: 0;
  font-size: 22px;
  line-height: 30px;
  color: var(--color-mirage-800);
}

.exercise-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  width: min(980px, 100%);
  margin: 0 auto;
}

.exercise-reset {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  justify-content: center;
}

.exercise-option {
  position: relative;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  --option-press-x: 3px;
  --option-press-y: 4px;
  --option-shadow-x: 16px;
  --option-shadow-y: 12px;
}

.exercise-option-shadow {
  position: absolute;
  inset: var(--option-shadow-y) 0 0 var(--option-shadow-x);
  background: var(--color-shadow);
  border-radius: 12px;
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.exercise-option-panel {
  position: absolute;
  inset: 0;
  background: var(--color-wild-100);
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  transition: transform 0.15s ease, background 0.2s ease;
}

.exercise-option-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 16px;
  padding: 24px 22px;
  transition: transform 0.15s ease;
}

.exercise-letter {
  position: relative;
  width: 56px;
  height: 56px;
}

.exercise-letter-shadow {
  position: absolute;
  inset: 0;
  background: var(--color-shadow);
  border-radius: 999px;
  transform: translate(var(--option-press-x), var(--option-press-y));
  transition: transform 0.2s ease, background 0.2s ease, opacity 0.2s ease;
}

.exercise-letter-face {
  position: absolute;
  inset: 0;
  background: var(--color-wild-100);
  border-radius: 999px;
  border: 2px solid #373737;
  transition: transform 0.2s ease, background 0.2s ease;
}

.exercise-letter-text {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 28px;
  font-weight: 600;
  color: var(--color-mirage-800);
  transition: transform 0.2s ease;
}

.exercise-option-text {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-mirage-800);
}

/* Hover (aplicado por CSS hover) */
.exercise-option:not(.is-wrong):not(.is-selected):hover .exercise-option-panel {
  background: var(--color-teal-300);
}

.exercise-option:not(.is-wrong):not(.is-selected):hover .exercise-letter-shadow {
  background: var(--color-deep-600);
}

.exercise-option:not(.is-wrong):not(.is-selected):hover .exercise-letter-face {
  background: var(--color-teal-100);
}

/* Selected */
.exercise-option.is-selected .exercise-option-panel {
  background: var(--color-teal-500);
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.exercise-option.is-selected .exercise-option-shadow {
  background: var(--color-deep-1000);
}

.exercise-option.is-selected .exercise-letter-shadow {
  opacity: 0;
}

.exercise-option.is-selected .exercise-letter-face {
  background: var(--color-deep-200);
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.exercise-option.is-selected .exercise-option-content {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.exercise-option.is-selected .exercise-letter-text {
  transform: translate(var(--option-press-x), var(--option-press-y));
}

.exercise-option.is-selected .exercise-option-text {
  color: var(--color-wild-100);
}

/* Wrong */
.exercise-option.is-wrong .exercise-option-panel {
  background: var(--color-error-muted);
  border-color: var(--color-red-500, #d74c4c);
}

.exercise-option.is-wrong .exercise-letter-face {
  background: var(--color-crimson-200);
  border-color: var(--color-crimson-500);
}

.exercise-option.is-wrong .exercise-letter-shadow {
  background: var(--color-crimson-500);
}

.exercise-option.is-wrong .exercise-letter-text {
  color: var(--color-error-strong);
}

.exercise-option.is-wrong .exercise-option-text {
  color: var(--color-error-strong);
}

/* ── Ranking ──────────────────────────────────────────────── */

.ranking-demo {
  list-style: none;
  margin: 0;
  padding: var(--space-300);
  display: grid;
  gap: var(--space-200);
  background: var(--color-wild-200);
  border-radius: 16px;
}

/* ── Modal ───────────────────────────────────────────────── */

.kit-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 29, 32, 0.28);
  display: grid;
  place-items: center;
  z-index: 30;
}

.kit-modal {
  width: min(440px, 90vw);
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 6px 6px 0 var(--color-shadow);
  padding: var(--space-400);
  display: grid;
  gap: var(--space-300);
}

.kit-modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-300);
  font-weight: 700;
}

/* ── Modais & Animações ──────────────────────────────────── */

.anim-blocks {
  display: grid;
  gap: var(--space-500);
  margin-top: var(--space-300);
}

.anim-block {
  display: grid;
  gap: var(--space-200);
  padding: var(--space-400);
  border-radius: 14px;
  border: 2px solid var(--color-wild-600);
  background: var(--color-wild-200);
}

.anim-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
  line-height: 1.55;
}

.anim-badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-200);
  align-items: center;
}

.anim-badge-btn {
  padding: 8px 20px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--color-shadow);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.anim-badge-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.anim-badge-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--color-shadow);
}

.anim-badge-btn--bronze {
  background: #cd7f32;
  color: #fff;
  border-color: #8b5a1a;
  box-shadow: 3px 3px 0 #8b5a1a;
}

.anim-badge-btn--silver {
  background: #b0b8c1;
  color: #1a262e;
  border-color: #6e7f8a;
  box-shadow: 3px 3px 0 #6e7f8a;
}

.anim-badge-btn--gold {
  background: #f5c518;
  color: #5a3a00;
  border-color: #b8860b;
  box-shadow: 3px 3px 0 #b8860b;
}

.anim-badge-btn--diamond {
  background: #a8d8f0;
  color: #1a3a4a;
  border-color: #4a90b8;
  box-shadow: 3px 3px 0 #4a90b8;
}

.anim-badge-btn--galaxy {
  background: linear-gradient(135deg, #6a1b9a, #1565c0, #00838f);
  color: #fff;
  border-color: #1a0a2e;
  box-shadow: 3px 3px 0 #1a0a2e;
}

/* ── Responsive ──────────────────────────────────────────── */

@media (max-width: 720px) {
  .kit-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-wide {
    grid-column: auto;
  }

  .two-col {
    grid-template-columns: 1fr;
  }

  .type-cols {
    grid-template-columns: 1fr;
  }

  .palette-shades {
    grid-template-columns: repeat(5, 1fr);
  }

  .exercise-options {
    grid-template-columns: 1fr;
  }
}
</style>
