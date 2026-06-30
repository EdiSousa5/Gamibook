<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  CheckIcon,
  LockClosedIcon,
  LockOpenIcon,
  InformationCircleIcon,
  PaintBrushIcon,
  SparklesIcon,
  SwatchIcon,
  PhotoIcon,
  FilmIcon,
} from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { updateUser } from '@/services/auth'
import { useToast } from '@/composables/useToast'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import type { AvatarBorder, AvatarColor, AvatarEffect, AvatarShadow } from '@/types/avatar'

const authStore = useAuthStore()
const { user, isAdmin, avatarConfig } = storeToRefs(authStore)
const toast = useToast()
const userLevel = computed(() => user.value?.level ?? 1)

/* ── Background ──────────────────────────────────────── */

const currentBg = ref('bg-1')

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
  { id: 'bg-12', name: 'Aurora Suave', minLevel: 14 },
  { id: 'bg-18', name: 'Doce Carmesim', minLevel: 14 },
  { id: 'bg-13', name: 'Flutuar', minLevel: 16 },
  { id: 'bg-17', name: 'Respiração', minLevel: 16 },
  { id: 'bg-30', name: 'Fogo Boreal', minLevel: 18 },
  { id: 'bg-31', name: 'Pulso Marinho', minLevel: 20 },
]

function isUnlocked(bg: Background): boolean {
  return isAdmin.value || userLevel.value >= bg.minLevel
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
    toast.success(`Fundo "${bg.name}" aplicado com sucesso.`)
  } catch {
    toast.error('Não foi possível guardar o fundo. Tenta novamente.')
  }
}

/* ── Avatar customization ────────────────────────────── */

const avatarBorder = ref<AvatarBorder>('default')
const avatarColor = ref<AvatarColor | null>(null)
const avatarEffect = ref<AvatarEffect>('none')
const avatarShadow = ref<AvatarShadow>('default')
const isSaving = ref(false)

// Carrega as opções guardadas sempre que o utilizador estiver disponível (cobre
// o caso de voltar à página com o store já carregado, e o de carregar pela 1ª vez).
watch(user, (u) => {
  currentBg.value = document.documentElement.getAttribute('data-bg') || localStorage.getItem('gb_bg') || 'bg-1'
  avatarBorder.value = (u?.avatar_border as AvatarBorder) || 'default'
  avatarColor.value = u ? ((u.avatar_color as AvatarColor) ?? null) : null
  avatarEffect.value = (u?.avatar_effect as AvatarEffect) || 'none'
  avatarShadow.value = (u?.avatar_shadow as AvatarShadow) || 'default'
}, { immediate: true })

async function saveAvatarConfig() {
  const userId = user.value?.id
  if (!userId) return
  isSaving.value = true
  try {
    await updateUser(String(userId), {
      avatar_border: avatarBorder.value,
      avatar_color: avatarColor.value,
      avatar_effect: avatarEffect.value,
      avatar_shadow: avatarShadow.value,
    })
    if (authStore.user) {
      authStore.user.avatar_border = avatarBorder.value
      authStore.user.avatar_color = avatarColor.value
      authStore.user.avatar_effect = avatarEffect.value
      authStore.user.avatar_shadow = avatarShadow.value
    }
    toast.success('Avatar guardado com sucesso.')
  } catch {
    toast.error('Não foi possível guardar. Tenta novamente.')
  } finally {
    isSaving.value = false
  }
}

const BORDER_OPTIONS: { id: AvatarBorder; label: string; minLevel: number }[] = [
  { id: 'default', label: 'Padrão', minLevel: 1 },
  { id: 'minimal', label: 'Mínimo', minLevel: 3 },
  { id: 'heavy', label: 'Pesada', minLevel: 7 },
  { id: 'ring', label: 'Anel', minLevel: 10 },
]

