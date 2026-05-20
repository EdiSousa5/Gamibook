<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { CheckIcon, LockClosedIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { updateUser } from '@/services/auth'
import { useToast } from '@/composables/useToast'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiButton from '@/components/ui/UiButton.vue'
import type { AvatarBorder, AvatarColor, AvatarEffect, AvatarShadow } from '@/types/avatar'

const authStore = useAuthStore()
const { user, isAdmin, avatarUrl } = storeToRefs(authStore)
const toast = useToast()
const userLevel = computed(() => user.value?.level ?? 1)

/* ── Background ──────────────────────────────────────── */

const currentBg = ref('bg-1')
const devUnlockAll = ref(false)

interface Background {
  id: string
  name: string
  minLevel: number
}

const solidBackgrounds: Background[] = [
  { id: 'bg-22', name: 'Branco Puro', minLevel: 1 },
  { id: 'bg-24', name: 'Menta Claro', minLevel: 2 },
  { id: 'bg-25', name: 'Areia', minLevel: 2 },
  { id: 'bg-26', name: 'Teal Claro', minLevel: 3 },
  { id: 'bg-27', name: 'Carmesim Suave', minLevel: 5 },
  { id: 'bg-28', name: 'Âmbar Claro', minLevel: 5 },
]

const staticBackgrounds: Background[] = [
  { id: 'bg-1', name: 'Original', minLevel: 1 },
  { id: 'bg-3', name: 'Água Clara', minLevel: 3 },
  { id: 'bg-2', name: 'Amanhecer', minLevel: 5 },
  { id: 'bg-9', name: 'Pêssego', minLevel: 5 },
  { id: 'bg-6', name: 'Menta', minLevel: 8 },
  { id: 'bg-7', name: 'Aurora Ligeira', minLevel: 10 },
  { id: 'bg-5', name: 'Coral', minLevel: 10 },
  { id: 'bg-20', name: 'Bosque Profundo', minLevel: 12 },
  { id: 'bg-16', name: 'Dourado', minLevel: 12 },
  { id: 'bg-14', name: 'Rosado', minLevel: 15 },
]

const animatedBackgrounds: Background[] = [
  { id: 'bg-10', name: 'Ondas Suaves', minLevel: 12 },
  { id: 'bg-11', name: 'Brisa Quente', minLevel: 15 },
  { id: 'bg-12', name: 'Aurora Suave', minLevel: 18 },
  { id: 'bg-18', name: 'Doce Carmesim', minLevel: 18 },
  { id: 'bg-13', name: 'Flutuar', minLevel: 20 },
  { id: 'bg-17', name: 'Respiração', minLevel: 20 },
  { id: 'bg-30', name: 'Fogo Boreal', minLevel: 22 },
  { id: 'bg-31', name: 'Pulso Marinho', minLevel: 25 },
]

function isUnlocked(bg: Background): boolean {
  return isAdmin.value || devUnlockAll.value || userLevel.value >= bg.minLevel
}

async function selectBg(bg: Background) {
  if (!isUnlocked(bg)) return
  currentBg.value = bg.id
  document.documentElement.setAttribute('data-bg', bg.id)
  localStorage.setItem('gb_bg', bg.id)
  const userId = user.value?.id
  if (!userId) return
  try {
    await updateUser(String(userId), { background_theme: bg.id })
    if (authStore.user) authStore.user.background_theme = bg.id
  } catch {
    // falha silenciosa — o fundo já foi aplicado localmente
  }
}

/* ── Avatar customization ────────────────────────────── */

const avatarBorder = ref<AvatarBorder>('default')
const avatarColor = ref<AvatarColor | null>(null)
const avatarEffect = ref<AvatarEffect>('none')
const avatarShadow = ref<AvatarShadow>('default')
const isSaving = ref(false)

onMounted(() => {
  currentBg.value = document.documentElement.getAttribute('data-bg') || localStorage.getItem('gb_bg') || 'bg-1'

  avatarBorder.value =
    (user.value?.avatar_border as AvatarBorder) ||
    (localStorage.getItem('gb_av_border') as AvatarBorder) ||
    'default'
  avatarColor.value =
    (user.value?.avatar_color as AvatarColor) ||
    (localStorage.getItem('gb_av_color') as AvatarColor) ||
    null
  avatarEffect.value =
    (user.value?.avatar_effect as AvatarEffect) ||
    (localStorage.getItem('gb_av_effect') as AvatarEffect) ||
    'none'
  avatarShadow.value =
    (user.value?.avatar_shadow as AvatarShadow) ||
    (localStorage.getItem('gb_av_shadow') as AvatarShadow) ||
    'default'
})

async function saveAvatarConfig() {
  const userId = user.value?.id
  if (!userId) return
  isSaving.value = true
  try {
    await updateUser(String(userId), {
      avatar_border: avatarBorder.value,
      avatar_color: avatarColor.value ?? undefined,
      avatar_effect: avatarEffect.value,
      avatar_shadow: avatarShadow.value,
    })
    if (authStore.user) {
      authStore.user.avatar_border = avatarBorder.value
      authStore.user.avatar_color = avatarColor.value ?? undefined
      authStore.user.avatar_effect = avatarEffect.value
      authStore.user.avatar_shadow = avatarShadow.value
    }
    localStorage.setItem('gb_av_border', avatarBorder.value)
    avatarColor.value ? localStorage.setItem('gb_av_color', avatarColor.value) : localStorage.removeItem('gb_av_color')
    localStorage.setItem('gb_av_effect', avatarEffect.value)
    localStorage.setItem('gb_av_shadow', avatarShadow.value)
    toast.success('Avatar guardado com sucesso.')
  } catch {
    toast.error('Não foi possível guardar. Tenta novamente.')
  } finally {
    isSaving.value = false
  }
}

const BORDER_OPTIONS: { id: AvatarBorder; label: string }[] = [
  { id: 'default', label: 'Padrão' },
  { id: 'minimal', label: 'Mínimo' },
  { id: 'heavy', label: 'Pesada' },
  { id: 'ring', label: 'Anel' },
]

const COLOR_OPTIONS: { id: AvatarColor; label: string; hex: string }[] = [
  { id: 'teal', label: 'Teal', hex: '#4e9d98' },
  { id: 'teal-dark', label: 'Teal Esc.', hex: '#075056' },
  { id: 'teal-light', label: 'Teal Claro', hex: '#a7d2cf' },
  { id: 'amber', label: 'Âmbar', hex: '#ff8a50' },
  { id: 'amber-dark', label: 'Âmbar Esc.', hex: '#e8611e' },
  { id: 'pumpkin', label: 'Abóbora', hex: '#ffa74f' },
  { id: 'crimson', label: 'Carmesim', hex: '#d85252' },
  { id: 'crimson-dark', label: 'Carm. Esc.', hex: '#9e2828' },
  { id: 'slate', label: 'Ardósia', hex: '#52656f' },
  { id: 'slate-dark', label: 'Ard. Esc.', hex: '#22313a' },
]

const EFFECT_OPTIONS: { id: AvatarEffect; label: string }[] = [
  { id: 'none', label: 'Nenhum' },
  { id: 'glow', label: 'Brilho' },
  { id: 'shine', label: 'Lustro' },
  { id: 'sombra', label: 'Sombra' },
  { id: 'retro', label: 'Retro' },
  { id: 'mono', label: 'Mono' },
  { id: 'vivid', label: 'Vívido' },
]

const SHADOW_OPTIONS: { id: AvatarShadow; label: string }[] = [
  { id: 'default', label: 'Normal' },
  { id: 'small', label: 'Pequena' },
  { id: 'none', label: 'Sem sombra' },
]
</script>

<template>
  <div class="settings-section">
    <h2>Aparência</h2>
    <p class="description">Personaliza o aspeto do GamiBook para se adaptar ao teu estilo.</p>

    <!-- Avatar -->
    <div class="setting-group">
      <div class="setting-row vertical">
        <div class="setting-info">
          <h3>O teu Avatar</h3>
          <p>Escolhe a borda, cor, efeito e sombra do teu avatar.</p>
        </div>

        <div class="av-editor">
          <div class="av-preview-box">
            <UiAvatar
              :src="avatarUrl || undefined"
              :alt="user?.first_name?.charAt(0) ?? 'G'"
              :size="88"
              :border="avatarBorder"
              :avatar-color="avatarColor ?? undefined"
              :effect="avatarEffect"
              :shadow="avatarShadow"
            />
          </div>

          <div class="av-panel">
            <div class="av-group">
              <span class="av-label">Borda</span>
              <div class="av-pills">
                <button
                  v-for="b in BORDER_OPTIONS"
                  :key="b.id"
                  class="av-pill"
                  :class="{ active: avatarBorder === b.id }"
                  @click="avatarBorder = b.id"
                >{{ b.label }}</button>
              </div>
            </div>

            <div class="av-group">
              <span class="av-label">Cor da borda</span>
              <div class="av-color-row">
                <button
                  class="av-swatch default-swatch"
                  :class="{ active: avatarColor === null }"
                  title="Padrão (escuro)"
                  @click="avatarColor = null"
                />
                <button
                  v-for="c in COLOR_OPTIONS"
                  :key="c.id"
                  class="av-swatch"
                  :class="{ active: avatarColor === c.id }"
                  :style="{ background: c.hex }"
                  :title="c.label"
                  @click="avatarColor = c.id"
                />
              </div>
            </div>

            <div class="av-group">
              <span class="av-label">Efeito</span>
              <div class="av-pills">
                <button
                  v-for="e in EFFECT_OPTIONS"
                  :key="e.id"
                  class="av-pill"
                  :class="{ active: avatarEffect === e.id }"
                  @click="avatarEffect = e.id"
                >{{ e.label }}</button>
              </div>
            </div>

            <div class="av-group">
              <span class="av-label">Sombra</span>
              <div class="av-pills">
                <button
                  v-for="s in SHADOW_OPTIONS"
                  :key="s.id"
                  class="av-pill"
                  :class="{ active: avatarShadow === s.id }"
                  @click="avatarShadow = s.id"
                >{{ s.label }}</button>
              </div>
            </div>

            <div class="av-group av-group--save">
              <UiButton variant="primary" :disabled="isSaving" @click="saveAvatarConfig">
                {{ isSaving ? 'A guardar...' : 'Guardar avatar' }}
              </UiButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Fundo -->
    <div class="setting-group">
      <div class="setting-row vertical">
        <div class="setting-info">
          <h3>O teu Fundo</h3>
          <p>Muda o padrão de fundo principal da tua janela. Novos fundos desbloqueiam ao subir de nível.</p>
        </div>

        <button class="dev-unlock-btn" @click="devUnlockAll = !devUnlockAll">
          {{ devUnlockAll ? 'Bloquear tudo' : 'Desbloquear tudo (teste)' }}
        </button>

        <div class="bg-category">
          <h4>Cores Sólidas</h4>
          <div class="bg-selector">
            <button
              v-for="bg in solidBackgrounds"
              :key="bg.id"
              class="bg-btn"
              :class="['bg-preview-' + bg.id, { active: currentBg === bg.id, locked: !isUnlocked(bg) }]"
              @click="selectBg(bg)"
              :title="isUnlocked(bg) ? bg.name : `${bg.name} — Nível ${bg.minLevel}`"
              :aria-disabled="!isUnlocked(bg)"
            >
              <span class="bg-check" v-if="currentBg === bg.id && isUnlocked(bg)">
                <CheckIcon class="icon-check" aria-hidden="true" />
              </span>
              <span class="bg-lock" v-else-if="!isUnlocked(bg)">
                <LockClosedIcon class="icon-lock" aria-hidden="true" />
                <span class="lock-level">{{ bg.minLevel }}</span>
              </span>
            </button>
          </div>
        </div>

        <div class="bg-category">
          <h4>Gradientes</h4>
          <div class="bg-selector">
            <button
              v-for="bg in staticBackgrounds"
              :key="bg.id"
              class="bg-btn"
              :class="['bg-preview-' + bg.id, { active: currentBg === bg.id, locked: !isUnlocked(bg) }]"
              @click="selectBg(bg)"
              :title="isUnlocked(bg) ? bg.name : `${bg.name} — Nível ${bg.minLevel}`"
              :aria-disabled="!isUnlocked(bg)"
            >
              <span class="bg-check" v-if="currentBg === bg.id && isUnlocked(bg)">
                <CheckIcon class="icon-check" aria-hidden="true" />
              </span>
              <span class="bg-lock" v-else-if="!isUnlocked(bg)">
                <LockClosedIcon class="icon-lock" aria-hidden="true" />
                <span class="lock-level">{{ bg.minLevel }}</span>
              </span>
            </button>
          </div>
        </div>

        <div class="bg-category">
          <h4>Animações</h4>
          <div class="bg-selector">
            <button
              v-for="bg in animatedBackgrounds"
              :key="bg.id"
              class="bg-btn"
              :class="['bg-preview-' + bg.id, { active: currentBg === bg.id, locked: !isUnlocked(bg) }]"
              @click="selectBg(bg)"
              :title="isUnlocked(bg) ? bg.name : `${bg.name} — Nível ${bg.minLevel}`"
              :aria-disabled="!isUnlocked(bg)"
            >
              <span class="bg-check" v-if="currentBg === bg.id && isUnlocked(bg)">
                <CheckIcon class="icon-check" aria-hidden="true" />
              </span>
              <span class="bg-lock" v-else-if="!isUnlocked(bg)">
                <LockClosedIcon class="icon-lock" aria-hidden="true" />
                <span class="lock-level">{{ bg.minLevel }}</span>
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
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: var(--space-400);
}

