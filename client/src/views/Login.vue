<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { loginUser } from '../services/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const route = useRoute()
const email = ref('')
const password = ref('')
const error = ref('')

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
  if (cleanPassword.length < 6) { error.value = 'Password demasiado curta.'; return }

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
  }
}
</script>

<template>
  <section class="auth">
    <UiCard class="card">
      <h1>Login</h1>
      <p class="hint">Entra para continuar a tua missão.</p>

      <form @submit.prevent="submit">
        <UiInput label="Email" type="email" placeholder="email@exemplo.com" :model-value="email"
          @update="email = String($event)" />
        <UiInput label="Password" type="password" placeholder="********" :model-value="password"
          @update="password = String($event)" />

        <p v-if="info" class="info">{{ info }}</p>
        <p v-if="error" class="error">{{ error }}</p>

        <UiButton class="cta" type="submit">Entrar</UiButton>
      </form>

      <p class="alt">
        Ainda não tens conta?
        <RouterLink to="/register">Regista-te aqui</RouterLink>
      </p>
    </UiCard>
  </section>
</template>

<style scoped>
.auth {
  display: grid;
  place-items: center;
}

.card {
  width: min(420px, 100%);
}

form {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.cta {
  justify-content: center;
  width: 100%;
}

.error {
  color: #b13b3b;
  font-weight: 600;
}

.info {
  color: var(--color-primary-strong);
  font-weight: 600;
}

.alt {
  margin-top: 16px;
  font-size: 14px;
}

.alt a {
  color: var(--color-primary-strong);
  font-weight: 600;
  text-decoration: none;
}
</style>
