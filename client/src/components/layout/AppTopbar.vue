<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiSearch from '@/components/ui/UiSearch.vue'
import UiPillButton from '@/components/ui/UiPillButton.vue'
import { ArrowUturnLeftIcon, BellIcon, ChevronDownIcon, QrCodeIcon } from '@heroicons/vue/24/outline'

type Props = {
  username: string
  avatarUrl?: string
  level?: number | null
  progressValue?: number
  progressTotal?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ action: [string] }>()
const query = ref('')
const menuOpen = ref(false)
const qrOpen = ref(false)
const profileRef = ref<HTMLElement | null>(null)
const canGoBack = ref(false)
const route = useRoute()
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

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}

const openQr = () => {
  qrOpen.value = true
}

const closeQr = () => {
  qrOpen.value = false
}

const onDocumentClick = (event: MouseEvent) => {
  if (!profileRef.value) return
  if (!profileRef.value.contains(event.target as Node)) {
    closeMenu()
  }
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
})

watch(
  () => route.fullPath,
  () => {
    updateCanGoBack()
  },
)
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
      <UiIconButton variant="outline" size="lg" aria-label="QRCode" @click="openQr">
        <QrCodeIcon class="icon" aria-hidden="true" />
      </UiIconButton>
      <div class="profile" ref="profileRef">
        <button class="profile-button" type="button" @click="toggleMenu">
          <UiAvatar :alt="initials" :size="44" :src="avatarUrl" />
          <div class="profile-details">
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

  <div v-if="qrOpen" class="qr-overlay" @click.self="closeQr">
    <div class="qr-modal">
      <div class="qr-header">
        <strong>Leitor QR</strong>
        <UiPillButton @click="closeQr">Fechar</UiPillButton>
      </div>
      <div class="qr-body">
        <div class="qr-frame">
          <span>QR</span>
        </div>
        <p>Aponta a camara para ler o codigo.</p>
      </div>
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
  border-radius: 0;
  box-shadow: none;
  border-bottom: 2px solid var(--color-mirage-800);
  position: sticky;
  top: 0;
  height: var(--topbar-height, 72px);
  z-index: 20;
}

.back {
  display: flex;
  align-items: center;
}

.back-spacer {
  width: 160px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-150);
}

.back-button {
  font-size: 11px;
  padding: 4px 12px;
}

.search {
  flex: 1;
  min-width: 220px;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-400);
  margin-left: auto;
}

.profile {
  position: relative;
}

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

.menu-item:hover {
  background: var(--color-wild-300);
}

.qr-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 29, 32, 0.28);
  display: grid;
  place-items: center;
  z-index: 20;
}

.qr-modal {
  width: min(420px, 90vw);
  background: var(--color-wild-100);
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 6px 6px 0 var(--color-shadow);
  padding: var(--space-400);
  display: grid;
  gap: var(--space-300);
}

.qr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
}


.qr-body {
  display: grid;
  gap: var(--space-200);
  text-align: center;
  color: var(--color-mirage-600);
}

.qr-frame {
  width: 180px;
  height: 180px;
  margin: 0 auto;
  border-radius: 16px;
  border: 2px dashed var(--color-mirage-800);
  display: grid;
  place-items: center;
  font-weight: 800;
  color: var(--color-mirage-700);
  background: var(--color-wild-200);
}

.icon {
  width: 20px;
  height: 20px;
  color: var(--color-mirage-800);
  stroke-width: var(--icon-stroke);
}
</style>
