<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BrowserQRCodeReader } from '@zxing/browser'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiPillButton from '@/components/ui/UiPillButton.vue'
import { ArrowUturnLeftIcon, BellIcon, ChevronDownIcon, QrCodeIcon, CameraIcon, ArrowUpTrayIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, TrophyIcon, SparklesIcon, BookOpenIcon, RectangleStackIcon, XMarkIcon, Bars3Icon } from '@heroicons/vue/24/outline'
import type { NotificationType } from '@/types/notification'
import type { Component } from 'vue'
import { fetchBookByQrCode, checkBookOwnership, unlockBook, redeemActivationCode } from '@/services/books'
import { getStoredUserId } from '@/services/storage'
import { useNotificationsStore } from '@/stores/notifications'
import { useAuthStore } from '@/stores/auth'
import NotificationPanel from '@/components/ui/NotificationPanel.vue'
import type { Book } from '@/types'

type Props = {
  username: string
  avatarAssetId?: string | null
  level?: number | null
  progressValue?: number
  progressTotal?: number
  isAdmin?: boolean
  mobileNavOpen?: boolean
}

const UNLOCK_URL_RE = /\/unlock\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ScanState = 'idle' | 'scanning' | 'file-mode' | 'processing' | 'already-owned' | 'not-found' | 'error'
type CodeState = 'idle' | 'processing' | 'already-owned' | 'already-used' | 'not-found' | 'error'

const props = defineProps<Props>()
const emit = defineEmits<{ action: [string]; 'book-unlocked': [Book]; 'toggle-nav': [] }>()

const notifStore = useNotificationsStore()
const authStore = useAuthStore()

const menuOpen = ref(false)
const bellOpen = ref(false)
const qrOpen = ref(false)
const profileRef = ref<HTMLElement | null>(null)
const bellRef = ref<HTMLElement | null>(null)
const route = useRoute()
const router = useRouter()

const videoRef = ref<HTMLVideoElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const scanState = ref<ScanState>('idle')
const scannedBook = ref<Book | null>(null)
const scanError = ref('')
let scanControls: { stop: () => void } | null = null
let cameraStartedAt = 0

const isDraggingOver = ref(false)
let dragCounter = 0

// ── Activation code modal ────────────────────────────────────────────────────
const codeOpen = ref(false)
const codeState = ref<CodeState>('idle')
const codeInput = ref('')
const codeBook = ref<Book | null>(null)
const codeError = ref('')

const openCode = () => {
  codeOpen.value = true
  codeState.value = 'idle'
  codeInput.value = ''
  codeBook.value = null
}

const closeCode = () => {
  codeOpen.value = false
  codeState.value = 'idle'
  codeInput.value = ''
  codeBook.value = null
}

const retryCode = () => {
  codeState.value = 'idle'
  codeInput.value = ''
  codeBook.value = null
}

const submitCode = async () => {
  const code = codeInput.value.trim().toUpperCase()
  if (!code) return
  codeState.value = 'processing'
  try {
    const userId = getStoredUserId()
    if (!userId) {
      codeState.value = 'error'
      codeError.value = 'Sessão expirada. Faz login novamente.'
      return
    }
    const result = await redeemActivationCode(code, userId)
    if (result.status === 'not-found') { codeState.value = 'not-found'; return }
    if (result.status === 'already-used') { codeState.value = 'already-used'; return }
    if (result.status === 'already-owned') { codeBook.value = result.book!; codeState.value = 'already-owned'; return }
    closeCode()
    emit('book-unlocked', result.book!)
    notifStore.add({
      user: userId,
      title: 'Livro desbloqueado!',
      message: `"${result.book!.title}" foi adicionado à tua coleção.`,
      type: 'book_unlocked',
    })
  } catch {
    codeState.value = 'error'
    codeError.value = 'Erro ao verificar o código. Tenta novamente.'
  }
}

const showBack = computed(() => route.path !== '/app')