h2 {
  margin: 0;
  font-family: var(--font-display);
}

.description {
  margin: 0;
  color: var(--color-mirage-600);
}

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
  border-bottom: 1px solid var(--color-wild-400);
}

.setting-row.vertical {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-300);
}

.setting-info h3 {
  margin: 0 0 var(--space-100) 0;
  font-size: 16px;
  font-family: var(--font-display);
}

.setting-info p {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-600);
}

/* ── Avatar editor ───────────────────────────────────── */

.av-editor {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: var(--space-500);
  width: 100%;
  align-items: start;
}

.av-preview-box {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-500);
  padding-bottom: calc(var(--space-500) + 10px);
  border-radius: 16px;
  border: 2px solid var(--color-deep-800);
  background: var(--color-deep-100);
  box-shadow: 4px 4px 0 var(--color-deep-300);
  aspect-ratio: 1;
}

.av-panel {
  display: grid;
  gap: 0;
}

.av-group {
  display: grid;
  gap: var(--space-200);
  padding: var(--space-300) 0;
  border-top: 1px solid var(--color-wild-500);
}

.av-group:first-child {
  padding-top: 0;
  border-top: none;
}

.av-label {
  display: block;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-deep-600);
}

.av-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-150);
}

.av-pill {
  padding: 5px 13px;
  border-radius: 999px;
  border: 2px solid var(--color-deep-800);
  background: var(--color-wild-100);
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-base);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  box-shadow: 2px 2px 0 var(--color-deep-300);
}

