<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppTopbar from './components/layout/AppTopbar.vue'
import UiButton from './components/ui/UiButton.vue'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import LevelUpModal from './components/ui/LevelUpModal.vue'
import BookUnlockModal from './components/ui/BookUnlockModal.vue'
import UiToast from './components/ui/UiToast.vue'
import { useToast } from './composables/useToast'
import { useAuthStore } from './stores/auth'
import { useNotificationsStore } from './stores/notifications'
import { storeToRefs } from 'pinia'
import type { Book } from './types'
import { setUnauthorizedHandler } from './services/client'
import { DAILY_UNLOCK_LEVEL, LEVELS_WITH_UNLOCKS } from './utils/constants'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const notifStore = useNotificationsStore()
const { toasts, dismiss } = useToast()
const { isAuthed, displayName, isAdmin, progress, levelUpVisible, levelUpOld, levelUpNew, levelUpPoints } = storeToRefs(auth)
const avatarAssetId = computed(() => auth.user?.avatar ?? null)
const mobileNavOpen = ref(false)

const showLanding = computed(() => route.meta.layout === 'landing')
const canGoBack = ref(false)

const unlockVisible = ref(false)
const unlockedBook = ref<Book | null>(null)

const handleBookUnlocked = (book: Book) => {
  unlockedBook.value = book
  unlockVisible.value = true
}

const navItems = computed(() => {
  if (isAdmin.value) {
    return [
      { label: 'Painel Admin', to: '/admin', icon: 'home', exact: true },
      { label: 'Gerar exercícios', to: '/exercise-generator', icon: 'generate' },
      { label: 'Guia de utilização', to: '/admin/guide', icon: 'guide' },
      { label: 'Definições', to: '/settings', icon: 'settings' },
      { label: 'UI Kit', to: '/ui-kit', icon: 'ui' },
    ]
  }
  return [
    { label: 'Página Principal', to: '/app', icon: 'home' },
    { label: 'Classificação', to: '/leaderboard', icon: 'rank' },
    { label: 'Catálogo de Livros', to: '/collection', icon: 'books' },
    { label: 'Ajuda', to: '/help', icon: 'help' },
    { label: 'Definições', to: '/settings', icon: 'settings' },
  ]
})

const onNavClick = async (label: string) => {
  if (label === 'Sair da conta') {
    await auth.logout(router)
  }
}

const updateCanGoBack = () => {
  if (typeof window === 'undefined') return
  canGoBack.value = window.history.length > 1
}

const handleBack = () => {
  if (!canGoBack.value) return
  window.history.back()
}

function applyUserBg() {
  const bg = auth.user?.background_theme || localStorage.getItem('gb_bg') || 'bg-1'
  document.documentElement.setAttribute('data-bg', bg)
}

function clearBg() {
  document.documentElement.removeAttribute('data-bg')
}

function applyAccessibilitySettings() {
  const html = document.documentElement
  const fontSz = localStorage.getItem('gb_a11y_font') || 'normal'
  const colorMd = localStorage.getItem('gb_a11y_color') || 'none'
  const contrastVal = localStorage.getItem('gb_a11y_contrast') || 'normal'
  if (fontSz !== 'normal') html.setAttribute('data-font-size', fontSz)
  if (colorMd !== 'none') html.setAttribute('data-color-mode', colorMd)
  if (contrastVal !== 'normal') html.setAttribute('data-contrast', contrastVal)
}

onMounted(() => {
  applyAccessibilitySettings()
  if (!showLanding.value) applyUserBg()

  setUnauthorizedHandler(() => router.push('/login'))
  auth.loadUser()
  updateCanGoBack()
})

watch(showLanding, (isLanding) => {
  if (isLanding) clearBg()
  else applyUserBg()
})

watch(() => auth.user?.background_theme, () => {
  if (!showLanding.value) applyUserBg()
})

watch(
  () => route.fullPath,
  () => {
    updateCanGoBack()
    mobileNavOpen.value = false
  },
)

watch(
  () => auth.user,
  (user) => {
    if (user?.id) {
      notifStore.load(String(user.id))
    } else {
      notifStore.reset()
    }
  },
  { immediate: true },
)

watch(
  () => auth.user?.level,
  (newLevel, oldLevel) => {
    if (!newLevel || !oldLevel || newLevel <= oldLevel) return
    const userId = auth.user?.id ? String(auth.user.id) : null
    if (!userId) return
    notifStore.add({
      user: userId,
      title: `Nível ${newLevel} atingido!`,
      message: `Subiste do nível ${oldLevel} para o nível ${newLevel}. Continua assim!`,
      type: 'achievement',
    })
    if (newLevel === DAILY_UNLOCK_LEVEL) {
      notifStore.add({
        user: userId,
        title: 'Desafios diários desbloqueados!',
        message: 'Chegaste ao nível 3! Os desafios diários estão agora disponíveis. Completa um por dia para manteres a tua sequência.',
        type: 'new_content',
      })
    }
    if (LEVELS_WITH_UNLOCKS.has(newLevel)) {
      notifStore.add({
        user: userId,
        title: 'Novas customizações desbloqueadas!',
        message: `O nível ${newLevel} trouxe novos itens de personalização. Experimenta-os nas definições de aparência.`,
        type: 'new_content',
      })
    }
  },
)
</script>

