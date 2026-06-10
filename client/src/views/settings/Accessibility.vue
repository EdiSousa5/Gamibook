<script setup lang="ts">
import { ref, watch } from 'vue'
import { MagnifyingGlassCircleIcon, EyeIcon, SunIcon } from '@heroicons/vue/24/outline'
import UiButton from '@/components/ui/UiButton.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()

type FontSize = 'normal' | 'large' | 'xl'
type ColorMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia'
type Contrast = 'normal' | 'high'

const fontSize = ref<FontSize>((localStorage.getItem('gb_a11y_font') as FontSize) || 'normal')
const colorMode = ref<ColorMode>((localStorage.getItem('gb_a11y_color') as ColorMode) || 'none')
const contrast = ref<Contrast>((localStorage.getItem('gb_a11y_contrast') as Contrast) || 'normal')

function applyFontSize(val: FontSize) {
  const html = document.documentElement
  html.removeAttribute('data-font-size')
  if (val !== 'normal') html.setAttribute('data-font-size', val)
  localStorage.setItem('gb_a11y_font', val)
}

function applyColorMode(val: ColorMode) {
  const html = document.documentElement
  html.removeAttribute('data-color-mode')
  if (val !== 'none') html.setAttribute('data-color-mode', val)
  localStorage.setItem('gb_a11y_color', val)
}

function applyContrast(val: Contrast) {
  const html = document.documentElement
  html.removeAttribute('data-contrast')
  if (val !== 'normal') html.setAttribute('data-contrast', val)
  localStorage.setItem('gb_a11y_contrast', val)
}

watch(fontSize, applyFontSize)
watch(colorMode, applyColorMode)
watch(contrast, applyContrast)

function resetAll() {
  fontSize.value = 'normal'
  colorMode.value = 'none'
  contrast.value = 'normal'
  toast.success('Definições de acessibilidade repostas para os valores predefinidos.')
}

const FONT_OPTIONS: { value: FontSize; label: string; desc: string }[] = [
  { value: 'normal', label: 'Normal', desc: '14–16 px base' },
  { value: 'large', label: 'Grande', desc: '+12.5% de escala' },
  { value: 'xl', label: 'Muito Grande', desc: '+25% de escala' },
]

const COLOR_OPTIONS: { value: ColorMode; label: string; desc: string }[] = [
  { value: 'none', label: 'Nenhum', desc: 'Paleta original' },
  { value: 'deuteranopia', label: 'Deuteranopia', desc: 'Verde/Vermelho' },
  { value: 'protanopia', label: 'Protanopia', desc: 'Sem perceção do vermelho' },
  { value: 'tritanopia', label: 'Tritanopia', desc: 'Azul/Amarelo' },
]
</script>

<template>
  <div class="settings-section">
    <div class="section-header">
      <h2>Acessibilidade</h2>
      <p class="meta">Ajusta a interface para melhorar a tua experiência de utilização.</p>
    </div>

    <!-- Tamanho de letra -->
    <div class="a11y-group">
      <div class="group-header">
        <div class="group-icon-wrap">
          <MagnifyingGlassCircleIcon class="group-icon" aria-hidden="true" />
        </div>
        <div>
          <h3>Tamanho de letra</h3>
          <p>Aumenta o tamanho do texto em toda a interface.</p>
        </div>
      </div>
      <div class="group-body">
        <div class="option-cards">
          <button
            v-for="opt in FONT_OPTIONS"
            :key="opt.value"
            class="option-card"
            :class="{ 'option-card--active': fontSize === opt.value }"
            @click="fontSize = opt.value"
          >
            <div class="option-font-demo" :data-size="opt.value">Aa</div>
            <span class="option-label">{{ opt.label }}</span>
            <span class="option-desc">{{ opt.desc }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modo daltônico -->
    <div class="a11y-group">
      <div class="group-header">
        <div class="group-icon-wrap">
          <EyeIcon class="group-icon" aria-hidden="true" />
        </div>
        <div>
          <h3>Modo daltônico</h3>
          <p>Ajusta a paleta de cores conforme o teu tipo de daltonismo.</p>
        </div>
      </div>
      <div class="group-body">
        <div class="option-cards option-cards--4">
          <button
            v-for="opt in COLOR_OPTIONS"
            :key="opt.value"
            class="option-card"
            :class="{ 'option-card--active': colorMode === opt.value }"
            @click="colorMode = opt.value"
          >
            <div class="color-demo" :class="`color-demo--${opt.value}`">
              <span class="cd-dot cd-dot--r" />
              <span class="cd-dot cd-dot--g" />
              <span class="cd-dot cd-dot--b" />
            </div>
            <span class="option-label">{{ opt.label }}</span>
            <span class="option-desc">{{ opt.desc }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Alto Contraste -->
    <div class="a11y-group">
      <div class="group-header">
        <div class="group-icon-wrap">
          <SunIcon class="group-icon" aria-hidden="true" />
        </div>
        <div>
          <h3>Alto Contraste</h3>
          <p>Aumenta o contraste das cores para facilitar a leitura em condições de pouca iluminação ou dificuldades visuais.</p>
        </div>
      </div>
      <div class="group-body">
        <div class="option-cards option-cards--2">
          <button
            class="option-card"
            :class="{ 'option-card--active': contrast === 'normal' }"
            @click="contrast = 'normal'"
          >
            <div class="contrast-demo contrast-demo--normal">
              <span class="contrast-text">Texto</span>
            </div>
            <span class="option-label">Normal</span>
            <span class="option-desc">Contraste padrão da interface</span>
          </button>
          <button
            class="option-card"
            :class="{ 'option-card--active': contrast === 'high' }"
            @click="contrast = 'high'"
          >
            <div class="contrast-demo contrast-demo--high">
              <span class="contrast-text">Texto</span>
            </div>
            <span class="option-label">Alto Contraste</span>
            <span class="option-desc">Bordas e texto mais destacados</span>
          </button>
        </div>
      </div>
    </div>

    <div class="reset-row">
      <UiButton variant="outline" @click="resetAll">Repor predefinições</UiButton>
    </div>
  </div>
</template>

<style scoped>
.settings-section {
  display: grid;
  gap: var(--space-400);
  max-width: 42.5rem;
  width: 100%;
}

.section-header h2 { margin: 0; font-family: var(--font-display); font-size: clamp(1.125rem, 3vw, 1.375rem); }
.meta { margin: 0; color: var(--color-mirage-500); font-size: 0.8125rem; }

.a11y-group {
  border: 2px solid var(--color-mirage-800);
  border-radius: var(--radius-400);
  box-shadow: 3px 3px 0 var(--color-shadow);
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  padding: var(--space-300) var(--space-400);
  background: var(--color-wild-200);
  border-bottom: 2px solid var(--color-mirage-800);
}

.group-icon-wrap {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.625rem;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.group-icon { width: 1.125rem; height: 1.125rem; color: var(--color-deep-700); stroke-width: 2; }
.group-header h3 { margin: 0 0 2px; font-size: 0.9375rem; font-weight: 800; font-family: var(--font-display); color: var(--color-mirage-800); }
.group-header p { margin: 0; font-size: 0.75rem; color: var(--color-mirage-500); }

.group-body {
  padding: var(--space-400);
  display: grid;
  gap: var(--space-300);
  background: var(--color-wild-100);
}

.option-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-200);
}

.option-cards--2 { grid-template-columns: repeat(2, 1fr); }
.option-cards--4 { grid-template-columns: repeat(2, 1fr); }

.option-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-150);
  padding: var(--space-300);
  border: 2px solid var(--color-mirage-800);
  border-radius: 0.875rem;
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-base);
  transition: background 0.12s, border-color 0.12s, transform 0.1s, box-shadow 0.1s;
}

