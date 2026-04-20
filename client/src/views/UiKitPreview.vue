<script setup lang="ts">
import { ref } from 'vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
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
import UiSlider from '@/components/ui/UiSlider.vue'
import UiSwitch from '@/components/ui/UiSwitch.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'
import wintonUrl from '@/assets/images/winton.webp'
import { BellAlertIcon, CheckCircleIcon, ExclamationTriangleIcon, PaperClipIcon } from '@heroicons/vue/24/outline'

const inputValue = ref('')
const textareaValue = ref('')
const selectValue = ref<string | number | null>('level-1')
const checkboxValue = ref(false)
const radioValue = ref('a')
const switchValue = ref(true)
const switchValueAlt = ref(false)
const sliderValue = ref(35)
const segmentedValue = ref('grid')
const searchValue = ref('')
const modalOpen = ref(false)

const selectOptions = [
  { label: 'Nivel 1', value: 'level-1' },
  { label: 'Nivel 2', value: 'level-2' },
  { label: 'Nivel 3', value: 'level-3' },
]

const segmentedOptions = [
  { label: 'Grelha', value: 'grid' },
  { label: 'Lista', value: 'list' },
]
</script>

<template>
  <section class="kit">
    <header class="hero">
      <p class="kicker">Sistema visual</p>
      <h1>Ui Kit Preview</h1>
      <p class="subtitle">Componentes base com estados principais e combinacoes de estilo.</p>
    </header>

    <div class="grid">
      <UiCard class="card-wide">
        <h2>Botoes</h2>
        <div class="button-group">
          <span class="tag">Variantes</span>
          <div class="button-grid">
            <UiButton variant="primary">Primary</UiButton>
            <UiButton variant="secondary">Secondary</UiButton>
            <UiButton variant="outline">Outline</UiButton>
            <UiButton variant="ghost">Ghost</UiButton>
          </div>
        </div>
        <div class="button-group">
          <span class="tag">Tamanhos</span>
          <div class="button-grid">
            <UiButton size="sm" variant="primary">Small</UiButton>
            <UiButton size="md" variant="primary">Medium</UiButton>
            <UiButton size="lg" variant="primary">Large</UiButton>
          </div>
        </div>
        <div class="button-group">
          <span class="tag">Icones</span>
          <div class="row">
            <UiIconButton size="sm" aria-label="Adicionar">+</UiIconButton>
            <UiIconButton size="md" aria-label="Adicionar">+</UiIconButton>
            <UiIconButton size="lg" aria-label="Adicionar">+</UiIconButton>
            <UiIconButton size="sm" shape="square" aria-label="Adicionar">+</UiIconButton>
            <UiIconButton size="md" shape="square" aria-label="Adicionar">+</UiIconButton>
            <UiIconButton size="lg" shape="square" aria-label="Adicionar">+</UiIconButton>
          </div>
        </div>
        <div class="button-group">
          <span class="tag">Pill</span>
          <div class="row">
            <UiPillButton>Fechar</UiPillButton>
            <UiPillButton variant="primary">Confirmar</UiPillButton>
          </div>
        </div>
      </UiCard>

      <UiCard>
        <h2>Inputs</h2>
        <div class="column">
          <UiInput label="Nome" placeholder="O teu nome" :model-value="inputValue" @update="inputValue = $event" />
          <UiTextarea label="Descricao" placeholder="Escreve um resumo curto" :model-value="textareaValue"
            @update="textareaValue = $event" />
          <UiSelect label="Nivel" :options="selectOptions" :model-value="selectValue" @update="selectValue = $event" />
          <label class="file-field">
            <span class="label">Ficheiro</span>
            <div class="file-picker">
              <PaperClipIcon class="file-icon" aria-hidden="true" />
              <span class="file-name">Nenhum ficheiro escolhido</span>
              <span class="file-action">Selecionar</span>
              <input type="file" />
            </div>
          </label>
        </div>
      </UiCard>

      <UiCard>
        <h2>Checks</h2>
        <div class="column">
          <UiCheckbox label="Aceito os termos" :model-value="checkboxValue" @update="checkboxValue = $event" />
          <UiCheckbox tone="accent" label="Newsletter" :model-value="checkboxValue" @update="checkboxValue = $event" />
          <UiRadio name="demo" label="Opcao A" value="a" :model-value="radioValue" @update="radioValue = $event" />
          <UiRadio name="demo" label="Opcao B" value="b" :model-value="radioValue" @update="radioValue = $event" />
          <UiRadio name="demo" label="Opcao C" value="c" tone="accent" :model-value="radioValue"
            @update="radioValue = $event" />
          <div class="row">
            <UiSwitch :model-value="switchValue" @update="switchValue = $event" />
            <span class="helper">Notificacoes ativas</span>
          </div>
          <div class="row">
            <UiSwitch size="sm" tone="accent" :model-value="switchValueAlt" @update="switchValueAlt = $event" />
            <span class="helper">Modo destaque</span>
          </div>
        </div>
      </UiCard>

      <UiCard>
        <h2>Feedback</h2>
        <div class="column">
          <div class="row">
            <UiBadge label="Top 1" />
            <UiChip label="Novo" />
            <UiChip label="Premium" variant="filled" />
            <UiChip label="Neutro" variant="outline" />
          </div>
          <UiProgress :value="68" :max="100" />
          <div class="row">
            <UiSlider :model-value="sliderValue" @update="sliderValue = $event" />
            <span class="helper">{{ sliderValue }}%</span>
          </div>
        </div>
      </UiCard>

      <UiCard>
        <h2>Navegacao</h2>
        <div class="column">
          <UiSearch :model-value="searchValue" @update="searchValue = $event" />
          <UiSegmented :model-value="segmentedValue" :options="segmentedOptions" @update="segmentedValue = $event" />
        </div>
      </UiCard>

      <UiCard>
        <h2>Avatar</h2>
        <div class="row">
          <UiAvatar alt="G" :size="48" status="online" />
          <UiAvatar alt="M" :size="64" tone="accent" status="away" />
          <UiAvatar alt="B" :size="80" src="/favicon.ico" status="busy" />
          <UiAvatar alt="U" :size="56" :src="wintonUrl" status="offline" />
        </div>
      </UiCard>

      <UiCard>
        <h2>Notificacoes</h2>
        <div class="notification-list">
          <div class="notification info">
            <BellAlertIcon class="notification-icon" aria-hidden="true" />
            <div>
              <strong class="notification-title">Nova conquista</strong>
              <span class="notification-text">Ganhaste 50 pontos hoje.</span>
            </div>
          </div>
          <div class="notification success">
            <CheckCircleIcon class="notification-icon" aria-hidden="true" />
            <div>
              <strong class="notification-title">Livro aprovado</strong>
              <span class="notification-text">O teu livro foi publicado.</span>
            </div>
          </div>
          <div class="notification warning">
            <ExclamationTriangleIcon class="notification-icon" aria-hidden="true" />
            <div>
              <strong class="notification-title">Falta uma etapa</strong>
              <span class="notification-text">Termina o modulo 3.</span>
            </div>
          </div>
        </div>
      </UiCard>

      <UiCard>
        <h2>Cards</h2>
        <div class="card-grid">
          <article class="sample-card">
            <h3>Livro recomendado</h3>
            <p>Resumo curto com pontos chave e estado.</p>
            <div class="row">
              <UiChip label="Novidade" />
              <UiChip label="Nivel 2" variant="filled" />
            </div>
          </article>
          <article class="sample-card alt">
            <h3>Modulo em progresso</h3>
            <p>Completa mais duas atividades para subir de nivel.</p>
            <UiProgress :value="42" :max="100" />
          </article>
        </div>
      </UiCard>

      <UiCard>
        <h2>Modais</h2>
        <div class="row">
          <UiPillButton variant="primary" @click="modalOpen = true">Abrir modal</UiPillButton>
        </div>
      </UiCard>

      <UiCard>
        <h2>Imagens</h2>
        <div class="media-grid">
          <div class="image-card">
            <img :src="wintonUrl" alt="Capa" />
            <div class="image-meta">
              <strong>Capa principal</strong>
              <span>Formato 1:1</span>
            </div>
          </div>
          <div class="image-card wide">
            <img :src="wintonUrl" alt="Hero" />
            <div class="image-meta">
              <strong>Hero visual</strong>
              <span>Formato 16:9</span>
            </div>
          </div>
        </div>
      </UiCard>

      <UiCard>
        <h2>Backgrounds</h2>
        <div class="surface-grid">
          <div class="surface-card">
            <p>Surface neutra</p>
            <div class="surface-panel"></div>
          </div>
          <div class="surface-card">
            <p>Modal base</p>
            <div class="modal-preview">
              <div class="modal-head"></div>
              <div class="modal-lines"></div>
              <div class="modal-actions"></div>
            </div>
          </div>
        </div>
      </UiCard>

      <UiCard>
        <h2>Outlines & Breakers</h2>
        <div class="column">
          <div class="outline-box">
            <span>Outline principal</span>
          </div>
          <div class="divider"></div>
          <div class="outline-box subtle">
            <span>Outline suave</span>
          </div>
        </div>
      </UiCard>
    </div>
  </section>

  <div v-if="modalOpen" class="kit-modal-overlay" @click.self="modalOpen = false">
    <div class="kit-modal">
      <div class="kit-modal-header">
        <strong>Modal de exemplo</strong>
        <UiPillButton @click="modalOpen = false">Fechar</UiPillButton>
      </div>
      <p>Coloca aqui uma mensagem curta ou uma acao rapida.</p>
      <div class="row">
        <UiPillButton variant="primary">Confirmar</UiPillButton>
        <UiPillButton @click="modalOpen = false">Cancelar</UiPillButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kit {
  display: grid;
  gap: var(--space-700);
}