const COLOR_OPTIONS: { id: AvatarColor; label: string; hex: string; minLevel: number }[] = [
  { id: 'teal', label: 'Teal', hex: '#4e9d98', minLevel: 1 },
  { id: 'teal-light', label: 'Teal Claro', hex: '#a7d2cf', minLevel: 2 },
  { id: 'teal-dark', label: 'Teal Esc.', hex: '#075056', minLevel: 5 },
  { id: 'amber', label: 'Âmbar', hex: '#ff8a50', minLevel: 5 },
  { id: 'pumpkin', label: 'Abóbora', hex: '#ffa74f', minLevel: 8 },
  { id: 'amber-dark', label: 'Âmbar Esc.', hex: '#e8611e', minLevel: 8 },
  { id: 'crimson', label: 'Carmesim', hex: '#d85252', minLevel: 10 },
  { id: 'slate', label: 'Ardósia', hex: '#52656f', minLevel: 10 },
  { id: 'crimson-dark', label: 'Carm. Esc.', hex: '#9e2828', minLevel: 15 },
  { id: 'slate-dark', label: 'Ard. Esc.', hex: '#22313a', minLevel: 14 },
]

const EFFECT_OPTIONS: { id: AvatarEffect; label: string; minLevel: number }[] = [
  { id: 'none', label: 'Nenhum', minLevel: 1 },
  { id: 'glow', label: 'Brilho', minLevel: 5 },
  { id: 'sombra', label: 'Sombra', minLevel: 5 },
  { id: 'shine', label: 'Lustro', minLevel: 8 },
  { id: 'mono', label: 'Mono', minLevel: 10 },
  { id: 'vivid', label: 'Vívido', minLevel: 12 },
  { id: 'retro', label: 'Retro', minLevel: 14 },
]

const SHADOW_OPTIONS: { id: AvatarShadow; label: string }[] = [
  { id: 'default', label: 'Normal' },
  { id: 'small', label: 'Pequena' },
  { id: 'none', label: 'Sem sombra' },
]

function isAvatarOptionUnlocked(minLevel: number): boolean {
  return isAdmin.value || userLevel.value >= minLevel
}

/* ── Tabela de desbloqueios ──────────────────────── */

type UnlockRow = { label: string; category: string; minLevel: number; hex?: string; gradVar?: string }

const ALL_UNLOCKABLES = computed<UnlockRow[]>(() => {
  const rows: UnlockRow[] = [
    ...BORDER_OPTIONS.filter(b => b.minLevel > 1).map(b => ({ label: b.label, category: 'Borda', minLevel: b.minLevel })),
    ...COLOR_OPTIONS.filter(c => c.minLevel > 1).map(c => ({ label: c.label, category: 'Cor', minLevel: c.minLevel, hex: c.hex })),
    ...EFFECT_OPTIONS.filter(e => e.minLevel > 1).map(e => ({ label: e.label, category: 'Efeito', minLevel: e.minLevel })),
    ...solidBackgrounds.filter(b => b.minLevel > 1).map(b => ({ label: b.name, category: 'Fundo Sólido', minLevel: b.minLevel, gradVar: b.id.replace('bg-', '--grad-') })),
    ...staticBackgrounds.filter(b => b.minLevel > 1).map(b => ({ label: b.name, category: 'Gradiente', minLevel: b.minLevel, gradVar: b.id.replace('bg-', '--grad-') })),
    ...animatedBackgrounds.map(b => ({ label: b.name, category: 'Fundo Animado', minLevel: b.minLevel, gradVar: b.id.replace('bg-', '--grad-') })),
  ]
  return rows.sort((a, b) => a.minLevel - b.minLevel)
})

const unlockModalOpen = ref(false)
const filterLevel = ref<'all' | 'unlocked' | 'locked'>('all')
const filterCategory = ref<string>('all')
const filterSpecificLevel = ref<string>('')

const CATEGORY_CHIPS = [
  { value: 'all', label: 'Todos' },
  { value: 'Borda', label: 'Borda' },
  { value: 'Cor', label: 'Cor' },
  { value: 'Efeito', label: 'Efeito' },
  { value: 'Fundo', label: 'Fundo' },
]

function getCategoryIcon(category: string) {
  if (category === 'Borda') return PaintBrushIcon
  if (category === 'Efeito') return SparklesIcon
  if (category === 'Fundo Sólido') return SwatchIcon
  if (category === 'Gradiente') return PhotoIcon
  if (category === 'Fundo Animado') return FilmIcon
  return SwatchIcon
}