<template>
  <!-- Filtros SVG para modos de daltonismo (ocultos) -->
  <svg aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">
    <defs>
      <filter id="cb-deuteranopia" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.700 0.300 0 0 0  0 0.300 0.700 0 0  0 0 0 1 0" />
      </filter>
      <filter id="cb-protanopia" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0" />
      </filter>
      <filter id="cb-tritanopia" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="0.950 0.050 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0" />
      </filter>
    </defs>
  </svg>

  <LevelUpModal :visible="levelUpVisible" :old-level="levelUpOld" :new-level="levelUpNew" :current-points="levelUpPoints" @close="levelUpVisible = false" />
  <BookUnlockModal :visible="unlockVisible" :book="unlockedBook" @close="unlockVisible = false" />

  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast" tag="div" class="toast-list">
        <UiToast
          v-for="t in toasts"
          :key="t.id"
          :type="t.type"
          :title="t.title"
          :message="t.message"
          :duration="t.duration"
          @close="dismiss(t.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
  <div class="app" :class="{ 'layout-landing': showLanding }">
    <template v-if="isAuthed && !showLanding">
      <AppSidebar :items="navItems" :username="displayName" :avatar-asset-id="avatarAssetId" :open="mobileNavOpen" @action="onNavClick" @close="mobileNavOpen = false" />
      <div class="content">
        <AppTopbar :username="displayName" :avatar-asset-id="avatarAssetId" :level="progress.level"
          :progress-value="progress.progress" :progress-total="progress.nextLevelXp"
          :is-admin="isAdmin" :mobile-nav-open="mobileNavOpen" @action="onNavClick" @book-unlocked="handleBookUnlocked" @toggle-nav="mobileNavOpen = !mobileNavOpen" />
        <main class="main">
          <RouterView />
        </main>
      </div>
    </template>
    <template v-else>
      <main class="main landing">
        <div v-if="canGoBack && route.path !== '/'" class="landing-back">
          <UiButton variant="outline" size="sm" class="back-button" @click="handleBack">
            <ArrowLeftIcon class="icon" aria-hidden="true" />
            Voltar para trás
          </UiButton>
        </div>
        <RouterView />
      </main>
    </template>
  </div>
</template>

<style>
/* ── Acessibilidade ──────────────────────────────────── */
html[data-font-size="large"] { zoom: 1.125; }
html[data-font-size="xl"]    { zoom: 1.25; }

html[data-color-mode="deuteranopia"] .app { filter: url('#cb-deuteranopia'); }
html[data-color-mode="protanopia"]   .app { filter: url('#cb-protanopia'); }
html[data-color-mode="tritanopia"]   .app { filter: url('#cb-tritanopia'); }

/* Contraste aplicado no body para não conflituar com filtros SVG em .app */
html[data-contrast="high"] body { filter: contrast(1.3) saturate(0.85); }

/* ── Toast ───────────────────────────────────────────── */
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10000;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

/* ── Animações de entrada/saída ─── */
.toast-enter-active {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}
.toast-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.toast-enter-from {
  transform: translateX(48px);
  opacity: 0;
}
.toast-leave-to {
  transform: translateX(48px);
  opacity: 0;
}
.toast-move {
  transition: transform 0.3s ease;
}
</style>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  --topbar-height: 6rem;
}

@media (max-width: 64em) {
  .app {
    --topbar-height: 4.5rem;
  }
}

.app:not(.layout-landing) {
  flex-direction: row;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.main {
  flex: 1;
  max-width: 1120px;
  width: 100%;
  margin: 0 auto;
  padding: var(--space-400) var(--space-500) var(--space-500);
}

.main.landing {
  padding: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.landing-back {
  display: flex;
  padding: var(--space-400) var(--space-500) 0;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-150);
}

.icon {
  width: 18px;
  height: 18px;
  color: var(--color-mirage-800);
  stroke-width: var(--icon-stroke);
}

@media (max-width: 64em) {
  .app:not(.layout-landing) {
    flex-direction: column;
  }

  /* Topbar é position:fixed no tablet/mobile — offset para não ficar por baixo */
  .content {
    padding-top: var(--topbar-height);
  }

  .main {
    padding: var(--space-400) var(--space-300);
  }
}
</style>
