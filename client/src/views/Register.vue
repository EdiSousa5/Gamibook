<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiFilePicker from '@/components/ui/UiFilePicker.vue'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
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
const showPassword = ref(false)
const error = ref('')
const isLoading = ref(false)

const onAvatarFilePick = (file: File | null) => {
  avatarFile.value = file
  if (!file) { avatarPreview.value = ''; return }
  const reader = new FileReader()
  reader.onload = () => { avatarPreview.value = String(reader.result || '') }
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
        <label class="ui-field">
          <span class="label">Password</span>
          <div class="password-wrap">
            <input
              :type="showPassword ? 'text' : 'password'"
              :value="password"
              placeholder="Mínimo 8 caracteres"
              @input="password = ($event.target as HTMLInputElement).value"
            />
            <button type="button" class="eye-btn" :aria-label="showPassword ? 'Esconder password' : 'Mostrar password'" @click="showPassword = !showPassword">
              <EyeSlashIcon v-if="showPassword" class="eye-icon" aria-hidden="true" />
              <EyeIcon v-else class="eye-icon" aria-hidden="true" />
            </button>
          </div>
        </label>

        <UiFilePicker label="Avatar (opcional)" accept="image/*" :model-value="avatarFile" @update:model-value="onAvatarFilePick" />

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

.ui-field {
  display: grid;
  gap: var(--space-150);
  font-weight: 600;
}

.label {
  color: var(--color-mirage-600);
  font-size: 12px;
}

.password-wrap {
  position: relative;
}

.password-wrap input {
  width: 100%;
  padding: var(--space-200) var(--space-300);
  padding-right: 44px;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  box-sizing: border-box;
  font-size: inherit;
  font-family: inherit;
}

.password-wrap input:focus {
  outline: none;
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.eye-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--color-mirage-500);
  border-radius: 6px;
  display: grid;
  place-items: center;
  transition: color 0.15s ease;
}

.eye-btn:hover {
  color: var(--color-mirage-800);
}

.eye-icon {
  width: 18px;
  height: 18px;
  stroke-width: 1.8;
}
</style>