function getCategoryColor(category: string): string {
  if (category === 'Borda') return 'var(--color-deep-600)'
  if (category === 'Efeito') return 'var(--color-amber-600, #d97706)'
  if (category === 'Fundo Sólido') return 'var(--color-teal-600, #0d9488)'
  if (category === 'Gradiente') return 'var(--color-deep-500)'
  if (category === 'Fundo Animado') return 'var(--color-crimson-600, #dc2626)'
  return 'var(--color-mirage-500)'
}

const levelGroups = computed(() => {
  const groups: Record<number, UnlockRow[]> = {}
  for (const row of filteredUnlockables.value) {
    if (!groups[row.minLevel]) groups[row.minLevel] = []
    ;(groups[row.minLevel] as UnlockRow[]).push(row)
  }
  return groups
})

const CATEGORIES = computed(() => [...new Set(ALL_UNLOCKABLES.value.map(r => r.category))])

const categoryOptions = computed(() => [
  { label: 'Todas as categorias', value: '' },
  ...CATEGORIES.value.map((c: string) => ({ label: c, value: c })),
])

function isRowUnlocked(row: UnlockRow): boolean {
  return isAdmin.value || userLevel.value >= row.minLevel
}

function levelUnlocked(level: number): boolean {
  return isAdmin.value || userLevel.value >= level
}

const filteredUnlockables = computed(() => {
  const specificLevel = filterSpecificLevel.value ? parseInt(filterSpecificLevel.value, 10) : null
  return ALL_UNLOCKABLES.value.filter(row => {
    if (filterLevel.value !== 'all') {
      const unlocked = isRowUnlocked(row)
      if (filterLevel.value === 'unlocked' && !unlocked) return false
      if (filterLevel.value === 'locked' && unlocked) return false
    }
    if (filterCategory.value !== 'all') {
      if (filterCategory.value === 'Fundo') {
        if (!row.category.startsWith('Fundo')) return false
      } else {
        if (row.category !== filterCategory.value) return false
      }
    }
    if (specificLevel !== null && !isNaN(specificLevel)) {
      if (row.minLevel !== specificLevel) return false
    }
    return true
  })
})

const sortedLevelKeys = computed(() =>
  Object.keys(levelGroups.value).map(Number).sort((a, b) => a - b),
)
</script>

