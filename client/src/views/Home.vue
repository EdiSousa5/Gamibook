<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchBooks, getAssetUrl, type Book } from '../services/directus'

const featuredBooks = ref<Book[]>([])
const error = ref('')
const isLoading = ref(false)

onMounted(async () => {
  error.value = ''
  isLoading.value = true
  try {
    featuredBooks.value = await fetchBooks()
  } catch {
    error.value = 'Nao foi possivel carregar os livros em destaque.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section class="hero">
    <div class="hero-text">
      <p class="tag">Aprende, joga, conquista</p>
      <h1>GamiBook - Aprende com jogos!</h1>
      <p class="subtitle">
        Uma plataforma para desbloquear livros, completar missoes e subir no ranking.
      </p>
      <div class="cta">
        <RouterLink to="/register" class="btn primary">Regista-te gratis</RouterLink>
        <RouterLink to="/login" class="btn ghost">Ja tenho conta</RouterLink>
      </div>
    </div>
    <div class="hero-card">
      <h3>Livros em destaque</h3>
      <p v-if="isLoading" class="state">A carregar...</p>
      <p v-else-if="error" class="state error">{{ error }}</p>
      <ul v-else-if="featuredBooks.length">
        <li v-for="book in featuredBooks" :key="book.book_id">
          <div class="book-info">
            <span class="book-title">{{ book.title || 'Sem titulo' }}</span>
            <span class="book-level">{{ book.publisher || 'Sem editora' }}</span>
          </div>
          <img v-if="book.cover_img" class="book-cover" :src="getAssetUrl(book.cover_img)" alt="" />
        </li>
      </ul>
      <p v-else class="state">Sem livros em destaque.</p>
    </div>
  </section>

  <section class="flow">
    <h2>Fluxo do utilizador</h2>
    <div class="steps">
      <div class="step">Home</div>
      <div class="step">Registo</div>
      <div class="step">Dashboard</div>
      <div class="step">Livro</div>
      <div class="step">Modulo</div>
      <div class="step">Exercicios</div>
      <div class="step">+100 pontos</div>
      <div class="step">Badge</div>
      <div class="step">Ranking</div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
  align-items: center;
  margin-bottom: 48px;
}

.tag {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 12px;
  color: #0c7a5a;
  font-weight: 700;
}

.hero h1 {
  font-size: clamp(28px, 4vw, 44px);
  margin: 8px 0;
}

.subtitle {
  font-size: 16px;
  color: #3f3f3f;
  max-width: 460px;
}

.cta {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn {
  padding: 12px 18px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.primary {
  background: #0c7a5a;
  color: #fff;
}

.ghost {
  border: 2px solid #0c7a5a;
  color: #0c7a5a;
}

.hero-card {
  background: #ffffff;
  padding: 20px;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(12, 122, 90, 0.12);
}

.hero-card ul {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: grid;
  gap: 12px;
}

.book-info {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
}

.book-level {
  font-size: 12px;
  color: #6a6a6a;
}

.book-cover {
  width: 48px;
  height: 64px;
  border-radius: 10px;
  object-fit: cover;
  margin-top: 8px;
}

.book-progress {
  background: #eef3f0;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 6px;
}

.bar {
  height: 100%;
  background: linear-gradient(90deg, #0c7a5a, #66c6a3);
}

.flow {
  background: #ffffff;
  padding: 24px;
  border-radius: 18px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
}

.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.step {
  background: #f5faf8;
  border-radius: 12px;
  padding: 10px 14px;
  text-align: center;
  font-weight: 600;
}

.state {
  margin-top: 12px;
  color: #6f6f6f;
  font-weight: 600;
}

.error {
  color: #b13b3b;
}

@media (max-width: 640px) {
  .cta {
    flex-direction: column;
  }
}
</style>
