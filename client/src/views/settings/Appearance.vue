<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { CheckIcon } from '@heroicons/vue/24/outline'

const currentBg = ref('bg-1')

const staticBackgrounds = [
  { id: 'bg-1', name: 'Original' },
  { id: 'bg-2', name: 'Quente Angular' },
  { id: 'bg-3', name: 'Frio Centralizado' },
  { id: 'bg-4', name: 'Mesh Suave' },
  { id: 'bg-5', name: 'Minimalista Vertical' },
  { id: 'bg-6', name: 'Duplo Foco Diagonal' },
  { id: 'bg-7', name: 'Suave Soft-Glow' },
]

const animatedBackgrounds = [
  { id: 'bg-8', name: 'Deslocamento Quente' },
  { id: 'bg-9', name: 'Deslocamento Frio' },
  { id: 'bg-10', name: 'Pulsação Radial' },
  { id: 'bg-11', name: 'Globos de Luz (Intenso)' },
  { id: 'bg-12', name: 'Onda de Energia (Intenso)' },
]

onMounted(() => {
  currentBg.value = document.documentElement.getAttribute('data-bg') || 'bg-1'
})

watch(currentBg, (bg) => {
  document.documentElement.setAttribute('data-bg', bg)
  localStorage.setItem('gb_bg', bg)
})
</script>

<template>
  <div class="settings-section">
    <h2>Aparência</h2>
    <p class="description">Personaliza o aspeto do GamiBook para se adaptar ao teu estilo.</p>

    <div class="setting-group">
      <div class="setting-row vertical">
        <div class="setting-info">
          <h3>O teu Fundo</h3>
          <p>Muda o padrão de fundo principal da tua janela.</p>
        </div>

        <div class="bg-category">
          <h4>Fundos Estáticos</h4>
          <div class="bg-selector">
            <button 
              v-for="bg in staticBackgrounds" 
              :key="bg.id" 
              class="bg-btn"
              :class="['bg-preview-' + bg.id, { active: currentBg === bg.id }]" 
              @click="currentBg = bg.id"
              :title="bg.name"
            >
              <span class="bg-check" v-if="currentBg === bg.id">
                <CheckIcon class="icon-check" aria-hidden="true" />
              </span>
            </button>
          </div>
        </div>

        <div class="bg-category">
          <h4>Fundos Animados</h4>
          <div class="bg-selector">
            <button 
              v-for="bg in animatedBackgrounds" 
              :key="bg.id" 
              class="bg-btn"
              :class="['bg-preview-' + bg.id, { active: currentBg === bg.id }]" 
              @click="currentBg = bg.id"
              :title="bg.name"
            >
              <span class="bg-check" v-if="currentBg === bg.id">
                <CheckIcon class="icon-check" aria-hidden="true" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-400);
}

h2 { margin: 0; font-family: var(--font-display); }
.description { margin: 0; color: var(--color-mirage-600); }

.setting-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-400);
  margin-top: var(--space-200);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-400);
  border-bottom: 1px solid var(--color-wild-300);
}

.setting-row.vertical {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-300);
}

.setting-info h3 { margin: 0 0 4px 0; font-size: 16px; font-family: var(--font-display); }
.setting-info p { margin: 0; font-size: 13px; color: var(--color-mirage-600); }

.bg-category { width: 100%; }
.bg-category h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
  font-family: var(--font-display);
}

.bg-selector {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-300);
}

.bg-btn {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--color-shadow);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  overflow: hidden; /* Importante para animações contidas no botão */
}

/* Solução Local: Se as variáveis globais não estiverem a mapear 
   corretamente através do atributo data, definimos as classes diretamente aqui 
   chamando as variáveis CSS root.
*/
.bg-preview-bg-1 { background: var(--grad-1); }
.bg-preview-bg-2 { background: var(--grad-2); }
.bg-preview-bg-3 { background: var(--grad-3); }
.bg-preview-bg-4 { background: var(--grad-4); }
.bg-preview-bg-5 { background: var(--grad-5); }
.bg-preview-bg-6 { background: var(--grad-6); }
.bg-preview-bg-7 { background: var(--grad-7); }

.bg-preview-bg-8 { background: var(--grad-8); background-size: 400% 400%; animation: animPanX 15s ease-in-out infinite; }
.bg-preview-bg-9 { background: var(--grad-9); background-size: 400% 400%; animation: animPanX 18s ease-in-out infinite; }
.bg-preview-bg-10 { background: var(--grad-10); background-size: 200% 200%; animation: animPulse 12s ease-in-out infinite; }
.bg-preview-bg-11 { background: var(--grad-11); background-size: 200% 200%; animation: animOrbs 15s ease-in-out infinite alternate; }
.bg-preview-bg-12 { background: var(--grad-12); background-size: 400% 400%; animation: animPanDiag 10s ease-in-out infinite; }

.bg-btn:hover {
  transform: translateY(-2px);
  box-shadow: 5px 5px 0 var(--color-shadow);
}

.bg-btn:active {
  transform: translate(1px, 2px);
  box-shadow: 1px 1px 0 var(--color-shadow);
}

.bg-btn.active {
  border-color: var(--color-wild-100);
  outline: 3px solid var(--color-deep-500);
  outline-offset: 2px;
}

.bg-check {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 10px;
}

.icon-check {
  width: 24px;
  height: 24px;
  color: #fff;
  stroke-width: var(--icon-stroke, 2);
}
</style>