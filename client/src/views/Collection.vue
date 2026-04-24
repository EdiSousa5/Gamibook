<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiChip from '@/components/ui/UiChip.vue'
import BookMockup from '@/components/ui/BookMockup.vue'
import { RouterLink } from 'vue-router'
import {
  fetchApprovedBooks,
  fetchBooks,
  fetchUserById,
  fetchUserBooks,
  getAssetUrl,
  isAdminUser,
  type Book,
  type User,
  type UserBook,
} from '../services/directus'

const userBooks = ref<UserBook[]>([])
const allBooks = ref<Book[]>([])
const user = ref<User | null>(null)
const error = ref('')
const isLoading = ref(false)
const selectedBookId = ref<number | null>(null)

const isAdmin = computed(() => isAdminUser(user.value))

const ownedBooks = computed(() => {
  const list = userBooks.value
    .map((entry) => entry.book_id)
    .filter((book): book is Book => !!book)
  if (isAdmin.value) return list
  return list.filter((book) => book.is_approved)
})

const ownedBookIds = computed(() =>
  new Set(ownedBooks.value.map((book) => book.book_id)),
)

const missingBooks = computed(() =>
  allBooks.value.filter((book) => !ownedBookIds.value.has(book.book_id)),
)

const selectedBook = computed(() =>
  ownedBooks.value.find((book) => book.book_id === selectedBookId.value) || null,
)

const featuredBook = computed(() => selectedBook.value || ownedBooks.value[0] || null)
const otherOwnedBooks = computed(() =>
  featuredBook.value
    ? ownedBooks.value.filter((book) => book.book_id !== featuredBook.value?.book_id)
    : ownedBooks.value,
)

onMounted(async () => {
  const storedId = localStorage.getItem('gb_user_id')
  if (!storedId) return
  error.value = ''
  isLoading.value = true
  try {
    const [booksList, me] = await Promise.all([
      fetchUserBooks(storedId),
      fetchUserById(storedId),
    ])
    userBooks.value = booksList
    user.value = me
    allBooks.value = isAdminUser(me) ? await fetchBooks() : await fetchApprovedBooks()
    selectedBookId.value = ownedBooks.value[0]?.book_id ?? null
  } catch {
    error.value = 'Nao foi possivel carregar a tua colecao.'
  } finally {
    isLoading.value = false
  }
})

</script>