const getParentRoute = (): string => {
  const path = route.path
  const moduleMatch = path.match(/^\/book\/(\d+)\/module\//)
  if (moduleMatch) return `/book/${moduleMatch[1]}`
  if (path.match(/^\/book\/\d+/)) return '/collection'
  if (path.startsWith('/settings')) return '/app'
  if (path.startsWith('/admin')) return '/app'
  return '/app'
}

const goBack = () => router.push(getParentRoute())

const initials = computed(() => {
  const value = props.username?.trim() || 'U'
  return value.charAt(0).toUpperCase()
})

const progressPercent = computed(() => {
  const total = props.progressTotal ?? 0
  if (!total) return 0
  return Math.min(100, Math.round(((props.progressValue ?? 0) / total) * 100))
})

const progressLabel = computed(() => {
  const value = props.progressValue ?? 0
  const total = props.progressTotal ?? 0
  return `${value}/${total} XP`
})

const extractUuid = (text: string): string | null => {
  const t = text.trim()
  const urlMatch = t.match(UNLOCK_URL_RE)
  if (urlMatch?.[1]) return urlMatch[1]
  if (UUID_RE.test(t)) return t
  return null
}

const stopScanner = () => {
  scanControls?.stop()
  scanControls = null
}

const processResult = async (rawText: string) => {
  stopScanner()
  console.log('[QR] rawText:', JSON.stringify(rawText))
  const uuid = extractUuid(rawText)
  console.log('[QR] uuid extraído:', uuid)
  if (!uuid) {
    scanState.value = 'not-found'
    return
  }

  scanState.value = 'processing'
  try {
    const userId = getStoredUserId()
    if (!userId) {
      scanState.value = 'error'
      scanError.value = 'Sessão expirada. Faz login novamente.'
      return
    }

    const book = await fetchBookByQrCode(uuid)
    if (!book) {
      scanState.value = 'not-found'
      return
    }

    const owned = await checkBookOwnership(userId, book.book_id)
    if (owned) {
      scannedBook.value = book
      scanState.value = 'already-owned'
      return
    }

    await unlockBook(userId, book.book_id)
    closeQr()
    emit('book-unlocked', book)
    notifStore.add({
      user: userId,
      title: 'Livro desbloqueado!',
      message: `"${book.title}" foi adicionado à tua coleção.`,
      type: 'book_unlocked',
    })
  } catch {
    scanState.value = 'error'
    scanError.value = 'Erro ao verificar o código. Tenta novamente.'
  }
}

const startCamera = async (videoEl: HTMLVideoElement) => {
  try {
    cameraStartedAt = Date.now()
    const reader = new BrowserQRCodeReader()
    scanControls = await reader.decodeFromVideoDevice(undefined, videoEl, (result) => {
      if (result && Date.now() - cameraStartedAt >= 1000) processResult(result.getText())
    })
  } catch {
    scanState.value = 'error'
    scanError.value = 'Não foi possível aceder à câmara. Verifica as permissões.'
  }
}

const openCamera = async () => {
  scanState.value = 'scanning'
  await nextTick()
  if (videoRef.value) startCamera(videoRef.value)
}

const openFileMode = () => {
  stopScanner()
  scanState.value = 'file-mode'
  nextTick(() => fileInputRef.value?.click())
}

const decodeQrFromFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = async () => {
      // Tenta vários tamanhos de canvas com pixels nítidos (sem interpolação)
      // para evitar ChecksumException causado por scaling com blur
      const sizes = [img.naturalWidth, 800, 512, 300]
      let lastErr: unknown
      for (const size of sizes) {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')!
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(img, 0, 0, size, size)
          const dataUrl = canvas.toDataURL('image/png')
          const reader = new BrowserQRCodeReader()
          const result = await reader.decodeFromImageUrl(dataUrl)
          URL.revokeObjectURL(objectUrl)
          resolve(result.getText())
          return
        } catch (e) {
          lastErr = e
        }
      }
      URL.revokeObjectURL(objectUrl)
      reject(lastErr)
    }
    img.onerror = (e) => { URL.revokeObjectURL(objectUrl); reject(e) }
    img.src = objectUrl
  })

