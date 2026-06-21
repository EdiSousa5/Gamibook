<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppTopbar from './components/layout/AppTopbar.vue'
import UiButton from './components/ui/UiButton.vue'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import LevelUpModal from './components/ui/LevelUpModal.vue'
import BookUnlockModal from './components/ui/BookUnlockModal.vue'
import OnboardingTour, { type TourStep } from './components/OnboardingTour.vue'
import UiToast from './components/ui/UiToast.vue'
import { useToast } from './composables/useToast'
import { useAuthStore } from './stores/auth'
import { useNotificationsStore } from './stores/notifications'
import { storeToRefs } from 'pinia'
import type { Book } from './types'
import { setUnauthorizedHandler, getAssetUrl } from './services/client'
import { updateUser } from './services/auth'
import { fetchBook } from './services/books'
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

const DEMO_BOOK_ID = 14
const demoCoverUrl = ref<string | undefined>(undefined)

const handleBookUnlocked = (book: Book) => {
  unlockedBook.value = book
  unlockVisible.value = true
}

const navItems = computed(() => {
  if (isAdmin.value) {
    return [
      { label: 'Painel Admin', to: '/admin', icon: 'home', exact: true },
      { label: 'Gerir Livros', to: '/exercise-generator', icon: 'books', dataTour: 'nav-generate' },
      { label: 'Guia de utilização', to: '/admin/guide', icon: 'guide', dataTour: 'nav-guide' },
      { label: 'Definições', to: '/settings', icon: 'settings' },
      { label: 'UI Kit', to: '/ui-kit', icon: 'ui' },
    ]
  }
  return [
    { label: 'Página Principal', to: '/app', icon: 'home' },
    { label: 'Classificação', to: '/leaderboard', icon: 'rank' },
    { label: 'Catálogo de Livros', to: '/collection', icon: 'books' },
    { label: 'Ajuda', to: '/help', icon: 'help' },
    { label: 'Definições', to: '/settings', icon: 'settings', dataTour: 'nav-settings' },
  ]
})

// ── Role helpers ─────────────────────────────────────────
const userRole = computed(() => {
  const role = auth.user?.role
  const name = typeof role === 'string' ? role : (typeof role === 'object' && role ? role.name : null)
  return name?.trim().toLowerCase() ?? null
})

const isEditorRole = computed(() =>
  userRole.value !== null && ['editora', 'autor'].includes(userRole.value),
)

