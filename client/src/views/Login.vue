<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loginUser } from '../services/directus'

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
    await router.push('/dashboard')
  } catch {
    error.value = 'Nao foi possivel iniciar sessao.'
  }
}
</script>

<template>
  <section class="auth">
    <div class="card">
      <h1>Login</h1>
      <p class="hint">Entra para continuar a tua missao.</p>

      <form @submit.prevent="submit">
        <label>
          Email
          <input v-model="email" type="email" placeholder="email@exemplo.com" />
        </label>
        <label>
          Password
          <input v-model="password" type="password" placeholder="********" />
        </label>

        <p v-if="info" class="info">{{ info }}</p>
        <p v-if="error" class="error">{{ error }}</p>

        <button class="btn" type="submit">Entrar</button>
      </form>

      <p class="alt">
        Ainda nao tens conta?
        <RouterLink to="/register">Regista-te aqui</RouterLink>
      </p>
    </div>
  </section>
</template>

<style scoped>
.auth {
  display: grid;
  place-items: center;
}

.card {
  width: min(420px, 100%);
  background: #ffffff;
  padding: 28px;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
}

form {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

label {
  display: grid;
  gap: 6px;
  font-weight: 600;
}

input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d7d7d7;
}

.btn {
  background: #0c7a5a;
  border: none;
  color: #fff;
  padding: 12px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
}

.error {
  color: #b13b3b;
  font-weight: 600;
}

.info {
  color: #0c7a5a;
  font-weight: 600;
}

.alt {
  margin-top: 16px;
  font-size: 14px;
}

.alt a {
  color: #0c7a5a;
  font-weight: 600;
  text-decoration: none;
}
</style>