const onFileSelected = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!fileInputRef.value) return
  fileInputRef.value.value = ''
  if (!file) return

  scanState.value = 'processing'
  try {
    const text = await decodeQrFromFile(file)
    console.log('[QR] decode ok, texto bruto:', JSON.stringify(text))
    await processResult(text)
  } catch (e) {
    console.error('[QR] erro ao ler imagem:', e)
    scanState.value = 'error'
    scanError.value = 'Não foi possível ler o QR Code. Tenta com uma imagem mais nítida.'
  }
}

const onDropZoneDragEnter = (event: DragEvent) => {
  if (!event.dataTransfer?.types.includes('Files')) return
  dragCounter++
  isDraggingOver.value = true
}

const onDropZoneDragLeave = () => {
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDraggingOver.value = false
  }
}

const onDropZoneDrop = async (event: DragEvent) => {
  event.preventDefault()
  dragCounter = 0
  isDraggingOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  scanState.value = 'processing'
  try {
    const text = await decodeQrFromFile(file)
    await processResult(text)
  } catch {
    scanState.value = 'error'
    scanError.value = 'Não foi possível ler o QR Code. Tenta com uma imagem mais nítida.'
  }
}

const openQr = () => {
  qrOpen.value = true
  scanState.value = 'idle'
  scannedBook.value = null
}

const closeQr = () => {
  stopScanner()
  qrOpen.value = false
  scannedBook.value = null
  scanState.value = 'idle'
  isDraggingOver.value = false
  dragCounter = 0
}

const retry = () => {
  scannedBook.value = null
  scanState.value = 'idle'
}

const toggleMenu = () => { menuOpen.value = !menuOpen.value }
const closeMenu = () => { menuOpen.value = false }

const popupIconMap: Record<NotificationType, Component> = {
  achievement: TrophyIcon,
  quiz_ready: SparklesIcon,
  quiz_result: CheckCircleIcon,
  streak_warning: ExclamationTriangleIcon,
  system: BellIcon,
  book_unlocked: BookOpenIcon,
  new_content: RectangleStackIcon,
}

const toggleBell = () => {
  bellOpen.value = !bellOpen.value
  if (bellOpen.value) notifStore.dismissPopup()
}
const closeBell = () => { bellOpen.value = false }

const onDocumentClick = (event: MouseEvent) => {
  if (profileRef.value && !profileRef.value.contains(event.target as Node)) closeMenu()
  if (bellRef.value && !bellRef.value.contains(event.target as Node)) closeBell()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  stopScanner()
})

