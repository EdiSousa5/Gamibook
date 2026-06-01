<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { loginUser, updateUser } from '../services/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const route = useRoute()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const isLoading = ref(false)

const redirectPath = computed(() => {
  const r = route.query.redirect as string | undefined
  return r && r.startsWith('/') && !r.startsWith('//') ? r : '/app'
})

const isUnlockRedirect = computed(() => redirectPath.value.startsWith('/unlock/'))

const info = computed(() => {
  if (route.query.registered) return 'Conta criada. Faz login para continuar.'
  if (isUnlockRedirect.value) return 'Faz login para desbloquear o teu livro.'
  return ''
})

const sanitizeEmail = (raw: string) => raw.trim().toLowerCase().slice(0, 254)
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)

const submit = async () => {
  error.value = ''
  const cleanEmail = sanitizeEmail(email.value)
  const cleanPassword = password.value.trim()

  if (!cleanEmail) { error.value = 'Preenche o email.'; return }
  if (!isValidEmail(cleanEmail)) { error.value = 'Formato de email inválido.'; return }
  if (!cleanPassword) { error.value = 'Preenche a password.'; return }
  if (cleanPassword.length < 8) { error.value = 'Password demasiado curta (mínimo 8 caracteres).'; return }

  isLoading.value = true
  try {
    const loggedUser = await loginUser(cleanEmail, cleanPassword)
    if (!loggedUser?.id) {
      error.value = 'Credenciais inválidas.'
      return
    }
    updateUser(String(loggedUser.id), { last_login: new Date().toISOString() }).catch(() => {})
    await auth.loadUser()
    await router.push(redirectPath.value)
  } catch {
    error.value = 'Não foi possível iniciar sessão.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section class="auth-layout">
    <UiCard class="card">
      <h1>Login</h1>
      <p class="hint">Bem-vindo de volta! Entra para continuares a tua missão.</p>

      <form @submit.prevent="submit">
        <UiInput label="Email" type="email" placeholder="email@exemplo.com" :model-value="email"
          @update="email = String($event)" />
        <label class="ui-field">
          <span class="label">Password</span>
          <div class="password-wrap">
            <input
              :type="showPassword ? 'text' : 'password'"
              :value="password"
              placeholder="********"
              @input="password = ($event.target as HTMLInputElement).value"
            />
            <button type="button" class="eye-btn" :aria-label="showPassword ? 'Esconder password' : 'Mostrar password'" @click="showPassword = !showPassword">
              <EyeSlashIcon v-if="showPassword" class="eye-icon" aria-hidden="true" />
              <EyeIcon v-else class="eye-icon" aria-hidden="true" />
            </button>
          </div>
        </label>

        <p v-if="info" class="info">{{ info }}</p>
        <p v-if="error" class="error">{{ error }}</p>

        <UiButton class="cta" type="submit" :loading="isLoading">Entrar</UiButton>
      </form>

      <p class="alt">
        Ainda não tens conta?
        <RouterLink to="/register">Regista-te aqui</RouterLink>
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
  width: min(420px, 100%);
}

h1 {
  margin-top: 0;
}

.hint {
  color: var(--color-mirage-600);
}

form {
  display: grid;
  gap: var(--space-400);
  margin-top: var(--space-400);
}

.cta {
  justify-content: center;
  width: 100%;
}

.error {
  color: var(--color-error-strong);
  font-weight: 600;
}

.info {
  color: var(--color-primary-strong);
  font-weight: 600;
}

.alt {
  margin-top: var(--space-400);
  font-size: 14px;
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