.av-pill:hover {
  background: var(--color-deep-100);
}

.av-pill:active {
  transform: translate(2px, 2px);
  box-shadow: 0px 0px 0 var(--color-deep-300);
}

.av-pill.active {
  background: var(--color-deep-100);
  border-color: var(--color-deep-600);
  box-shadow: 2px 2px 0 var(--color-deep-400);
}

.av-pill.active:active {
  transform: translate(2px, 2px);
  box-shadow: 0px 0px 0 var(--color-deep-400);
}

.av-color-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-200);
}

.av-swatch {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-deep-800);
  box-shadow: 2px 2px 0 var(--color-deep-300);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  outline: 2px solid transparent;
  outline-offset: 0px;
  transition: outline-offset 0.1s ease;
}

.av-swatch:hover {
  outline-color: var(--color-deep-400);
  outline-offset: 3px;
}

.av-swatch:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--color-deep-300);
}

.av-swatch.active {
  outline-color: var(--color-deep-700);
  outline-offset: 3px;
}

.av-swatch.default-swatch {
  background: var(--color-deep-800);
}

.av-swatch-sep {
  width: 1px;
  height: 22px;
  background: var(--color-wild-600);
  flex-shrink: 0;
}

.av-swatch.special-swatch {
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
}

.av-swatch.special-swatch:hover {
  outline-color: var(--color-deep-400);
  outline-offset: 3px;
}