</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <button
        class="hamburger-btn"
        :aria-expanded="mobileNavOpen"
        aria-label="Abrir menu de navegação"
        @click="emit('toggle-nav')"
      >
        <XMarkIcon v-if="mobileNavOpen" class="icon" aria-hidden="true" />
        <Bars3Icon v-else class="icon" aria-hidden="true" />
      </button>
      <div v-if="showBack" class="back">
        <UiPillButton class="back-button" @click="goBack">
          <ArrowUturnLeftIcon class="icon" aria-hidden="true" />
          <span class="back-label">Voltar para trás</span>
        </UiPillButton>
      </div>
    </div>
    <div class="actions">
      <div class="bell-anchor" ref="bellRef">
        <UiIconButton variant="outline" size="lg" aria-label="Notificações" @click="toggleBell">
          <BellIcon class="icon" aria-hidden="true" />
        </UiIconButton>
        <span v-if="notifStore.unreadCount > 0" class="bell-badge" aria-live="polite">
          {{ notifStore.unreadCount > 9 ? '9+' : notifStore.unreadCount }}
        </span>
        <NotificationPanel :visible="bellOpen" @close="closeBell" />

        <!-- New notification popup -->
        <Transition name="notif-pop">
          <div
            v-if="notifStore.lastAdded && !bellOpen"
            class="notif-popup"
            role="status"
            aria-live="polite"
          >
            <div class="notif-popup__icon" :class="`popup-type--${notifStore.lastAdded.type}`">
              <component :is="popupIconMap[notifStore.lastAdded.type]" class="popup-icon-svg" aria-hidden="true" />
            </div>
            <div class="notif-popup__body">
              <span class="notif-popup__title">{{ notifStore.lastAdded.title }}</span>
              <span class="notif-popup__msg">{{ notifStore.lastAdded.message }}</span>
            </div>
            <UiIconButton size="sm" shape="square" aria-label="Fechar" @click="notifStore.dismissPopup()">
              <XMarkIcon class="popup-close-icon" aria-hidden="true" />
            </UiIconButton>
          </div>
        </Transition>
      </div>
      <span v-if="!isAdmin" data-tour="topbar-qr">
        <UiIconButton variant="outline" size="lg" aria-label="Introduzir código de ativação" @click="openCode">
          <BookOpenIcon class="icon" aria-hidden="true" />
        </UiIconButton>
      </span>
      <div class="profile" ref="profileRef">
        <button class="profile-button" :class="{ 'is-open': menuOpen }" type="button" @click="toggleMenu">
          <UiAvatar
              :alt="initials"
              :size="44"
              :asset-id="avatarAssetId"
              :border="authStore.avatarConfig.border"
              :avatar-color="authStore.avatarConfig.avatarColor"
              :effect="authStore.avatarConfig.effect"
              :shadow="authStore.avatarConfig.shadow"
            />
          <div v-if="!isAdmin" class="profile-details">
            <div class="level-row">
              <span>Nível {{ level ?? '-' }}</span>
              <span>{{ progressLabel }}</span>
            </div>
            <div class="level-bar">
              <div class="level-fill" :style="{ width: `${progressPercent}%` }"></div>
            </div>
          </div>
          <ChevronDownIcon class="caret" aria-hidden="true" />
        </button>
        <div v-if="menuOpen" class="profile-menu">
          <RouterLink class="menu-item" to="/settings/conta" @click="closeMenu()">Definições</RouterLink>
          <button class="menu-item" type="button" @click="emit('action', 'Sair da conta'); closeMenu()">
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Código de Ativação Modal -->
  <UiModal :visible="codeOpen" :close-on-overlay="codeState === 'idle'" @close="closeCode">
    <div class="code-modal-card">

      <!-- Header -->
      <div class="code-modal-header">
        <div class="code-modal-icon-wrap">
          <BookOpenIcon class="code-modal-hdr-icon" aria-hidden="true" />
        </div>
        <div class="code-modal-hdr-text">
          <h3 class="code-modal-title">Código de Ativação</h3>
          <p class="code-modal-subtitle">Desbloqueia o teu livro</p>
        </div>
      </div>

      <!-- Idle: input -->
      <template v-if="codeState === 'idle'">
        <div class="code-modal-body">
          <p class="code-modal-desc">Insere o código presente na fatura de compra do livro.</p>
          <input
            v-model="codeInput"
            class="code-field"
            type="text"
            placeholder="XXXX-XXXX-XXXX"
            autocomplete="off"
            spellcheck="false"
            @keydown.enter="submitCode"
          />
        </div>
        <div class="code-modal-actions">
          <UiButton variant="outline" size="sm" @click="closeCode">Cancelar</UiButton>
          <UiButton variant="primary" size="sm" :disabled="!codeInput.trim()" @click="submitCode">
            Ativar livro
          </UiButton>
        </div>
      </template>

      <!-- Processing -->
      <div v-else-if="codeState === 'processing'" class="code-modal-result">
        <div class="code-result-spinner" />
        <p class="code-result-title">A verificar...</p>
      </div>

      <!-- Already owned -->
      <template v-else-if="codeState === 'already-owned'">
        <div class="code-modal-result">
          <div class="code-result-icon code-result-icon--ok">
            <CheckCircleIcon class="code-result-svg" aria-hidden="true" />
          </div>
          <strong class="code-result-title">Já tens este livro</strong>
          <p class="code-result-desc">{{ codeBook?.title }} já está na tua coleção.</p>
        </div>
        <div class="code-modal-actions">
          <UiButton variant="outline" size="sm" @click="closeCode">Fechar</UiButton>
          <UiButton variant="primary" size="sm" @click="retryCode">Inserir outro código</UiButton>
        </div>
      </template>

      <!-- Already used -->
      <template v-else-if="codeState === 'already-used'">
        <div class="code-modal-result">
          <div class="code-result-icon code-result-icon--error">
            <XCircleIcon class="code-result-svg" aria-hidden="true" />
          </div>
          <strong class="code-result-title">Código já utilizado</strong>
          <p class="code-result-desc">Este código já foi utilizado por outro utilizador.</p>
        </div>
        <div class="code-modal-actions">
          <UiButton variant="outline" size="sm" @click="closeCode">Fechar</UiButton>
          <UiButton variant="primary" size="sm" @click="retryCode">Tentar outro código</UiButton>
        </div>
      </template>

      <!-- Not found -->
      <template v-else-if="codeState === 'not-found'">
        <div class="code-modal-result">
          <div class="code-result-icon code-result-icon--error">
            <XCircleIcon class="code-result-svg" aria-hidden="true" />
          </div>
          <strong class="code-result-title">Código inválido</strong>
          <p class="code-result-desc">Este código não corresponde a nenhum livro GamiBook.</p>
        </div>
        <div class="code-modal-actions">
          <UiButton variant="outline" size="sm" @click="closeCode">Fechar</UiButton>
          <UiButton variant="primary" size="sm" @click="retryCode">Tentar novamente</UiButton>
        </div>
      </template>

      <!-- Error -->
      <template v-else-if="codeState === 'error'">
        <div class="code-modal-result">
          <div class="code-result-icon code-result-icon--warn">
            <ExclamationTriangleIcon class="code-result-svg" aria-hidden="true" />
          </div>
          <strong class="code-result-title">Algo correu mal</strong>
          <p class="code-result-desc">{{ codeError }}</p>
        </div>
        <div class="code-modal-actions">
          <UiButton variant="outline" size="sm" @click="closeCode">Fechar</UiButton>
          <UiButton variant="primary" size="sm" @click="retryCode">Tentar novamente</UiButton>
        </div>
      </template>

    </div>
  </UiModal>
