<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerUser } from '../services/directus'

const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')
const avatarPreview = ref('')
const error = ref('')

const onAvatarChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
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
    const createdUser = await registerUser({
      name: name.value,
      email: email.value,
      password: password.value,
      avatar_img: null,
    })
    if (createdUser?.user_id) {
      localStorage.setItem('gb_user_id', String(createdUser.user_id))
    }
    window.dispatchEvent(new Event('gb-auth-changed'))
    await router.push('/dashboard')
  } catch {
    error.value = 'Nao foi possivel criar conta.'
  }
}
</script>

<template>
  <section class="auth">
    <div class="card">
      <h1>Registo</h1>
      <p class="hint">Cria a tua conta e desbloqueia a aventura.</p>

      <form @submit.prevent="submit">
        <label>
          Nome
          <input v-model="name" type="text" placeholder="O teu nome" />
        </label>
        <label>
          Email
          <input v-model="email" type="email" placeholder="email@exemplo.com" />
        </label>
        <label>
          Password
          <input v-model="password" type="password" placeholder="********" />
        </label>
        <label>
          Avatar
          <input type="file" accept="image/*" @change="onAvatarChange" />
        </label>

        <div v-if="avatarPreview" class="avatar">
          <img :src="avatarPreview" alt="Avatar preview" />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button class="btn" type="submit">Criar conta</button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.auth {
  display: grid;
  place-items: center;
}

.card {
  width: min(440px, 100%);
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
  border: 3px solid #0c7a5a;
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
</style>
