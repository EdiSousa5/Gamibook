<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchUserById, getAssetUrl, updateUser, type User } from '../services/directus'

const user = ref<User | null>(null)
const name = ref('')
const error = ref('')
const isLoading = ref(false)

const stats = computed(() => ({
  points: user.value?.points ?? null,
  level: user.value?.level ?? null,
}))

const avatar = computed(() => getAssetUrl(user.value?.avatar_img))

const loadProfile = async () => {
  const storedId = localStorage.getItem('gb_user_id')
  if (!storedId) {
    user.value = null
    return
  }

  error.value = ''
  isLoading.value = true
  try {
    const me = await fetchUserById(storedId)
    user.value = me
    name.value = me.name || ''
  } catch {
    error.value = 'Nao foi possivel carregar o perfil.'
  } finally {
    isLoading.value = false
  }
}

const saveProfile = async () => {
  error.value = ''
  if (!user.value?.user_id) return
  try {
    user.value = await updateUser(user.value.user_id, {
      name: name.value,
    })
    window.dispatchEvent(new Event('gb-auth-changed'))
  } catch {
    error.value = 'Nao foi possivel guardar o perfil.'
  }
}

onMounted(loadProfile)
</script>

<template>
  <section class="profile">
    <div class="card">
      <h1>Perfil</h1>
      <div class="form">
        <label>
          Nome
          <input v-model="name" type="text" />
        </label>
        <div v-if="avatar" class="avatar">
          <img :src="avatar" alt="Avatar" />
        </div>
        <p v-if="isLoading" class="state">A carregar perfil...</p>
        <p v-else-if="error" class="state error">{{ error }}</p>
        <button class="btn" type="button" @click="saveProfile">Guardar</button>
      </div>
    </div>

    <div class="card">
      <h2>Stats</h2>
      <div class="stats">
        <div>
          <span>Total pontos</span>
          <strong>{{ stats.points ?? '-' }}</strong>
        </div>
        <div>
          <span>Nivel</span>
          <strong>{{ stats.level ?? '-' }}</strong>
        </div>
      </div>
    </div>

  </section>
</template>

<style scoped>
.profile {
  display: grid;
  gap: 24px;
}

.card {
  background: #ffffff;
  padding: 22px;
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}

.form {
  display: grid;
  gap: 12px;
  margin-top: 12px;
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

.avatar img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #0c7a5a;
}

.btn {
  width: fit-content;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  background: #0c7a5a;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.stats div {
  background: #f5faf8;
  padding: 12px;
  border-radius: 12px;
  display: grid;
  gap: 4px;
}

ul {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  gap: 10px;
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-weight: 700;
}

.meta {
  font-size: 12px;
  color: #6f6f6f;
}

.state {
  font-weight: 600;
  color: #6f6f6f;
}

.error {
  color: #b13b3b;
}
</style>
