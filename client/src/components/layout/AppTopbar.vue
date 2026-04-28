<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { BrowserQRCodeReader } from '@zxing/browser'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiSearch from '@/components/ui/UiSearch.vue'
import UiPillButton from '@/components/ui/UiPillButton.vue'
import { ArrowUturnLeftIcon, BellIcon, ChevronDownIcon, QrCodeIcon, CameraIcon, ArrowUpTrayIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { fetchBookByQrCode, checkBookOwnership, unlockBook } from '@/services/books'
import type { Book } from '@/types'

type Props = {
  username: string
  avatarUrl?: string
  level?: number | null
  progressValue?: number
  progressTotal?: number
  isAdmin?: boolean
}

// Only URLs matching /unlock/<uuid> are accepted — raw UUIDs and other URLs are rejected
const UNLOCK_URL_RE = /\/unlock\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

type ScanState = 'idle' | 'scanning' | 'file-mode' | 'processing' | 'already-owned' | 'not-found' | 'error'

const props = defineProps<Props>()
const emit = defineEmits<{ action: [string]; 'book-unlocked': [Book] }>()

const query = ref('')
const menuOpen = ref(false)
const qrOpen = ref(false)
const profileRef = ref<HTMLElement | null>(null)
const canGoBack = ref(false)
const route = useRoute()

const videoRef = ref<HTMLVideoElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const scanState = ref<ScanState>('idle')
const scannedBook = ref<Book | null>(null)
const scanError = ref('')
let scanControls: { stop: () => void } | null = null

const showSearch = computed(() =>
  route.path.startsWith('/collection') || route.path.startsWith('/exercise-generator'),
)
const showBack = computed(() => route.path !== '/app')

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
  const match = text.match(UNLOCK_URL_RE)
  return match?.[1] ?? null
}

const stopScanner = () => {
  scanControls?.stop()
  scanControls = null
}

const processResult = async (rawText: string) => {
  stopScanner()
  const uuid = extractUuid(rawText)
  if (!uuid) {
    scanState.value = 'not-found'
    return
  }

  scanState.value = 'processing'
  try {
    const userId = localStorage.getItem('gb_user_id')
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
  } catch {
    scanState.value = 'error'
    scanError.value = 'Erro ao verificar o código. Tenta novamente.'
  }
}