</template>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-300);
  padding: var(--space-400) var(--space-500);
  background: var(--color-wild-100);
  border-bottom: 2px solid var(--color-mirage-800);
  position: sticky;
  top: 0;
  height: var(--topbar-height, 4.5rem);
  z-index: 20;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  min-width: 0;
  flex-shrink: 0;
}

.back { display: flex; align-items: center; }

.hamburger-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-200);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  color: var(--color-mirage-800);
  transition: background 0.15s ease;
}

.hamburger-btn:hover { background: var(--color-wild-300); }

.back-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-150);
  font-size: 0.6875rem;
  padding: var(--space-100) var(--space-300);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  margin-left: auto;
}

.profile {
  position: relative;
  display: inline-flex;
}

.profile-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-200);
  padding: var(--space-150) var(--space-300);
  border-radius: 1.125rem;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  cursor: pointer;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.profile-details {
  display: grid;
  gap: var(--space-100);
  text-align: left;
}

.level-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-200);
  font-size: 0.75rem;
  color: var(--color-mirage-600);
}

.level-bar {
  width: clamp(6rem, 12vw, 10rem);
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
}

.level-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-500));
}

.caret {
  width: 16px;
  height: 16px;
  color: var(--color-mirage-500);
  transition: transform 0.2s ease;
}

.profile-button.is-open .caret {
  transform: rotate(180deg);
}

.profile-menu {
  position: absolute;
  right: 0;
  top: calc(100% + var(--space-200));
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: var(--radius-200);
  box-shadow: 4px 4px 0 var(--color-shadow);
  min-width: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--space-150);
  z-index: 2;
}

.menu-item {
  padding: var(--space-300) var(--space-300);
  border: none;
  border-radius: var(--radius-200);
  background: transparent;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  color: var(--color-mirage-700);
  display: block;
  transition: background 0.1s ease, color 0.1s ease;
}

