<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  fetchBooks,
  fetchUserById,
  fetchUsers,
  getAssetUrl,
  getUserAvatarId,
  getUserDisplayName,
  type Book,
  type User,
} from '../services/directus'

const user = ref<User | null>(null)
const books = ref<Book[]>([])
const ranking = ref<User[]>([])
const error = ref('')

const name = computed(() => getUserDisplayName(user.value))
const avatar = computed(() => getAssetUrl(getUserAvatarId(user.value)))
const displayUserName = (entry?: User | null) => getUserDisplayName(entry)

const stats = computed(() => ({
  points: user.value?.points ?? null,
  level: user.value?.level ?? null,
}))

const loadUser = async () => {
  const storedId = localStorage.getItem('gb_user_id')
  if (!storedId) {
    user.value = null
    return
  }

  user.value = await fetchUserById(storedId)
}

onMounted(async () => {
  error.value = ''
  try {
    const [bookList, topUsers] = await Promise.all([fetchBooks(), fetchUsers(10)])
    books.value = bookList
    ranking.value = topUsers
    await loadUser()
  } catch {
    error.value = 'Nao foi possivel carregar os dados do dashboard.'
  }
})
</script>

<template>
  <section class="dashboard">
    <div class="summary">
      <div class="profile">
        <div class="avatar" :class="{ fallback: !avatar }">
          <img v-if="avatar" :src="avatar" alt="Avatar" />
          <span v-else>{{ name.charAt(0).toUpperCase() }}</span>
        </div>
        <div>
          <h1>Bem-vindo, {{ name }}</h1>
          <p>Continua a tua aventura e desbloqueia novos livros.</p>
        </div>
      </div>
      <div class="stats">
        <div class="stat">
          <span>Pontos</span>
          <strong>{{ stats.points ?? '-' }}</strong>
        </div>
        <div class="stat">
          <span>Nivel</span>
          <strong>{{ stats.level ?? '-' }}</strong>
        </div>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="grid">
      <div class="panel">
        <h2>Livros disponiveis</h2>
        <ul v-if="books.length">
          <li v-for="book in books" :key="book.book_id">
            <div>
              <p class="title">{{ book.title || 'Sem titulo' }}</p>
              <p class="meta">{{ book.publisher || 'Sem editora' }}</p>
            </div>
            <RouterLink :to="`/book/${book.book_id}`" class="action">
              Abrir
            </RouterLink>
          </li>
        </ul>
        <p v-else class="empty">Sem livros disponiveis.</p>
      </div>

      <div class="panel">
        <h2>Ranking top 10</h2>
        <ol v-if="ranking.length">
          <li v-for="rankUser in ranking" :key="rankUser.id || rankUser.email || rankUser.name">
            <span>{{ displayUserName(rankUser) }}</span>
            <strong>{{ rankUser.points ?? '-' }}</strong>
          </li>
        </ol>
        <p v-else class="empty">Sem ranking disponivel.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: 28px;
}

.summary {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
  display: grid;
  gap: 20px;
}

.profile {
  display: flex;
  gap: 16px;
  align-items: center;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: #0c7a5a;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 22px;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.stat {
  background: #f5faf8;
  border-radius: 14px;
  padding: 12px;
  display: grid;
  gap: 4px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.panel {
  background: #ffffff;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.05);
}

.panel ul,
.panel ol {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: grid;
  gap: 12px;
}

.panel li {
  display: grid;
  gap: 6px;
}

.title {
  font-weight: 700;
}

.meta {
  font-size: 12px;
  color: #6f6f6f;
}

.progress {
  background: #eef3f0;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
}

.bar {
  height: 100%;
  background: linear-gradient(90deg, #0c7a5a, #66c6a3);
}

.action {
  justify-self: start;
  text-decoration: none;
  font-weight: 600;
  color: #0c7a5a;
}

.panel ol li {
  display: flex;
  justify-content: space-between;
}

.empty {
  margin-top: 12px;
  color: #6f6f6f;
  font-weight: 600;
}

.error {
  color: #b13b3b;
  font-weight: 600;
}
</style>
