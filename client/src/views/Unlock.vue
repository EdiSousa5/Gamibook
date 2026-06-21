<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import UiButton from '@/components/ui/UiButton.vue'
import BookUnlockModal from '@/components/ui/BookUnlockModal.vue'
import { redeemActivationCode } from '@/services/books'
import { getStoredUserId } from '@/services/storage'
import type { Book } from '@/types'

type State = 'loading' | 'success' | 'already-owned' | 'already-used' | 'not-found' | 'error'

const route = useRoute()
const router = useRouter()
const state = ref<State>('loading')
const book = ref<Book | null>(null)
const modalVisible = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  const code = route.params.code as string
  const userId = getStoredUserId()
  if (!userId) {
    router.replace({ path: '/login', query: { redirect: `/unlock/${code}` } })
    return
  }

  try {
    const result = await redeemActivationCode(code, userId)

    if (result.status === 'not-found') { state.value = 'not-found'; return }
    if (result.status === 'already-used') { state.value = 'already-used'; return }
    if (result.status === 'already-owned') {
      book.value = result.book!
      state.value = 'already-owned'
      return
    }

    book.value = result.book!
    state.value = 'success'
    modalVisible.value = true
  } catch {
    errorMsg.value = 'Ocorreu um erro ao ativar o código.'
    state.value = 'error'
  }
})

const onModalClose = () => {
  modalVisible.value = false
  if (book.value) {
    router.replace(`/book/${book.value.book_id}`)
  } else {
    router.replace('/app')
  }
}
</script>

<template>
  <div class="unlock-page">

    <!-- Loading -->
    <div v-if="state === 'loading'" class="unlock-card">
      <div class="spinner" />
      <p class="unlock-msg">A verificar o código...</p>
    </div>

    <!-- Already owned -->
    <div v-else-if="state === 'already-owned'" class="unlock-card">
      <div class="status-icon status-icon--owned">
        <CheckCircleIcon class="status-svg" />
      </div>
      <h1 class="unlock-title">Já tens este livro</h1>
      <p class="unlock-msg">
        <strong>{{ book?.title }}</strong> já está na tua coleção.
      </p>
      <UiButton variant="primary" @click="router.replace(`/book/${book!.book_id}`)">Ver livro</UiButton>
    </div>

    <!-- Not found -->
    <div v-else-if="state === 'not-found'" class="unlock-card">
      <div class="status-icon status-icon--error">
        <XCircleIcon class="status-svg" />
      </div>
      <h1 class="unlock-title">Código inválido</h1>
      <p class="unlock-msg">Este código não corresponde a nenhum livro GamiBook.</p>
      <UiButton variant="outline" @click="router.replace('/app')">Voltar ao início</UiButton>
    </div>

    <!-- Already used -->
    <div v-else-if="state === 'already-used'" class="unlock-card">
      <div class="status-icon status-icon--error">
        <XCircleIcon class="status-svg" />
      </div>
      <h1 class="unlock-title">Código já utilizado</h1>
      <p class="unlock-msg">Este código já foi utilizado por outro utilizador.</p>
      <UiButton variant="outline" @click="router.replace('/app')">Voltar ao início</UiButton>
    </div>

    <!-- Error -->
    <div v-else-if="state === 'error'" class="unlock-card">
      <div class="status-icon status-icon--warn">
        <ExclamationTriangleIcon class="status-svg" />
      </div>
      <h1 class="unlock-title">Algo correu mal</h1>
      <p class="unlock-msg">{{ errorMsg }}</p>
      <UiButton variant="outline" @click="router.replace('/app')">Voltar ao início</UiButton>
    </div>

    <BookUnlockModal :visible="modalVisible" :book="book" @close="onModalClose" />
  </div>
</template>

<style scoped>
.unlock-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--space-500);
  background: var(--color-wild-200);
}

.unlock-card {
  display: grid;
  gap: var(--space-400);
  text-align: center;
  justify-items: center;
  padding: 52px 48px;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 24px;
  box-shadow: 6px 6px 0 var(--color-shadow);
  max-width: 420px;
  width: 100%;
}

.status-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  place-items: center;
}

.status-icon--owned { background: var(--color-deep-100); }
.status-icon--error { background: var(--color-error-muted); border-color: var(--color-red-500); }
.status-icon--warn  { background: var(--color-amber-100); border-color: #92400e; }

.status-svg {
  width: 36px;
  height: 36px;
  color: var(--color-mirage-800);
  stroke-width: 1.5;
}

.status-icon--error .status-svg { color: var(--color-error-strong); }
.status-icon--warn  .status-svg { color: #92400e; }

.unlock-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-mirage-800);
  margin: 0;
}

.unlock-msg {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-500);
  line-height: 1.6;
}

.unlock-msg strong {
  color: var(--color-mirage-700);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-wild-400);
  border-top-color: var(--color-deep-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 48em) {
  .unlock-card {
    padding: 32px 24px;
  }
}
</style>