.av-swatch.special-swatch.active {
  outline-color: var(--color-deep-700);
  outline-offset: 3px;
}

.av-group--save {
  padding-bottom: 0;
  display: flex;
}

.av-group--save :deep(.ui-button) {
  width: fit-content;
}

/* ── Dev unlock ──────────────────────────────────────── */

.dev-unlock-btn {
  margin-top: var(--space-200);
  padding: 6px 12px;
  font-size: 12px;
  font-family: var(--font-base);
  border: 1.5px dashed var(--color-deep-400);
  border-radius: var(--radius-200);
  background: transparent;
  color: var(--color-deep-600);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.dev-unlock-btn:hover {
  border-color: var(--color-deep-600);
  color: var(--color-deep-700);
}

/* ── Background selector ─────────────────────────────── */

.bg-category {
  width: 100%;
  margin-top: var(--space-300);
}

.bg-category h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-deep-600);
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
  border: 2px solid var(--color-deep-800);
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--color-deep-300);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  overflow: hidden;
}

.bg-preview-bg-1  { background: var(--grad-1); }
.bg-preview-bg-2  { background: var(--grad-2); }
.bg-preview-bg-3  { background: var(--grad-3); }
.bg-preview-bg-5  { background: var(--grad-5); }
.bg-preview-bg-6  { background: var(--grad-6); }
.bg-preview-bg-7  { background: var(--grad-7); }
.bg-preview-bg-9  { background: var(--grad-9); }
.bg-preview-bg-14 { background: var(--grad-14); }
.bg-preview-bg-16 { background: var(--grad-16); }
.bg-preview-bg-20 { background: var(--grad-20); }
.bg-preview-bg-22 { background: var(--grad-22); }
.bg-preview-bg-24 { background: var(--grad-24); }
.bg-preview-bg-25 { background: var(--grad-25); }
.bg-preview-bg-26 { background: var(--grad-26); }
.bg-preview-bg-27 { background: var(--grad-27); }
.bg-preview-bg-28 { background: var(--grad-28); }