.menu-item:hover {
  background: var(--color-wild-300);
  color: var(--color-mirage-900);
}

/* ── Activation code modal ─────────────────────────────── */
.code-modal-card {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-900);
  border-radius: var(--radius-400);
  box-shadow: 6px 6px 0 var(--color-shadow);
  padding: var(--space-600);
  width: min(26rem, calc(100vw - 2rem));
  display: flex;
  flex-direction: column;
  gap: var(--space-500);
}

.code-modal-header {
  display: flex;
  align-items: center;
  gap: var(--space-300);
}

.code-modal-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-200);
  background: var(--color-deep-100);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.code-modal-hdr-icon {
  width: 20px;
  height: 20px;
  color: var(--color-deep-700);
  stroke-width: 1.75;
}

.code-modal-hdr-text {
  flex: 1;
  min-width: 0;
}

.code-modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--color-mirage-900);
  font-family: var(--font-display);
  line-height: 1.2;
}

.code-modal-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--color-mirage-500);
  font-weight: 500;
}

.code-modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}

.code-modal-desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-600);
  line-height: 1.5;
}

.code-field {
  width: 100%;
  padding: var(--space-300) var(--space-400);
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  font-family: var(--font-base);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-align: center;
  color: var(--color-mirage-800);
  text-transform: uppercase;
  box-shadow: 4px 4px 0 var(--color-shadow);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing: border-box;
}

.code-field::placeholder {
  color: var(--color-mirage-300);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: none;
}

.code-field:focus {
  border-color: var(--color-deep-600);
  box-shadow: 4px 4px 0 var(--color-deep-200);
}

.code-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-300);
}

.code-modal-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-300);
  text-align: center;
  padding: var(--space-200) 0;
}

.code-result-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-wild-400);
  border-top-color: var(--color-deep-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.code-result-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  place-items: center;
}

.code-result-icon--ok    { background: var(--color-deep-100); }
.code-result-icon--error { background: var(--color-error-muted); border-color: var(--color-red-500); }
.code-result-icon--warn  { background: var(--color-amber-100); border-color: #92400e; }

.code-result-svg {
  width: 28px;
  height: 28px;
  color: var(--color-mirage-700);
  stroke-width: 1.5;
}

.code-result-icon--error .code-result-svg { color: var(--color-error-strong); }
.code-result-icon--warn  .code-result-svg { color: #92400e; }

.code-result-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.code-result-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
  max-width: 17rem;
  line-height: 1.5;
}

/* QR Modal (kept for future use) */
.qr-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 29, 32, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: clamp(1rem, 4vw, 2rem);
}

.qr-modal {
  width: min(28.75rem, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  background: var(--color-wild-100);
  border-radius: 1.25rem;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 6px 6px 0 var(--color-shadow);
  padding: var(--space-500);
  display: grid;
  gap: var(--space-400);
  position: relative;
}

@media (max-width: 64em) {
  .qr-modal {
    width: min(28.75rem, calc(100vw - 1.5rem));
    max-height: calc(100dvh - 1.5rem);
    padding: var(--space-400);
  }
}

@media (max-width: 40em) {
  .qr-modal {
    width: 90%;
    max-width: 320px;
    padding: var(--space-400);
  }

  .mode-buttons {
    grid-template-columns: 1fr;
  }

  .mode-btn {
    padding: var(--space-400);
  }
}

.qr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  font-size: 15px;
}

/* Mode selection */
.mode-select {
  display: grid;
  gap: var(--space-400);
}

.mode-hint {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
  text-align: center;
  line-height: 1.5;
}

.mode-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-400);
}