<template>
  <div class="settings-section" data-tour="settings-appearance">
    <div class="section-heading">
      <div>
        <h2>Aparência</h2>
        <p class="description">Personaliza o aspeto do GamiBook para se adaptar ao teu estilo.</p>
      </div>
      <button class="info-btn" @click="unlockModalOpen = true" title="Ver tabela de desbloqueios" aria-label="Ver tabela de desbloqueios">
        <InformationCircleIcon class="info-btn-icon" aria-hidden="true" />
      </button>
    </div>

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
              :asset-id="user?.avatar"
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
                  :class="{ active: avatarBorder === b.id, locked: !isAvatarOptionUnlocked(b.minLevel) }"
                  :title="isAvatarOptionUnlocked(b.minLevel) ? b.label : `${b.label} — Nível ${b.minLevel}`"
                  :aria-disabled="!isAvatarOptionUnlocked(b.minLevel)"
                  @click="isAvatarOptionUnlocked(b.minLevel) && (avatarBorder = b.id)"
                >
                  <LockClosedIcon v-if="!isAvatarOptionUnlocked(b.minLevel)" class="pill-lock-icon" aria-hidden="true" />
                  {{ b.label }}
                  <span v-if="!isAvatarOptionUnlocked(b.minLevel)" class="pill-lock-level">{{ b.minLevel }}</span>
                </button>
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
                  :class="{ active: avatarColor === c.id, locked: !isAvatarOptionUnlocked(c.minLevel) }"
                  :style="{ background: c.hex }"
                  :title="isAvatarOptionUnlocked(c.minLevel) ? c.label : `${c.label} — Nível ${c.minLevel}`"
                  :aria-disabled="!isAvatarOptionUnlocked(c.minLevel)"
                  @click="isAvatarOptionUnlocked(c.minLevel) && (avatarColor = c.id)"
                >
                  <span v-if="!isAvatarOptionUnlocked(c.minLevel)" class="swatch-lock-overlay">
                    <LockClosedIcon class="icon-lock-sm" aria-hidden="true" />
                    <span class="lock-level">{{ c.minLevel }}</span>
                  </span>
                </button>
              </div>
            </div>

            <div class="av-group">
              <span class="av-label">Efeito</span>
              <div class="av-pills">
                <button
                  v-for="e in EFFECT_OPTIONS"
                  :key="e.id"
                  class="av-pill"
                  :class="{ active: avatarEffect === e.id, locked: !isAvatarOptionUnlocked(e.minLevel) }"
                  :title="isAvatarOptionUnlocked(e.minLevel) ? e.label : `${e.label} — Nível ${e.minLevel}`"
                  :aria-disabled="!isAvatarOptionUnlocked(e.minLevel)"
                  @click="isAvatarOptionUnlocked(e.minLevel) && (avatarEffect = e.id)"
                >
                  <LockClosedIcon v-if="!isAvatarOptionUnlocked(e.minLevel)" class="pill-lock-icon" aria-hidden="true" />
                  {{ e.label }}
                  <span v-if="!isAvatarOptionUnlocked(e.minLevel)" class="pill-lock-level">{{ e.minLevel }}</span>
                </button>
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

  <!-- Modal de desbloqueios -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="unlockModalOpen" class="unlock-modal-overlay" @click.self="unlockModalOpen = false">
        <div class="unlock-modal" role="dialog" aria-modal="true" aria-label="Desbloqueios por nível">
          <div class="unlock-modal__header">
            <div>
              <p class="unlock-modal__eyebrow">Aparência</p>
              <h3>Desbloqueios por nível</h3>
            </div>
          </div>

          <div class="unlock-modal__filters">
            <UiSelect
              :model-value="filterCategory"
              :options="categoryOptions"
              @update="filterCategory = $event as string"
            />
            <div class="filter-pills">
              <button class="filter-pill" :class="{ active: filterLevel === 'all' }" @click="filterLevel = 'all'">Todos</button>
              <button class="filter-pill" :class="{ active: filterLevel === 'unlocked' }" @click="filterLevel = 'unlocked'">Desbloqueados</button>
              <button class="filter-pill" :class="{ active: filterLevel === 'locked' }" @click="filterLevel = 'locked'">Bloqueados</button>
            </div>
          </div>

          <div class="unlock-modal__body">
            <template v-if="sortedLevelKeys.length">
              <div v-for="level in sortedLevelKeys" :key="level" class="level-group">
                <div class="level-group-header" :class="{ 'level-group-header--done': levelUnlocked(level) }">
                  <component
                    :is="levelUnlocked(level) ? LockOpenIcon : LockClosedIcon"
                    class="level-group-icon"
                    aria-hidden="true"
                  />
                  <span>Nível {{ level }}</span>
                  <span class="level-group-count">{{ (levelGroups[level] ?? []).length }}</span>
                </div>
                <div class="level-group-items">
                  <div
                    v-for="item in (levelGroups[level] ?? [])"
                    :key="item.category + item.label"
                    class="unlock-item"
                    :class="{ 'unlock-item--done': isRowUnlocked(item) }"
                  >
                    <!-- Visual preview -->
                    <div class="unlock-visual">
                      <span
                        v-if="item.hex"
                        class="unlock-color-swatch"
                        :style="{ background: item.hex }"
                      />
                      <span
                        v-else-if="item.gradVar"
                        class="unlock-grad-swatch"
                        :style="{ background: `var(${item.gradVar})` }"
                      />
                      <div
                        v-else
                        class="unlock-icon-box"
                        :style="{ background: isRowUnlocked(item) ? getCategoryColor(item.category) : 'var(--color-wild-400)' }"
                      >
                        <component :is="getCategoryIcon(item.category)" class="unlock-cat-icon" aria-hidden="true" />
                      </div>
                    </div>
                    <!-- Info -->
                    <div class="unlock-info">
                      <span class="unlock-name">{{ item.label }}</span>
                      <span class="unlock-cat-tag">{{ item.category }}</span>
                    </div>
                    <!-- Status -->
                    <component
                      :is="isRowUnlocked(item) ? LockOpenIcon : LockClosedIcon"
                      class="unlock-status-icon"
                      :class="{ 'unlock-status-icon--done': isRowUnlocked(item) }"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
            </template>
            <p v-else class="unlock-empty">Nenhum item com esses filtros.</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.settings-section {
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: var(--space-400);
  max-width: 100%;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-300);
}