// ── Onboarding steps ─────────────────────────────────────
const USER_STEPS: TourStep[] = [
  {
    hero: true,
    title: 'Bem-vindo!',
    description: 'Aprende para além das páginas do livro — responde exercícios, ganha XP e sobe de nível. Vamos mostrar-te como funciona em menos de um minuto!',
    route: '/app',
  },
  {
    selector: '[data-tour="sidebar"]',
    title: 'Barra de Navegação',
    description: 'O teu ponto de partida. Navega entre a Página Principal, Classificação, Catálogo de Livros, Ajuda e Definições.',
    placement: 'right',
    route: '/app',
    spotlightRadius: '0px',
  },
  {
    selector: '[data-tour="profile-head"]',
    title: 'O Teu Perfil',
    description: 'O teu nível, XP acumulado, streak diário e estatísticas pessoais — tudo cresce automaticamente à medida que completas exercícios.',
    placement: 'bottom',
    route: '/app',
    spotlightRadius: '14px',
  },
  {
    selector: '[data-tour="daily"]',
    title: 'Desafio Diário',
    description: 'Uma nova pergunta todos os dias! Responde para manter o streak ativo e ganhar XP extra. Desbloqueias ao atingir o nível 3.',
    placement: 'top',
    route: '/app',
    spotlightRadius: '20px',
  },
  {
    selector: '[data-tour="topbar-qr"]',
    title: 'Desbloquear um Livro',
    description: 'Usa o botão QR para leres o código do teu livro físico e adicioná-lo à coleção. Peça o código ao teu professor ou escola.',
    placement: 'bottom',
    route: '/app',
    demoType: 'qr-unlock',
    spotlightRadius: '12px',
  },
  {
    selector: '[data-tour="collection-owned"]',
    title: 'A Tua Coleção',
    description: 'Aqui estão os livros que já tens. O "GamiBook — Guia da Plataforma" já está disponível — carrega nele para explorares módulos, exercícios e badges!',
    placement: 'bottom',
    route: '/collection',
    spotlightRadius: '8px',
  },
  {
    selector: '[data-tour="collection-missing"]',
    title: 'Livros que Não Tens',
    description: 'Estes livros ainda não estão na tua coleção. Para os desbloquear, pede o código QR ao teu professor ou escola e usa o botão QR no topo.',
    placement: 'top',
    route: '/collection',
    spotlightRadius: '8px',
  },
  {
    selector: '[data-tour="book-hero"]',
    title: 'Página do Livro',
    description: 'Cada livro mostra o teu progresso, percurso de badges e acesso a todos os módulos. Experimenta o "GamiBook — Guia da Plataforma"!',
    placement: 'bottom',
    route: '/book/14',
    noScroll: true,
    routeDelay: 1200,
    spotlightRadius: '0px',
  },
  {
    hero: true,
    title: 'Responder Exercícios',
    description: 'Em cada módulo encontras perguntas de escolha múltipla e verdadeiro/falso. Responde corretamente para ganhares XP!',
    route: '/book/14',
    demoType: 'exercise',
  },
  {
    selector: '[data-tour="book-badges"]',
    title: 'Sistema de Badges',
    description: 'Ao completares módulos, sobres de tier: Bronze (25%) → Silver (50%) → Gold (75%) → Diamond (100%). Ao atingir Diamond, desbloqueias o Quiz Final para tentares o Galaxy!',
    placement: 'bottom',
    route: '/book/14',
    spotlightRadius: '16px',
  },
  {
    selector: '[data-tour="book-modules"]',
    title: 'Módulos',
    description: 'Os exercícios estão divididos em módulos por tema. Completa-os todos para avançar no percurso de badges e subir de nível.',
    placement: 'top',
    route: '/book/14',
    spotlightRadius: '16px',
  },
  {
    selector: '[data-tour="book-quiz"]',
    title: 'Quiz Final & Modo Livre',
    description: 'Ao atingir o Diamond, o Quiz Final com 10 perguntas fica disponível aqui. Também podes aceder ao Modo Livre para rever todos os exercícios sem pontuação.',
    placement: 'top',
    route: '/book/14',
    spotlightRadius: '16px',
  },
  {
    selector: '[data-tour="leaderboard-main"]',
    title: 'Classificação',
    description: 'Compara-te com todos os outros utilizadores. Ganha XP nos exercícios para subires no ranking — por semana, mês, ano ou desde sempre.',
    placement: 'bottom',
    route: '/leaderboard',
    noScroll: true,
    spotlightRadius: '0px',
  },
  {
    selector: '[data-tour="help-hero"]',
    title: 'Centro de Ajuda',
    description: 'Tens dúvidas sobre como funciona a plataforma? Aqui encontras respostas a todas as perguntas frequentes.',
    placement: 'bottom',
    route: '/help',
    noScroll: true,
    spotlightRadius: '0px',
  },
  {
    selector: '[data-tour="nav-settings"]',
    title: 'Definições',
    description: 'Nas definições podes editar a tua conta, dados pessoais, notificações, aparência e preferências de privacidade.',
    placement: 'right',
    route: '/settings/conta',
    spotlightRadius: '12px',
  },
  {
    selector: '[data-tour="settings-appearance"]',
    title: 'Personalização',
    description: 'Personaliza o teu avatar e o fundo da plataforma. Novos temas e molduras desbloqueiam automaticamente à medida que sobes de nível!',
    placement: 'top',
    route: '/settings/aparencia',
    spotlightRadius: '16px',
  },
  {
    title: 'Estás pronto para começar!',
    description: 'Explora o catálogo, responde exercícios, conquista badges e sobe no ranking. Boa sorte na tua jornada!',
    route: '/app',
  },
]

const ADMIN_STEPS: TourStep[] = [
  {
    title: 'Bem-vindo ao Painel de Gestão!',
    description: 'Como editor ou autor, tens acesso a ferramentas exclusivas para criares e gerires conteúdo. Vamos fazer uma visita rápida!',
    route: '/admin',
  },
  {
    selector: '[data-tour="sidebar"]',
    title: 'Navegação de Gestão',
    description: 'A tua barra de navegação. Tens acesso ao Painel Admin, Gerador de Exercícios, Guia de Utilização e Definições.',
    placement: 'right',
    route: '/admin',
  },
  {
    selector: '[data-tour="nav-generate"]',
    title: 'Gerador de Exercícios',
    description: 'A tua principal ferramenta. Clica aqui para gerar exercícios com IA para qualquer módulo.',
    placement: 'right',
    route: '/admin',
  },
  {
    selector: '[data-tour="generator-workspace"]',
    title: 'Como Funciona o Gerador',
    description: 'Seleciona um livro, escolhe os módulos que precisam de exercícios e configura os parâmetros. A IA gera e tu aprovais.',
    placement: 'bottom',
    route: '/exercise-generator',
  },
  {
    selector: '[data-tour="nav-guide"]',
    title: 'Guia de Utilização',
    description: 'Tens dúvidas? O guia explica todo o processo de criação e aprovação de exercícios com exemplos detalhados.',
    placement: 'right',
    route: '/admin',
  },
  {
    title: 'Pronto para criar conteúdo!',
    description: 'Começa pelo Gerador de Exercícios, revê o que foi gerado e publica o melhor conteúdo. Bom trabalho!',
    route: '/admin',
  },
]