.mode-btn {
  display: grid;
  gap: var(--space-200);
  justify-items: center;
  text-align: center;
  padding: var(--space-500) var(--space-400);
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.mode-btn:hover {
  transform: translateY(-3px);
  box-shadow: 4px 7px 0 var(--color-shadow);
  background: var(--color-wild-200);
}

.mode-btn:active {
  transform: translateY(2px);
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.mode-btn strong {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.mode-btn span {
  font-size: 12px;
  color: var(--color-mirage-500);
  line-height: 1.4;
}

.mode-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  background: var(--color-deep-100);
  display: grid;
  place-items: center;
}

.mode-icon {
  width: 24px;
  height: 24px;
  color: var(--color-deep-700);
  stroke-width: 1.5;
}

/* Scanner */
.scanner-wrap {
  position: relative;
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  overflow: hidden;
  background: #000;
  aspect-ratio: 1;
  box-shadow: 4px 4px 0 var(--color-shadow);
}

.scanner-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.scanner-ui {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scanner-corner {
  position: absolute;
  width: 24px;
  height: 24px;
  border-color: var(--color-deep-400);
  border-style: solid;
}

.scanner-corner.tl { top: 16px; left: 16px; border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
.scanner-corner.tr { top: 16px; right: 16px; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
.scanner-corner.bl { bottom: 16px; left: 16px; border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
.scanner-corner.br { bottom: 16px; right: 16px; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }

.scanner-line {
  position: absolute;
  left: 16px;
  right: 16px;
  height: 2px;
  background: var(--color-deep-400);
  animation: scan-sweep 2s ease-in-out infinite;
}

@keyframes scan-sweep {
  0%, 100% { top: 20%; opacity: 0.6; }
  50%       { top: 80%; opacity: 1; }
}

.scanner-processing {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.scanner-hint {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-mirage-500);
  text-align: center;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-500);
  cursor: pointer;
  padding: 0;
  justify-self: center;
}

.back-link:hover { color: var(--color-mirage-800); }

.back-link-icon {
  width: 13px;
  height: 13px;
  stroke-width: 2.5;
}

/* File zone */
.file-zone {
  display: grid;
  gap: var(--space-200);
  justify-items: center;
  text-align: center;
  padding: var(--space-600) var(--space-400);
  border-radius: 14px;
  border: 2px dashed var(--color-mirage-800);
  background: var(--color-wild-200);
  cursor: pointer;
  transition: background 0.15s ease;
}

.file-zone:hover { background: var(--color-wild-300); }

.file-zone-icon {
  width: 40px;
  height: 40px;
  color: var(--color-deep-600);
  stroke-width: 1.5;
  margin-bottom: 4px;
}

.file-zone strong {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.file-zone span {
  font-size: 12px;
  color: var(--color-mirage-500);
  line-height: 1.4;
}

/* Result states */
.scan-result {
  display: grid;
  gap: var(--space-300);
  text-align: center;
  justify-items: center;
  padding: var(--space-500) var(--space-300);
}

.result-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  place-items: center;
}

.result-icon--owned { background: var(--color-deep-100); }
.result-icon--error { background: var(--color-error-muted); border-color: var(--color-red-500); }
.result-icon--warn  { background: var(--color-amber-100); border-color: #92400e; }

.result-icon-svg {
  width: 32px;
  height: 32px;
  color: var(--color-mirage-700);
  stroke-width: 1.5;
}

.result-icon--error .result-icon-svg { color: var(--color-error-strong); }
.result-icon--warn  .result-icon-svg { color: #92400e; }

.result-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.result-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
  max-width: 280px;
  line-height: 1.5;
}

/* Drag-and-drop overlay */
.drag-overlay {
  position: absolute;
  inset: 6px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 3px dashed var(--color-deep-500);
  box-shadow:
    inset 0 0 0 5px var(--color-deep-100),
    0 0 0 1px var(--color-deep-300);
  display: grid;
  place-items: center;
  z-index: 10;
  pointer-events: none;
}

.drag-overlay-inner {
  display: grid;
  gap: var(--space-200);
  justify-items: center;
  text-align: center;
}

.drag-overlay-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-deep-500);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  place-items: center;
}

.drag-overlay-icon {
  width: 28px;
  height: 28px;
  stroke-width: 2;
  color: #fff;
}

.drag-overlay-inner strong {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-mirage-900);
}

.drag-overlay-inner span {
  font-size: 12px;
  color: var(--color-mirage-500);
}

.drag-fade-enter-active {
  transition: opacity 0.2s ease;
}
.drag-fade-leave-active {
  transition: opacity 0.18s ease;
}
.drag-fade-enter-from,
.drag-fade-leave-to {
  opacity: 0;
}

/* Spinner */
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.dark {
  border-color: var(--color-wild-400);
  border-top-color: var(--color-deep-500);
}

@keyframes spin { to { transform: rotate(360deg); } }

.icon {
  width: 20px;
  height: 20px;
  color: var(--color-mirage-800);
  stroke-width: var(--icon-stroke);
}

/* ── Bell / Notification ── */
.bell-anchor {
  position: relative;
  display: inline-flex;
}

.bell-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--color-deep-600);
  border: 2px solid var(--color-wild-100);
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  display: grid;
  place-items: center;
  pointer-events: none;
  line-height: 1;
}

/* ── New notification popup ── */
.notif-popup {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  display: flex;
  align-items: flex-start;
  gap: var(--space-200);
  padding: 12px 10px 12px 12px;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 14px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  z-index: 101;
}

@media (max-width: 40em) {
  .notif-popup {
    width: min(280px, calc(100vw - 1rem));
    right: 0;
    left: auto;
  }
}

.notif-popup__icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: grid;
  place-items: center;
}