.info-btn {
  margin-left: auto;
  align-self: flex-start;
}

.info-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 3px 3px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
  margin-top: 4px;
}

.info-btn:hover {
  background: var(--color-deep-100);
  transform: translateY(-1px);
}

.info-btn:active {
  transform: translate(1px, 2px);
  box-shadow: 1px 1px 0 var(--color-shadow);
}

.info-btn-icon {
  width: 20px;
  height: 20px;
  color: var(--color-deep-700);
  stroke-width: 2;
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
  grid-template-columns: minmax(7.5rem, 8.75rem) minmax(0, 1fr);
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
  min-width: 0;
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

.av-pill.locked {
  opacity: 0.55;
  cursor: not-allowed;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.av-pill.locked:hover {
  background: var(--color-wild-100);
}

.av-pill.locked:active {
  transform: none;
  box-shadow: 2px 2px 0 var(--color-deep-300);
}

.pill-lock-icon {
  width: 11px;
  height: 11px;
  stroke-width: 2.5;
  flex-shrink: 0;
}

.pill-lock-level {
  font-size: 9px;
  font-weight: 800;
  background: var(--color-wild-300);
  padding: 1px 4px;
  border-radius: 999px;
  line-height: 1;
}

.av-swatch.locked {
  cursor: not-allowed;
  opacity: 0.6;
  position: relative;
}

.av-swatch.locked:hover {
  outline-color: transparent;
  outline-offset: 0;
}

.swatch-lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: rgba(232, 245, 244, 0.6);
  backdrop-filter: blur(2px);
  border-radius: 50%;
}

.icon-lock-sm {
  width: 12px;
  height: 12px;
  color: var(--color-deep-800);
  stroke-width: 2.5;
}

.av-group--save {
  padding-bottom: 0;
  display: flex;
}

.av-group--save :deep(.ui-button) {
  width: fit-content;
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(3.5rem, 4rem));
  gap: var(--space-200);
}

.bg-btn {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-200);
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

/* ── Modal de desbloqueios ───────────────────────────── */

.unlock-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(10, 20, 25, 0.65);
  display: grid;
  place-items: center;
  padding: clamp(16px, 4vw, 32px);
}

.unlock-modal {
  width: min(600px, 100%);
  max-height: 88vh;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 20px;
  box-shadow: 8px 8px 0 var(--color-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.unlock-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-300);
  padding: 22px 24px 14px;
  border-bottom: 2px solid var(--color-wild-400);
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-300);
}


.unlock-modal__eyebrow {
  margin: 0 0 4px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-deep-600);
  font-weight: 800;
}

.unlock-modal__header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  font-family: var(--font-display);
  color: var(--color-mirage-800);
}

.unlock-modal__filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-250, 10px);
  padding: var(--space-300) var(--space-400);
  border-bottom: 2px solid var(--color-wild-400);
  flex-shrink: 0;
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-150);
}

.cat-chip {
  padding: 4px 12px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-base);
  color: var(--color-mirage-600);
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}

.cat-chip:hover {
  background: var(--color-wild-200);
}

.cat-chip--active {
  background: var(--color-deep-100);
  border-color: var(--color-deep-600);
  color: var(--color-deep-700);
  box-shadow: 2px 2px 0 var(--color-deep-300);
}

.unlock-modal__body {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: var(--space-300) var(--space-400) var(--space-400);
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}

/* Level groups */
.level-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
}

