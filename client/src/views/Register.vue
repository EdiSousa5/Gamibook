<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { loginUser, registerUser, uploadUserAvatar } from '../services/auth'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const auth = useAuthStore()
const { error: toastError, success: toastSuccess } = useToast()
const name = ref('')
const email = ref('')
const password = ref('')
const avatarPreview = ref('')
const avatarFile = ref<File | null>(null)
const error = ref('')
const isLoading = ref(false)

const onAvatarChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  avatarFile.value = file
  const reader = new FileReader()
  reader.onload = () => {
    avatarPreview.value = String(reader.result || '')
  }
  reader.readAsDataURL(file)
}

const sanitizeName = (raw: string) => raw.trim().replace(/[<>"'&]/g, '').slice(0, 100)
const sanitizeEmail = (raw: string) => raw.trim().toLowerCase().slice(0, 254)
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)

const submit = async () => {
  error.value = ''
  const cleanName = sanitizeName(name.value)
  const cleanEmail = sanitizeEmail(email.value)
  const cleanPassword = password.value.trim()

  if (!cleanName || cleanName.length < 2) { error.value = 'Nome inválido (mínimo 2 caracteres).'; return }
  if (!cleanEmail) { error.value = 'Email inválido.'; return }
  if (!isValidEmail(cleanEmail)) { error.value = 'Formato de email inválido.'; return }
  if (!cleanPassword || cleanPassword.length < 8) { error.value = 'Password demasiado curta (mínimo 8 caracteres).'; return }

  isLoading.value = true
  try {
    await registerUser({ name: cleanName, email: cleanEmail, password: cleanPassword })

    let loggedUser = null
    try {
      loggedUser = await loginUser(cleanEmail, cleanPassword)
    } catch {
      // O Directus pode demorar um momento a activar a conta — tenta uma vez mais
      await new Promise((r) => setTimeout(r, 1500))
      try {
        loggedUser = await loginUser(cleanEmail, cleanPassword)
      } catch {
        // Sem sucesso após retry — redireciona para login com aviso
      }
    }

    if (!loggedUser?.id) {
      toastSuccess('Conta criada com sucesso! Por favor, entra com as tuas credenciais.')
      await router.push({ path: '/login', query: { registered: '1' } })
      return
    }

    if (avatarFile.value) {
      try {
        await uploadUserAvatar(String(loggedUser.id), avatarFile.value)
      } catch {
        toastError('Conta criada, mas não foi possível carregar o avatar.')
      }
    }

    await auth.loadUser()
    await router.push('/app')
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.toLowerCase().includes('already')) {
      error.value = 'Já existe uma conta com este email.'
    } else {
      error.value = 'Não foi possível criar conta.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section class="auth-layout">
    <UiCard class="card">
      <h1>Registo</h1>
      <p class="hint">Cria a tua conta e desbloqueia a aventura.</p>

      <form @submit.prevent="submit">
        <UiInput label="Nome" placeholder="O teu nome" :model-value="name" @update="name = String($event)" />
        <UiInput label="Email" type="email" placeholder="email@exemplo.com" :model-value="email"
          @update="email = String($event)" />
        <UiInput label="Password" type="password" placeholder="Mínimo 8 caracteres" :model-value="password"
          @update="password = String($event)" />

        <label class="file">
          Avatar
          <input type="file" accept="image/*" @change="onAvatarChange" />
        </label>

        <div v-if="avatarPreview" class="avatar">
          <img :src="avatarPreview" alt="Avatar preview" />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <UiButton class="cta" type="submit" :loading="isLoading">Criar conta</UiButton>
      </form>

      <p class="alt">
        Já tens conta?
        <RouterLink to="/login">Entra aqui</RouterLink>
      </p>
    </UiCard>
  </section>
</template>

<style scoped>
.auth-layout {
  min-height: calc(100vh - 140px);
  display: grid;
  place-items: center;
  padding: var(--space-400);
}

.card {
  width: min(440px, 100%);
}

h1 {
  margin-top: 0;
}

.hint {
  color: var(--color-mirage-600);
}

form {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.file {
  display: grid;
  gap: 6px;
  font-weight: 600;
}

.file input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
}

.avatar {
  display: grid;
  place-items: center;
  margin-top: 8px;
}

.avatar img {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--color-primary-strong);
}

.cta {
  justify-content: center;
  width: 100%;
}

.error {
  color: var(--color-error-strong);
  font-weight: 600;
}

.alt {
  margin-top: 16px;
  font-size: 14px;
  text-align: center;
}

.alt a {
  color: var(--color-primary-strong);
  font-weight: 600;
  text-decoration: none;
}
</style>