const startCamera = async (videoEl: HTMLVideoElement) => {
  try {
    const reader = new BrowserQRCodeReader()
    scanControls = await reader.decodeFromVideoDevice(undefined, videoEl, (result) => {
      if (result) processResult(result.getText())
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

const onFileSelected = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!fileInputRef.value) return
  fileInputRef.value.value = ''
  if (!file) return

  scanState.value = 'processing'
  const objectUrl = URL.createObjectURL(file)
  try {
    const reader = new BrowserQRCodeReader()
    const result = await reader.decodeFromImageUrl(objectUrl)
    await processResult(result.getText())
  } catch {
    scanState.value = 'not-found'
  } finally {
    URL.revokeObjectURL(objectUrl)
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
}

const retry = () => {
  scannedBook.value = null
  scanState.value = 'idle'
}

const toggleMenu = () => { menuOpen.value = !menuOpen.value }
const closeMenu = () => { menuOpen.value = false }

const onDocumentClick = (event: MouseEvent) => {
  if (!profileRef.value) return
  if (!profileRef.value.contains(event.target as Node)) closeMenu()
}

const updateCanGoBack = () => {
  if (typeof window === 'undefined') return
  canGoBack.value = window.history.length > 1
}

const goBack = () => {
  if (!canGoBack.value) return
  window.history.back()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  updateCanGoBack()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  stopScanner()
})

watch(() => route.fullPath, updateCanGoBack)
</script>

<template>
  <header class="topbar">
    <div v-if="canGoBack && showBack" class="back">
      <UiPillButton class="back-button" @click="goBack">
        <ArrowUturnLeftIcon class="icon" aria-hidden="true" />
        Voltar para tras
      </UiPillButton>
    </div>
    <div v-else class="back-spacer"></div>
    <div v-if="showSearch" class="search">
      <UiSearch :model-value="query" @update="query = $event" />
    </div>
    <div class="actions">
      <UiIconButton variant="outline" size="lg" aria-label="Notificacoes">
        <BellIcon class="icon" aria-hidden="true" />
      </UiIconButton>
      <UiIconButton v-if="!isAdmin" variant="outline" size="lg" aria-label="Ler QRCode" @click="openQr">
        <QrCodeIcon class="icon" aria-hidden="true" />
      </UiIconButton>
      <div class="profile" ref="profileRef">
        <button class="profile-button" type="button" @click="toggleMenu">
          <UiAvatar :alt="initials" :size="44" :src="avatarUrl" />
          <div v-if="!isAdmin" class="profile-details">
            <div class="level-row">
              <span>Nivel {{ level ?? '-' }}</span>
              <span>{{ progressLabel }}</span>
            </div>
            <div class="level-bar">
              <div class="level-fill" :style="{ width: `${progressPercent}%` }"></div>
            </div>
          </div>
          <ChevronDownIcon class="caret" aria-hidden="true" />
        </button>
        <div v-if="menuOpen" class="profile-menu">
          <RouterLink class="menu-item" to="/settings/conta" @click="closeMenu()">Definicoes</RouterLink>
          <button class="menu-item" type="button" @click="emit('action', 'Sair da conta'); closeMenu()">
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- QR Modal -->
  <div v-if="qrOpen" class="qr-overlay" @click.self="closeQr">
    <div class="qr-modal">
      <div class="qr-header">
        <strong>Ler QR Code</strong>
        <UiPillButton @click="closeQr">Fechar</UiPillButton>
      </div>

      <!-- Mode selection -->
      <div v-if="scanState === 'idle'" class="mode-select">
        <p class="mode-hint">Escolhe como queres ler o código do livro</p>
        <div class="mode-buttons">
          <button class="mode-btn" @click="openCamera">
            <div class="mode-icon-wrap">
              <CameraIcon class="mode-icon" aria-hidden="true" />
            </div>
            <strong>Câmara</strong>
            <span>Usa a câmara do dispositivo</span>
          </button>
          <button class="mode-btn" @click="openFileMode">
            <div class="mode-icon-wrap">
              <ArrowUpTrayIcon class="mode-icon" aria-hidden="true" />
            </div>
            <strong>Ficheiro</strong>
            <span>Carrega uma imagem do PC</span>
          </button>
        </div>
      </div>

      <!-- Camera scanner -->
      <template v-if="scanState === 'scanning' || (scanState === 'processing' && videoRef)">
        <div class="scanner-wrap">
          <video ref="videoRef" class="scanner-video" autoplay muted playsinline />
          <div class="scanner-ui" aria-hidden="true">
            <div class="scanner-corner tl" />
            <div class="scanner-corner tr" />
            <div class="scanner-corner bl" />
            <div class="scanner-corner br" />
            <div class="scanner-line" />
          </div>
          <div v-if="scanState === 'processing'" class="scanner-processing">
            <div class="spinner" />
            <span>A verificar...</span>
          </div>
        </div>
        <p class="scanner-hint">Aponta para o QR Code do livro</p>
        <button class="back-link" @click="retry">
          <ArrowUturnLeftIcon class="back-link-icon" aria-hidden="true" />
          Voltar
        </button>
      </template>

      <!-- File mode -->
      <div v-if="scanState === 'file-mode'" class="file-zone" @click="fileInputRef?.click()">
        <ArrowUpTrayIcon class="file-zone-icon" aria-hidden="true" />
        <strong>Clica para selecionar a imagem</strong>
        <span>PNG, JPG ou WebP com o QR Code visível</span>
        <button class="back-link" @click.stop="retry">
          <ArrowUturnLeftIcon class="back-link-icon" aria-hidden="true" />
          Voltar
        </button>
      </div>

      <!-- Processing from file -->
      <div v-if="scanState === 'processing' && !videoRef?.srcObject" class="scan-result">
        <div class="spinner dark" />
        <strong class="result-title">A verificar...</strong>
      </div>

      <!-- Already owned -->
      <div v-if="scanState === 'already-owned'" class="scan-result">
        <div class="result-icon-wrap result-icon--owned">
          <CheckCircleIcon class="result-icon-svg" aria-hidden="true" />
        </div>
        <strong class="result-title">Já tens este livro!</strong>
        <p class="result-desc">{{ scannedBook?.title }} já está na tua coleção.</p>
        <UiPillButton variant="primary" @click="retry">Ler outro código</UiPillButton>
      </div>

      <!-- Not found / invalid -->
      <div v-if="scanState === 'not-found'" class="scan-result">
        <div class="result-icon-wrap result-icon--error">
          <XCircleIcon class="result-icon-svg" aria-hidden="true" />
        </div>
        <strong class="result-title">Código inválido</strong>
        <p class="result-desc">Este QR Code não corresponde a nenhum livro GamiBook.</p>
        <UiPillButton variant="primary" @click="retry">Tentar novamente</UiPillButton>
      </div>

      <!-- Error -->
      <div v-if="scanState === 'error'" class="scan-result">
        <div class="result-icon-wrap result-icon--warn">
          <ExclamationTriangleIcon class="result-icon-svg" aria-hidden="true" />
        </div>
        <strong class="result-title">Algo correu mal</strong>
        <p class="result-desc">{{ scanError }}</p>
        <UiPillButton variant="primary" @click="retry">Tentar novamente</UiPillButton>
      </div>

      <!-- Hidden file input -->
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        style="display: none"
        @change="onFileSelected"
      />
    </div>
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-400);
  padding: var(--space-400) var(--space-500);
  background: var(--color-wild-100);
  border-bottom: 2px solid var(--color-mirage-800);
  position: sticky;
  top: 0;
  height: var(--topbar-height, 72px);
  z-index: 20;
}