.option-card:hover { background: var(--color-wild-200); }
.option-card:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--color-shadow); }
.option-card--active { background: var(--color-deep-100); border-color: var(--color-deep-600); box-shadow: 3px 3px 0 var(--color-deep-300); }
.option-card--active:hover { background: var(--color-deep-100); }

.option-label { font-size: 0.8125rem; font-weight: 800; color: var(--color-mirage-800); }
.option-desc { font-size: 0.6875rem; font-weight: 600; color: var(--color-mirage-500); line-height: 1.4; }

.option-font-demo {
  font-family: var(--font-display);
  font-weight: 900;
  color: var(--color-deep-600);
  line-height: 1;
  margin-bottom: var(--space-100);
}

.option-font-demo[data-size="normal"] { font-size: 1.25rem; }
.option-font-demo[data-size="large"]  { font-size: 1.5rem; }
.option-font-demo[data-size="xl"]     { font-size: 1.75rem; }

.color-demo { display: flex; gap: 0.3125rem; margin-bottom: var(--space-100); }
.cd-dot { width: 0.875rem; height: 0.875rem; border-radius: 50%; border: 1.5px solid var(--color-mirage-800); }
.cd-dot--r { background: #e84040; }
.cd-dot--g { background: #38a169; }
.cd-dot--b { background: #3b82f6; }
.color-demo--deuteranopia .cd-dot--r { background: #c89a20; }
.color-demo--deuteranopia .cd-dot--g { background: #b3a020; }
.color-demo--deuteranopia .cd-dot--b { background: #3b82f6; }
.color-demo--protanopia .cd-dot--r { background: #888800; }
.color-demo--protanopia .cd-dot--g { background: #aaaa00; }
.color-demo--protanopia .cd-dot--b { background: #3b82f6; }
.color-demo--tritanopia .cd-dot--r { background: #e84040; }
.color-demo--tritanopia .cd-dot--g { background: #38a169; }
.color-demo--tritanopia .cd-dot--b { background: #a0a0c0; }

.contrast-demo {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border-radius: 0.5rem;
  margin-bottom: var(--space-100);
}
.contrast-demo--normal { background: var(--color-wild-200); border: 1.5px solid var(--color-wild-500); }
.contrast-demo--high { background: #000; border: 2px solid #fff; }
.contrast-text { font-size: 0.8125rem; font-weight: 700; }
.contrast-demo--normal .contrast-text { color: var(--color-mirage-600); }
.contrast-demo--high .contrast-text { color: #fff; }

.reset-row { display: flex; justify-content: flex-end; }

@media (max-width: 37.5em) {
  .group-body { padding: var(--space-300); }
  .group-header { padding: var(--space-200) var(--space-300); }
}

@media (max-width: 30em) {
  .option-card { padding: var(--space-200); }
  .option-cards--4 { grid-template-columns: 1fr 1fr; gap: var(--space-150); }
}
</style>
