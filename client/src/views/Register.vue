<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { loginUser, registerUser, uploadUserAvatar } from '../services/directus'

const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')
const avatarPreview = ref('')
const avatarFile = ref<File | null>(null)
const error = ref('')

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

const submit = async () => {
  error.value = ''
  if (!name.value || !email.value || !password.value) {
    error.value = 'Preenche todos os campos.'
    return
  }

  try {
    await registerUser({
      name: name.value,
      email: email.value,
      password: password.value,
    })
    let loggedUser = null
    try {
      loggedUser = await loginUser(email.value, password.value)
    } catch (loginError) {
      console.warn('[register] login after registration failed', loginError)
    }

    if (!loggedUser?.id) {
      await router.push({ path: '/login', query: { registered: '1' } })
      return
    }

    if (avatarFile.value) {
      await uploadUserAvatar(String(loggedUser.id), avatarFile.value)
    }
    window.dispatchEvent(new Event('gb-auth-changed'))
    await router.push('/app')
  } catch (err) {
    console.error('[register] failed', err)
    error.value = 'Nao foi possivel criar conta.'
  }
}
</script>

<template>
  <section class="auth">
    <UiCard class="card">
      <h1>Registo</h1>
      <p class="hint">Cria a tua conta e desbloqueia a aventura.</p>

      <form @submit.prevent="submit">
        <UiInput
          label="Nome"
          placeholder="O teu nome"
          :model-value="name"
          @update="name = String($event)"
        />
        <UiInput
          label="Email"
          type="email"
          placeholder="email@exemplo.com"
          :model-value="email"
          @update="email = String($event)"
        />
        <UiInput
          label="Password"
          type="password"
          placeholder="********"
          :model-value="password"
          @update="password = String($event)"
        />
        <label class="file">
          Avatar
          <input type="file" accept="image/*" @change="onAvatarChange" />
        </label>

        <div v-if="avatarPreview" class="avatar">
          <img :src="avatarPreview" alt="Avatar preview" />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <UiButton class="cta" type="submit">Criar conta</UiButton>
      </form>
    </UiCard>
  </section>
</template>

<style scoped>
.auth {
  display: grid;
  place-items: center;
}

.card {
  width: min(440px, 100%);
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
  border: 1px solid #d7d7d7;
  background: #fff;
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
  color: #b13b3b;
  font-weight: 600;
}
</style>
