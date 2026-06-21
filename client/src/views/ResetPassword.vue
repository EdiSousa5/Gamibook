<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { resetPassword } from '../services/auth'

const route = useRoute()
const router = useRouter()

const token = computed(() => route.query.token as string | undefined)
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const isLoading = ref(false)
const success = ref(false)

const submit = async () => {
  error.value = ''
  if (!token.value) {
    error.value = 'Link inválido ou expirado.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'A palavra-passe deve ter pelo menos 8 caracteres.'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'As palavras-passe não coincidem.'
    return
  }
  isLoading.value = true
  try {
    await resetPassword(token.value, password.value)
    success.value = true
    setTimeout(() => router.push({ path: '/login', query: { reset: '1' } }), 2500)
  } catch {
    error.value = 'Link inválido ou expirado. Pede um novo email de recuperação.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section class="auth-layout">
    <UiCard class="card">
      <h1>Nova palavra-passe</h1>

      <template v-if="!token">
        <p class="error-msg">Link inválido ou expirado. Volta ao login e pede um novo email de recuperação.</p>
        <RouterLink to="/login" class="back-link">Voltar ao login</RouterLink>
      </template>

      <template v-else-if="success">
        <p class="success-msg">Palavra-passe alterada com sucesso! A redirecionar para o login...</p>
      </template>

      <template v-else>
        <p class="hint">Escolhe uma nova palavra-passe para a tua conta.</p>
        <form @submit.prevent="submit">
          <UiInput
            label="Nova palavra-passe"
            type="password"
            placeholder="Mínimo 8 caracteres"
            :model-value="password"
            @update="password = String($event)"
          />
          <UiInput
            label="Confirmar palavra-passe"
            type="password"
            placeholder="Repete a nova palavra-passe"
            :model-value="confirmPassword"
            @update="confirmPassword = String($event)"
          />
          <p v-if="error" class="error">{{ error }}</p>
          <UiButton class="cta" type="submit" :loading="isLoading">Guardar palavra-passe</UiButton>
        </form>
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
  display: grid;
  gap: var(--space-400);
}

h1 {
  margin: 0;
  font-size: clamp(1.5rem, 4vw, 2rem);
}

.hint {
  color: var(--color-mirage-600);
  font-size: 0.875rem;
  margin: 0;
}

form {
  display: grid;
  gap: var(--space-400);
}

.cta {
  justify-content: center;
  width: 100%;
}

.error {
  color: var(--color-error-strong);
  font-weight: 600;
  font-size: 0.875rem;
  margin: 0;
}

.error-msg {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-error-strong);
  margin: 0;
}

.success-msg {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary-strong);
  margin: 0;
}

.back-link {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-primary-strong);
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

@media (max-width: 30em) {
  .auth-layout {
    padding: var(--space-400) var(--space-300);
  }

  .card {
    width: 100%;
  }
}
</style>