<template>
  <section class="collection">
    <div class="header">
      <div>
        <h1>Catalogo de Livros</h1>
        <p class="meta">O teu livro principal, os livros que tens e os que ainda nao tens.</p>
      </div>
    </div>

    <p v-if="isLoading" class="state">A carregar livros...</p>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <UiCard v-else-if="ownedBooks.length || missingBooks.length" class="cartao-principal">

      <!-- DESTAQUE (ESTANTE SUPERIOR) -->
      <div class="destaque-wrapper" v-if="featuredBook">
        <div class="destaque-info">
          <div class="destaque-tags">
            <UiChip v-if="featuredBook.publish_date" :label="String(new Date(featuredBook.publish_date).getFullYear())"
              variant="outline" />
            <UiChip v-if="(featuredBook as any)?.editora?.nome_editora"
              :label="(featuredBook as any).editora.nome_editora" variant="soft" />
          </div>
          <h2 class="titulo-livro">{{ featuredBook.title || 'Sem título' }}</h2>
          <p class="descricao">
            {{ featuredBook.description || 'Explora os conteúdos deste livro, desbloqueia módulos e ganha mais pontos respondendo aos desafios criados para ti.' }}
          </p>
          <div class="destaque-actions">
            <RouterLink :to="`/book/${featuredBook.book_id}`">
              <UiButton size="lg" variant="primary">Fazer Exercícios</UiButton>
            </RouterLink>
          </div>
        </div>

        <div class="destaque-visual">
          <BookMockup :cover-url="getAssetUrl(featuredBook.cover_img)" :title="featuredBook.title" size="lg" />
        </div>
      </div>

      <!-- Geometria 3D: Prateleira Grande (Sair do componente) -->
      <div class="estante-wrapper grande" v-if="featuredBook">
        <div class="estante-topo"></div>
        <div class="estante-frente"></div>
      </div>

      <!-- OUTROS LIVROS (ESTANTE MEIO) -->
      <div class="lista-wrapper" v-if="otherOwnedBooks.length">
        <h3 class="titulo-secao">A Tua Coleção</h3>

        <div class="livros-fila">
          <div v-for="book in otherOwnedBooks" :key="book.book_id" class="livro-item"
            :class="{ 'is-selected': book.book_id === selectedBookId }" @click="selectedBookId = book.book_id"
            tabindex="0" role="button">
            <BookMockup :cover-url="getAssetUrl(book.cover_img)" :title="book.title" size="sm" />
            <span class="nome-livro">{{ book.title || 'Sem título' }}</span>
          </div>
        </div>
      </div>

      <!-- Geometria 3D: Prateleira Pequena (Dentro do componente) -->
      <div class="estante-wrapper pequena" v-if="otherOwnedBooks.length">
        <div class="estante-topo"></div>
        <div class="estante-frente"></div>
      </div>

      <!-- LIVROS QUE NÃO TENS (ESTANTE BAIXO) -->
      <div class="lista-wrapper" v-if="missingBooks.length">
        <h3 class="titulo-secao">Para Descobrir</h3>

        <div class="livros-fila">
          <div v-for="book in missingBooks" :key="book.book_id" class="livro-item is-locked">
            <BookMockup :cover-url="getAssetUrl(book.cover_img)" :title="book.title" size="sm" />
            <span class="nome-livro">{{ book.title || 'Sem título' }}</span>
          </div>
        </div>
      </div>

      <!-- Geometria 3D: Prateleira Pequena -->
      <div class="estante-wrapper pequena" v-if="missingBooks.length">
        <div class="estante-topo"></div>
        <div class="estante-frente"></div>
      </div>
    </UiCard>
    <p v-else class="state">Sem livros associados.</p>
  </section>
</template>

<style scoped>
.collection {
  display: grid;
  gap: var(--space-400);
}

.meta {
  color: var(--color-mirage-500);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-300);
}

.cartao-principal {
  padding: var(--space-600) 0 0 0 !important;
  /* Sobrescreve o UiCard para não ter padding em baixo, nem overflow hidden.
     Desta forma, a prateleira grande pode sair para fora da borda. */
  overflow: visible !important;
}

/* =========================================
   1. ESTANTE SUPERIOR (DESTAQUE)
   ========================================= */
.destaque-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  /* Assenta o livro na estante */
  gap: var(--space-500);
  padding: 0 var(--space-500);
  margin-bottom: 0;
  position: relative;
  z-index: 10;
  animation: shelfFadeUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.destaque-info {
  flex: 1;
  max-width: 540px;
  padding-bottom: var(--space-600);
}

.destaque-tags {
  display: flex;
  gap: var(--space-200);
  margin-bottom: var(--space-300);
}

.titulo-livro {
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.1;
  font-weight: 700;
  color: var(--color-mirage-900);
  margin: 0 0 var(--space-300);
}

.descricao {
  font-size: 16px;
  line-height: 1.6;
  color: var(--color-mirage-700);
  margin: 0 0 var(--space-400);
}

.destaque-visual {
  flex-shrink: 0;
  padding-right: var(--space-500);
  /* Assenta perfeitamente na estante (flex-end trata disso) */
  transform: translateY(2px);
  /* Toca perfeitamente na estante sem folga, descendo um pouco o livro */
}

/* =========================================
   2. ESTRUTURA DA ESTANTE 3D
   ========================================= */
.estante-wrapper {
  width: 100%;
  position: relative;
  z-index: 5;
  perspective: 500px;
}