.back { display: flex; align-items: center; }
.back-spacer { width: 160px; }

.back-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-150);
  font-size: 11px;
  padding: 4px 12px;
}

.search { flex: 1; min-width: 220px; }

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-400);
  margin-left: auto;
}

.profile { position: relative; }

.profile-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-200);
  padding: 6px 10px;
  border-radius: 18px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  cursor: pointer;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.profile-details {
  display: grid;
  gap: 4px;
  text-align: left;
}

.level-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-200);
  font-size: 12px;
  color: var(--color-mirage-600);
}

.level-bar {
  width: 160px;
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
}

.profile-menu {
  position: absolute;
  right: 0;
  top: calc(100% + var(--space-200));
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 12px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  min-width: 100%;
  display: grid;
  overflow: hidden;
  z-index: 2;
}

.menu-item {
  padding: var(--space-200) var(--space-300);
  border: none;
  background: transparent;
  text-align: left;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  display: block;
}

.menu-item:hover { background: var(--color-wild-300); }

/* QR Modal */
.qr-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 29, 32, 0.55);
  display: grid;
  place-items: center;
  z-index: 20;
  padding: 16px;
}

.qr-modal {
  width: min(460px, 100%);
  background: var(--color-wild-100);
  border-radius: 20px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 6px 6px 0 var(--color-shadow);
  padding: var(--space-500);
  display: grid;
  gap: var(--space-400);
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
.result-icon--error { background: #fbe1e1; border-color: #b13b3b; }
.result-icon--warn  { background: var(--color-amber-100); border-color: #92400e; }

.result-icon-svg {
  width: 32px;
  height: 32px;
  color: var(--color-mirage-700);
  stroke-width: 1.5;
}

.result-icon--error .result-icon-svg { color: #b13b3b; }
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
</style>