.popup-type--achievement   { background: var(--color-amber-100); }
.popup-type--quiz_ready    { background: #f3e8ff; }
.popup-type--quiz_result   { background: var(--color-deep-100); }
.popup-type--streak_warning{ background: var(--color-pumpkin-100); }
.popup-type--system        { background: var(--color-wild-400); }
.popup-type--book_unlocked { background: var(--color-deep-100); }
.popup-type--new_content   { background: var(--color-mirage-100); }

.popup-icon-svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  color: var(--color-mirage-700);
}

.popup-type--achievement  .popup-icon-svg { color: var(--color-amber-700); }
.popup-type--quiz_ready   .popup-icon-svg { color: #7c3aed; }
.popup-type--quiz_result  .popup-icon-svg { color: var(--color-deep-600); }
.popup-type--streak_warning .popup-icon-svg { color: var(--color-pumpkin-700); }
.popup-type--book_unlocked .popup-icon-svg { color: var(--color-deep-600); }

.notif-popup__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.notif-popup__title {
  font-size: 12px;
  font-weight: 800;
  color: var(--color-mirage-800);
  font-family: var(--font-display);
  line-height: 1.3;
}

.notif-popup__msg {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-mirage-500);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.popup-close-icon {
  width: 10px;
  height: 10px;
  stroke-width: 2.5;
}

.notif-pop-enter-active {
  animation: notif-pop-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.notif-pop-leave-active {
  animation: notif-pop-in 0.15s ease reverse both;
}
@keyframes notif-pop-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Tablet + Mobile: topbar fixa + hamburger ── */
@media (max-width: 64em) {
  .topbar {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    padding: var(--space-200) var(--space-300);
    gap: var(--space-200);
  }

  .hamburger-btn {
    display: inline-flex;
  }

  .profile-details {
    display: none;
  }
}

/* ── Mobile apenas: back button compacto (só ícone) ── */
@media (max-width: 45em) {
  .back {
    display: flex;
  }

  .back-label {
    display: none;
  }

  .back-button {
    padding: 6px 8px;
  }

  .back-button .icon {
    width: 16px;
    height: 16px;
  }

  .profile-button {
    padding: var(--space-100) var(--space-150);
    gap: var(--space-150);
  }

  .actions {
    gap: var(--space-200);
  }

  .notif-popup {
    width: min(16.25rem, calc(100vw - var(--space-600)));
    right: calc(-1 * var(--space-400));
  }
}

@media (max-width: 25em) {
  .topbar {
    padding: var(--space-150) var(--space-200);
  }

  .actions {
    gap: var(--space-150);
  }
}
</style>
