<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { loginUser, requestPasswordReset } from '../services/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const route = useRoute()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const isLoading = ref(false)

const showForgot = ref(false)
const forgotEmail = ref('')
const forgotError = ref('')
const forgotSuccess = ref(false)
const isSendingReset = ref(false)

const redirectPath = computed(() => {
  const r = route.query.redirect as string | undefined
  return r && r.startsWith('/') && !r.startsWith('//') ? r : '/app'
})

const isUnlockRedirect = computed(() => redirectPath.value.startsWith('/unlock/'))

const info = computed(() => {
  if (route.query.registered) return 'Conta criada. Faz login para continuar.'
  if (route.query.reset) return 'Palavra-passe alterada com sucesso. Podes entrar.'
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
    await auth.loadUser()
    await router.push(redirectPath.value)
  } catch {
    error.value = 'Não foi possível iniciar sessão.'
  } finally {
    isLoading.value = false
  }
}

const openForgot = () => {
  forgotEmail.value = email.value
  forgotError.value = ''
  forgotSuccess.value = false
  showForgot.value = true
}

const closeForgot = () => {
  showForgot.value = false
  forgotError.value = ''
  forgotSuccess.value = false
}

const submitForgot = async () => {
  forgotError.value = ''
  const cleanEmail = sanitizeEmail(forgotEmail.value)
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    forgotError.value = 'Introduz um email válido.'
    return
  }
  isSendingReset.value = true
  try {
    await requestPasswordReset(cleanEmail)
    forgotSuccess.value = true
  } catch {
    forgotSuccess.value = true
  } finally {
    isSendingReset.value = false
  }
}
</script>

<template>
  <section class="auth-layout">
    <UiCard class="card">

      <!-- Formulário de login -->
      <template v-if="!showForgot">
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

          <button type="button" class="forgot-link" @click="openForgot">Esqueci a palavra-passe</button>

          <p v-if="info" class="info">{{ info }}</p>
          <p v-if="error" class="error">{{ error }}</p>

          <UiButton class="cta" type="submit" :loading="isLoading">Entrar</UiButton>
        </form>

        <p class="alt">
          Ainda não tens conta?
          <RouterLink to="/register">Regista-te aqui</RouterLink>
        </p>
      </template>

      <!-- Formulário de recuperar palavra-passe -->
      <template v-else>
        <h1>Recuperar palavra-passe</h1>
        <p class="hint">Introduz o teu email e enviamos instruções para recuperares o acesso.</p>

        <template v-if="!forgotSuccess">
          <form class="forgot-form" @submit.prevent="submitForgot">
            <UiInput label="Email" type="email" placeholder="email@exemplo.com" :model-value="forgotEmail"
              @update="forgotEmail = String($event)" />
            <p v-if="forgotError" class="error">{{ forgotError }}</p>
            <UiButton class="cta" type="submit" :loading="isSendingReset">Enviar instruções</UiButton>
          </form>
        </template>

        <p v-else class="info">
          Se o email estiver registado, receberás um email com instruções para recuperares a palavra-passe.
        </p>

        <UiButton class="cta" variant="outline" @click="closeForgot">Voltar ao login</UiButton>
      </template>

    </UiCard>
  </section>
</template>

<style scoped>
.auth-layout {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-600) var(--space-400);
}

.card {
  width: min(26.25rem, 100%);
}

h1 {
  margin-top: 0;
  font-size: clamp(1.5rem, 4vw, 2rem);
}

.hint {
  color: var(--color-mirage-600);
  font-size: 0.875rem;
}

form {
  display: grid;
  gap: var(--space-400);
  margin-top: var(--space-400);
}

.forgot-form {
  margin-top: var(--space-400);
}

.cta {
  justify-content: center;
  width: 100%;
}

.error {
  color: var(--color-error-strong);
  font-weight: 600;
  font-size: 0.875rem;
}

.info {
  color: var(--color-primary-strong);
  font-weight: 600;
  font-size: 0.875rem;
  margin-top: var(--space-400);
}

.alt {
  margin-top: var(--space-400);
  font-size: 0.875rem;
}

.alt a {
  color: var(--color-primary-strong);
  font-weight: 600;
  text-decoration: none;
}

.forgot-link {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-mirage-500);
  text-align: left;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.forgot-link:hover {
  color: var(--color-mirage-700);
}


.ui-field {
  display: grid;
  gap: var(--space-150);
  font-weight: 600;
}

.label {
  color: var(--color-mirage-600);
  font-size: 0.75rem;
}

.password-wrap {
  position: relative;
}

.password-wrap input {
  width: 100%;
  padding: var(--space-200) var(--space-300);
  padding-right: 2.75rem;
  border-radius: 0.75rem;
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
  right: 0.625rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: var(--color-mirage-500);
  border-radius: 0.375rem;
  display: grid;
  place-items: center;
  transition: color 0.15s ease;
}

.eye-btn:hover {
  color: var(--color-mirage-800);
}

.eye-icon {
  width: 1.125rem;
  height: 1.125rem;
  stroke-width: 1.8;
}

@media (max-width: 30em) {
  .auth-layout {
    padding: var(--space-400) var(--space-300);
    align-items: center;
  }

  .card {
    width: 100%;
  }
}
</style>