/* Estante Principal (Sai para fora do cartão) */
.estante-wrapper.grande {
  /* Extende o tamanho para além das bordas em 24px para cada lado */
  margin: 0 -24px;
  width: calc(100% + 48px);
  margin-bottom: var(--space-600);
  margin-top: -12px;
  /* Sobe a estante ligeiramente para se encontrar melhor com o livro */
}

.estante-wrapper.grande .estante-topo {
  height: 28px;
  background: linear-gradient(to bottom, var(--color-deep-200), var(--color-deep-400));
  border: 2px solid var(--color-mirage-800);
  border-top: none;
  border-bottom: none;
  transform-origin: bottom;
  transform: rotateX(45deg);
}

.estante-wrapper.grande .estante-frente {
  position: relative;
  height: 18px;
  background: var(--color-deep-600);
  border: 2px solid var(--color-mirage-800);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  /* Sombra para dar flutuação */
  box-shadow: 0 16px 20px -8px rgba(2, 29, 32, 0.5);
  /* Opcional: reflexo fino para detalhe metálico/madeira */
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

/* Estantes Secundárias (Encaixam dentro do cartão) */
.estante-wrapper.pequena {
  /* Respeita o padding interno (aproximadamente var(--space-400)) */
  margin: 0 var(--space-400);
  width: calc(100% - (var(--space-400) * 2));
  margin-bottom: var(--space-600);
  margin-top: -8px;
  /* Subir a estante para aproximar dos livros da lista */
}

.estante-wrapper.pequena .estante-topo {
  height: 18px;
  background: linear-gradient(to bottom, var(--color-deep-200), var(--color-deep-400));
  border: 2px solid var(--color-mirage-800);
  border-top: none;
  border-bottom: none;
  transform-origin: bottom;
  transform: rotateX(45deg);
}

.estante-wrapper.pequena .estante-frente {
  position: relative;
  height: 14px;
  background: var(--color-deep-600);
  border: 2px solid var(--color-mirage-800);
  border-bottom-left-radius: 3px;
  border-bottom-right-radius: 3px;
  box-shadow: 0 8px 12px -5px rgba(2, 29, 32, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

/* =========================================
   3. LISTA DE LIVROS (ESTANTE INFERIOR)
   ========================================= */
.lista-wrapper {
  padding: 0 var(--space-500);
  position: relative;
  z-index: 10;
  animation: shelfFadeUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: 0.15s;
}

.titulo-secao {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 var(--space-200) 0;
}

.livros-fila {
  display: flex;
  gap: var(--space-500);
  align-items: flex-end;
  overflow-x: auto;
  padding: var(--space-300) var(--space-600);
  /* Afasta o início e o fim da estante */
  scrollbar-width: thin;
}

.livros-fila::-webkit-scrollbar {
  height: 8px;
}

.livros-fila::-webkit-scrollbar-thumb {
  background: var(--color-mirage-400);
  border-radius: 4px;
}

.livro-item {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: var(--space-300);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.livro-item:hover:not(.is-locked) {
  transform: translateY(-8px);
}

.livro-item.is-selected {
  transform: translateY(-8px);
}

.livro-item.is-selected .nome-livro {
  color: var(--color-deep-600);
}

.livro-item.is-locked {
  cursor: not-allowed;
  filter: grayscale(1);
  opacity: 0.6;
}

.nome-livro {
  font-weight: 600;
  font-size: 14px;
  color: var(--color-mirage-800);
  text-align: left;
  width: 120px;
  line-height: 1.3;
  margin-bottom: 6px;
}

.error {
  color: var(--color-amber-700);
}

@keyframes shelfFadeUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .destaque-wrapper {
    flex-direction: column-reverse;
    align-items: center;
    text-align: center;
  }

  .destaque-visual {
    padding-right: 0;
    margin-bottom: var(--space-400);
  }

  .destaque-info {
    padding-bottom: var(--space-400);
  }
}
</style>
