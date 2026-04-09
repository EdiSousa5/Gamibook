<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  clearAccessToken,
  fetchUserById,
  getUserDisplayName,
  isAdminUser,
  setStoredUserId,
  type User,
} from './services/directus'

const router = useRouter()
const user = ref<User | null>(null)
const isAuthed = computed(() => !!user.value)
const displayName = computed(() => getUserDisplayName(user.value))
const isAdmin = computed(() => isAdminUser(user.value))

const loadUser = async () => {
  const storedId = localStorage.getItem('gb_user_id')
  if (!storedId) {
    user.value = null
    return
  }

  try {
    user.value = await fetchUserById(storedId)
  } catch {
    user.value = null
  }
}

const logout = async () => {
  setStoredUserId(null)
  clearAccessToken()
  user.value = null
  await router.push('/')
}

onMounted(() => {
  loadUser()
  window.addEventListener('gb-auth-changed', loadUser)
})

onUnmounted(() => {
  window.removeEventListener('gb-auth-changed', loadUser)
})
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand" @click="$router.push('/')">GamiBook</div>
      <nav class="nav">
        <template v-if="isAuthed">
          <RouterLink v-if="isAdmin" to="/exercise-generator">Gerar Exercicios</RouterLink>
          <RouterLink to="/rankings">Rankings</RouterLink>
          <RouterLink to="/profile">Perfil</RouterLink>
          <button class="link" @click="logout">Sair</button>
          <span class="hello">Ola, {{ displayName }}</span>
        </template>
        <template v-else>
          <RouterLink to="/">Home</RouterLink>
          <RouterLink to="/login">Login</RouterLink>
          <RouterLink to="/register">Registo</RouterLink>
        </template>
      </nav>
    </header>

    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
:global(body) {
  margin: 0;
  font-family: 'Trebuchet MS', Tahoma, Arial, sans-serif;
  background: radial-gradient(circle at 10% 10%, #f8f4ff, #f1f7ff 45%, #eef7f1);
  color: #151515;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #ffffffcc;
  backdrop-filter: blur(6px);
  border-bottom: 1px solid #e7e7e7;
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.4px;
  cursor: pointer;
}

.nav {
  display: flex;
  align-items: center;
  gap: 14px;
}

.nav a {
  text-decoration: none;
  color: #1c1c1c;
  font-weight: 600;
}

.nav a.router-link-exact-active {
  color: #0c7a5a;
}

.link {
  border: none;
  background: none;
  font: inherit;
  cursor: pointer;
  font-weight: 600;
  color: #b13b3b;
}

.hello {
  font-size: 13px;
  color: #3e3e3e;
}

.main {
  flex: 1;
  padding: 32px 24px 60px;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 720px) {
  .topbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .main {
    padding: 24px 16px 48px;
  }
}
</style>
