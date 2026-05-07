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
import { useAuthStore } from './stores/auth'
import { storeToRefs } from 'pinia'
import type { Book } from './types'
import { setUnauthorizedHandler } from './services/client'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const { isAuthed, displayName, isAdmin, avatarUrl, progress, levelUpVisible, levelUpOld, levelUpNew, levelUpPoints } = storeToRefs(auth)

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
      { label: 'Estatísticas', to: '/admin/stats', icon: 'stats' },
      { label: 'Gerar exercicios', to: '/exercise-generator', icon: 'generate' },
      { label: 'Definições', to: '/settings', icon: 'settings' },
      { label: 'UI Kit', to: '/ui-kit', icon: 'ui' },
    ]
  }
  return [
    { label: 'Pagina Principal', to: '/app', icon: 'home' },
    { label: 'Classificacao', to: '/leaderboard', icon: 'rank' },
    { label: 'Catalogo de Livros', to: '/collection', icon: 'books' },
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

onMounted(() => {
  const savedBg = localStorage.getItem('gb_bg')
  if (savedBg) {
    document.documentElement.setAttribute('data-bg', savedBg)
  }

  setUnauthorizedHandler(() => router.push('/login'))
  auth.loadUser()
  updateCanGoBack()
})

watch(
  () => route.fullPath,
  () => {
    updateCanGoBack()
  },
)
</script>

<template>
  <LevelUpModal :visible="levelUpVisible" :old-level="levelUpOld" :new-level="levelUpNew" :current-points="levelUpPoints" @close="levelUpVisible = false" />
  <BookUnlockModal :visible="unlockVisible" :book="unlockedBook" @close="unlockVisible = false" />
  <UiToast />
  <div class="app" :class="{ 'layout-landing': showLanding }">
    <template v-if="isAuthed && !showLanding">
      <AppSidebar :items="navItems" :username="displayName" :avatar-url="avatarUrl" @action="onNavClick" />
      <div class="content">
        <AppTopbar :username="displayName" :avatar-url="avatarUrl" :level="progress.level"
          :progress-value="progress.progress" :progress-total="progress.nextLevelXp"
          :is-admin="isAdmin" @action="onNavClick" @book-unlocked="handleBookUnlocked" />
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
            Voltar para tras
          </UiButton>
        </div>
        <RouterView />
      </main>
    </template>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  --topbar-height: 96px;
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

@media (max-width: 720px) {
  .app:not(.layout-landing) {
    flex-direction: column;
  }

  .main {
    padding: var(--space-400);
  }
}
</style>