.bg-preview-bg-10 {
  background: var(--grad-10);
  background-size: 400% 400%;
  animation: animPanX 15s ease-in-out infinite;
}
.bg-preview-bg-11 {
  background: var(--grad-11);
  background-size: 400% 400%;
  animation: animPanDiag 18s ease-in-out infinite;
}
.bg-preview-bg-12 {
  background: var(--grad-12);
  background-size: 100% 400%;
  animation: animPanY 15s ease-in-out infinite;
}
.bg-preview-bg-13 {
  background: var(--grad-13);
  background-size: 220% 220%;
  animation: animOrbs 20s ease-in-out infinite;
}
.bg-preview-bg-17 {
  background: var(--grad-17);
  background-size: 100% 100%;
  animation: animPulse 2.5s ease-in-out infinite alternate;
}
.bg-preview-bg-18 {
  background: var(--grad-18);
  background-size: 400% 400%;
  animation: animPanX 12s ease-in-out infinite;
}
.bg-preview-bg-30 {
  background: var(--grad-30);
  background-size: 400% 400%;
  animation: animPanDiag 15s ease-in-out infinite;
}
.bg-preview-bg-31 {
  background: var(--grad-31);
  background-size: 100% 100%;
  animation: animPulse 3s ease-in-out infinite alternate;
}

.bg-btn:hover:not(.locked) {
  transform: translateY(-2px);
  box-shadow: 5px 5px 0 var(--color-deep-300);
}

.bg-btn:active:not(.locked) {
  transform: translate(1px, 2px);
  box-shadow: 1px 1px 0 var(--color-deep-300);
}

.bg-btn.active {
  border-color: var(--color-deep-500);
  outline: 3px solid var(--color-deep-500);
  outline-offset: 2px;
  box-shadow: 3px 3px 0 var(--color-deep-400);
}

.bg-btn.locked {
  cursor: not-allowed;
}

.bg-check {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(7, 80, 86, 0.35);
  border-radius: 10px;
}

.icon-check {
  width: 24px;
  height: 24px;
  color: #fff;
  stroke-width: var(--icon-stroke, 2);
}

.bg-lock {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(232, 245, 244, 0.55);
  backdrop-filter: blur(3px);
  border-radius: 10px;
}

.icon-lock {
  width: 20px;
  height: 20px;
  color: var(--color-deep-800);
  stroke-width: 2.5;
  filter: drop-shadow(0 1px 3px rgba(255, 255, 255, 0.7));
}

.lock-level {
  font-size: 11px;
  font-weight: 800;
  color: var(--color-deep-800);
  font-family: var(--font-display);
  background: var(--color-deep-100);
  padding: 2px 7px;
  border-radius: 999px;
  border: 1.5px solid var(--color-deep-600);
  box-shadow: 2px 2px 0 var(--color-deep-300);
  line-height: 1;
}

/* ── Keyframes ───────────────────────────────────────── */

@keyframes animPanX {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes animPanY {
  0%   { background-position: 50% 0%; }
  50%  { background-position: 50% 100%; }
  100% { background-position: 50% 0%; }
}

@keyframes animPanDiag {
  0%   { background-position: 0% 0%; }
  50%  { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
}

@keyframes animPulse {
  0%, 100% { background-position: center; background-size: 100% 100%; }
  50%       { background-position: center; background-size: 150% 150%; }
}

@keyframes animOrbs {
  0%   { background-position: 0% 0%, 100% 100%, 0% 0%; }
  50%  { background-position: 100% 0%, 0% 100%, 0% 0%; }
  100% { background-position: 0% 100%, 100% 0%, 0% 0%; }
}
</style>