// ── Onboarding visibility ────────────────────────────────
const showUserOnboarding = computed(() => {
  if (!isAuthed.value || isAdmin.value || showLanding.value) return false
  if (!auth.user?.id) return false
  return auth.user.onboarding_completed === false
})

const showAdminOnboarding = computed(() => {
  if (!isAuthed.value || !isEditorRole.value || showLanding.value) return false
  if (!auth.user?.id) return false
  return auth.user.onboarding_completed === false
})

const showOnboarding = computed(() => showUserOnboarding.value || showAdminOnboarding.value)

const onboardingSteps = computed(() =>
  isEditorRole.value ? ADMIN_STEPS : USER_STEPS,
)

async function completeOnboarding() {
  const userId = auth.user?.id ? String(auth.user.id) : null
  if (!userId) return
  try {
    await updateUser(userId, { onboarding_completed: true })
    if (auth.user) auth.user.onboarding_completed = true
  } catch { /* silent */ }
}

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

watch(showOnboarding, (active) => {
  if (active && !demoCoverUrl.value) {
    fetchBook(DEMO_BOOK_ID).then(book => {
      if (book?.cover_img) demoCoverUrl.value = getAssetUrl(book.cover_img)
    }).catch(() => { /* silent */ })
  }
})

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
    if (!newLevel || !oldLevel || newLevel <= oldLevel || auth.isInitialLoad) return
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
  <OnboardingTour v-if="showOnboarding" :steps="onboardingSteps" :demo-cover-url="demoCoverUrl" @done="completeOnboarding" />

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
  <div class="skip-links" aria-label="Navegação rápida">
    <a class="skip-link" href="#main-content">Saltar para o conteúdo principal</a>
    <a class="skip-link" href="#main-nav">Saltar para a navegação</a>
  </div>

  <div class="app" :class="{ 'layout-landing': showLanding }">
    <template v-if="isAuthed && !showLanding">
      <AppSidebar :items="navItems" :username="displayName" :avatar-asset-id="avatarAssetId" :open="mobileNavOpen" @action="onNavClick" @close="mobileNavOpen = false" />
      <div class="content">
        <AppTopbar :username="displayName" :avatar-asset-id="avatarAssetId" :level="progress.level"
          :progress-value="progress.progress" :progress-total="progress.nextLevelXp"

          :is-admin="isAdmin" :mobile-nav-open="mobileNavOpen" @action="onNavClick" @book-unlocked="handleBookUnlocked" @toggle-nav="mobileNavOpen = !mobileNavOpen" />

        <main id="main-content" class="main">
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
/* ── Skip links ─────────────────────────────────────── */
.skip-links {
  position: fixed;
  top: -100px;
  left: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
}

.skip-link {
  display: inline-block;
  padding: 8px 16px;
  background: var(--color-deep-700);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: var(--font-base);
  border-radius: 8px;
  text-decoration: none;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  opacity: 0;
  pointer-events: none;
  transition: top 0.15s ease, opacity 0.15s ease;
}

.skip-link:focus {
  top: 0;
  opacity: 1;
  pointer-events: auto;
  position: static;
}

/* ── Font size ───────────────────────────────────────── */
html[data-font-size="large"] {
  zoom: 1.125;
}

html[data-font-size="xl"] {
  zoom: 1.25;
}

/* ── Color blindness filters ─────────────────────────── */
html[data-color-mode="deuteranopia"] .app {
  filter: url('#cb-deuteranopia');
}

html[data-color-mode="protanopia"] .app {
  filter: url('#cb-protanopia');
}

html[data-color-mode="tritanopia"] .app {
  filter: url('#cb-tritanopia');
}

/* ── Alto Contraste ──────────────────────────────────── */
/* Aplicado no body (camada acima de .app) para não entrar
   em conflito com os filtros SVG de daltonismo em .app */
html[data-contrast="high"] body {
  filter: contrast(1.3) saturate(0.85);
}

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