.level-group-header {
  display: flex;
  align-items: center;
  gap: var(--space-150);
  padding: 6px 10px;
  border-radius: var(--radius-200);
  background: var(--color-wild-300);
  border: 1.5px solid var(--color-wild-500);
  opacity: 0.6;
}

.level-group-header--done {
  background: var(--color-deep-100);
  border-color: var(--color-deep-300);
  opacity: 1;
}

.level-group-icon {
  width: 13px;
  height: 13px;
  stroke-width: 2.5;
  color: var(--color-mirage-400);
  flex-shrink: 0;
}

.level-group-header--done .level-group-icon {
  color: var(--color-deep-600);
}

.level-group-header span {
  font-size: 11px;
  font-weight: 800;
  font-family: var(--font-display);
  color: var(--color-mirage-500);
  flex: 1;
}

.level-group-header--done span {
  color: var(--color-deep-700);
}

.level-group-count {
  font-size: 10px !important;
  font-weight: 700 !important;
  background: var(--color-wild-400);
  color: var(--color-mirage-500) !important;
  padding: 1px 7px;
  border-radius: 999px;
  flex: 0 !important;
}

.level-group-header--done .level-group-count {
  background: var(--color-deep-200);
  color: var(--color-deep-700) !important;
}

.level-group-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
  padding-left: var(--space-200);
}

/* Unlock items */
.unlock-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 2px solid var(--color-wild-400);
  background: var(--color-wild-200);
  opacity: 0.5;
  transition: background 0.12s ease;
}

.unlock-item--done {
  opacity: 1;
  border-color: var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.unlock-item--done:hover {
  background: var(--color-deep-50, #f0fafa);
}

/* Visual */
.unlock-visual {
  flex-shrink: 0;
}

.unlock-color-swatch {
  display: block;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.unlock-grad-swatch {
  display: block;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.unlock-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  transition: background 0.12s ease;
}

.unlock-cat-icon {
  width: 16px;
  height: 16px;
  color: #fff;
  stroke-width: 2;
}

/* Info */
.unlock-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.unlock-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unlock-item--done .unlock-name {
  color: var(--color-mirage-800);
}

.unlock-cat-tag {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-mirage-400);
}

.unlock-item--done .unlock-cat-tag {
  color: var(--color-deep-600);
}

/* Status icon */
.unlock-status-icon {
  width: 14px;
  height: 14px;
  stroke-width: 2.5;
  color: var(--color-mirage-300);
  flex-shrink: 0;
}

.unlock-status-icon--done {
  color: var(--color-deep-500);
}

.unlock-empty {
  padding: var(--space-500);
  text-align: center;
  font-size: 13px;
  color: var(--color-mirage-500);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .unlock-modal,
.modal-fade-leave-active .unlock-modal {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}

.modal-fade-enter-from .unlock-modal {
  transform: scale(0.92) translateY(12px);
  opacity: 0;
}

.modal-fade-leave-to .unlock-modal {
  transform: scale(0.96) translateY(6px);
  opacity: 0;
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

/* ── Responsive ─────────────────────────────────────── */

@media (max-width: 600px) {
  .section-heading {
    align-items: flex-start;
    flex-direction: row;
  }

  .av-editor {
    grid-template-columns: 1fr;
  }

  .av-preview-box {
    display: flex;
    justify-content: center;
    justify-self: center;
    max-width: 9rem;
    padding: var(--space-400);
  }

  .unlock-modal__filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-pills {
    flex-wrap: wrap;
  }

  .unlock-modal__header {
    padding: 18px 18px 12px;
  }

  .unlock-modal__filters {
    padding: 12px 18px;
  }

  .unlock-row {
    padding: 10px 18px;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .unlock-row__category {
    width: auto;
  }

  .unlock-row__item {
    min-width: 0;
  }

  .unlock-modal__footer {
    padding: 14px 18px;
  }

  .unlock-row__category {
    width: 80px;
  }
}

@media (max-width: 40em) {
  .bg-selector {
    grid-template-columns: repeat(auto-fill, minmax(2.75rem, 3.25rem));
  }

  .av-preview-box {
    max-width: 7.75rem;
  }
}
</style>
