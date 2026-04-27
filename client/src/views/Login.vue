<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { loginUser } from '../services/auth'

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const error = ref('')
const info = computed(() => (route.query.registered ? 'Conta criada. Faz login para continuar.' : ''))

const submit = async () => {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Preenche email e password.'
    return
  }

  try {
    const loggedUser = await loginUser(email.value, password.value)
    if (!loggedUser?.id) {
      error.value = 'Credenciais invalidas.'
      return
    }
    window.dispatchEvent(new Event('gb-auth-changed'))
    await router.push('/app')
  } catch {
    error.value = 'Nao foi possivel iniciar sessao.'
  }
}
</script>

<template>
  <section class="auth">
    <UiCard class="card">
      <h1>Login</h1>
      <p class="hint">Entra para continuar a tua missao.</p>

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
        Ainda nao tens conta?
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