.hero {
  display: grid;
  gap: var(--space-200);
  padding: var(--space-500);
  border-radius: var(--radius-400);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.kicker {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 11px;
  color: var(--color-mirage-500);
  font-weight: 700;
}

.subtitle {
  color: var(--color-mirage-600);
  max-width: 480px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-500);
}

.card-wide {
  grid-column: 1 / -1;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-200);
  align-items: center;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-300);
}

.button-group {
  display: grid;
  gap: var(--space-200);
  margin-bottom: var(--space-300);
}

.column {
  display: grid;
  gap: var(--space-300);
}

.helper {
  font-size: 12px;
  color: var(--color-mirage-500);
  font-weight: 600;
}

h2 {
  margin: 0 0 var(--space-200);
  font-size: 18px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.file-field {
  display: grid;
  gap: var(--space-150);
  font-weight: 600;
  position: relative;
}

.label {
  color: var(--color-mirage-600);
  font-size: 12px;
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
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease;
}

.file-picker:hover .file-action {
  background: var(--color-wild-200);
}

.file-picker:active .file-action {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 var(--color-shadow);
}

.media-grid {
  display: grid;
  gap: var(--space-300);
}

.image-card {
  display: grid;
  gap: var(--space-200);
  padding: var(--space-300);
  border-radius: var(--radius-400);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.image-card img {
  width: 100%;
  height: 140px;
  object-fit: contain;
  border-radius: 12px;
  background: var(--color-wild-300);
}

.image-card.wide img {
  height: 180px;
}

.image-meta {
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: var(--color-mirage-500);
}

.surface-grid {
  display: grid;
  gap: var(--space-300);
}

.surface-card {
  display: grid;
  gap: var(--space-200);
}

.surface-panel {
  height: 120px;
  border-radius: var(--radius-400);
  background: linear-gradient(140deg, var(--color-wild-100), var(--color-deep-100));
  border: 2px solid var(--color-mirage-800);
  box-shadow: inset 0 0 0 1px rgba(2, 29, 32, 0.08);
}

.modal-preview {
  height: 160px;
  border-radius: var(--radius-400);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  padding: var(--space-300);
  display: grid;
  gap: var(--space-200);
}

.modal-head,
.modal-lines,
.modal-actions {
  border-radius: 8px;
  background: var(--color-wild-400);
}

.modal-head {
  height: 18px;
  width: 65%;
}

.modal-lines {
  height: 54px;
}

.modal-actions {
  height: 24px;
  width: 55%;
  justify-self: end;
}

.outline-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-300);
  border-radius: var(--radius-400);
  border: 2px dashed var(--color-mirage-800);
  background: var(--color-wild-100);
  font-weight: 600;
  color: var(--color-mirage-700);
}

.notification-list {
  display: grid;
  gap: var(--space-200);
}

.notification {
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

.notification-icon {
  width: 20px;
  height: 20px;
  color: var(--color-mirage-800);
}

.notification-title {
  display: block;
  font-size: 14px;
  color: var(--color-mirage-800);
}

.notification-text {
  display: block;
  font-size: 12px;
  color: var(--color-mirage-600);
}

.notification.info {
  background: var(--color-deep-100);
}

.notification.success {
  background: var(--color-deep-200);
}

.notification.warning {
  background: var(--color-amber-100);
}

.card-grid {
  display: grid;
  gap: var(--space-300);
}

.sample-card {
  padding: var(--space-300);
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  gap: var(--space-200);
}

.sample-card.alt {
  background: var(--color-deep-100);
}

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

.kit-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-300);
  font-weight: 700;
}

.outline-box.subtle {
  border-style: solid;
  border-color: var(--color-wild-700);
}

.divider {
  height: 2px;
  background: repeating-linear-gradient(90deg,
      var(--color-mirage-800),
      var(--color-mirage-800) 10px,
      transparent 10px,
      transparent 18px);
  border-radius: 999px;
}

@media (max-width: 720px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-wide {
    grid-column: auto;
  }
}
</style>
