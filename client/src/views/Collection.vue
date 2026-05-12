<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiChip from '@/components/ui/UiChip.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import BookShelf from '@/components/ui/BookShelf.vue'
import BookMockup from '@/components/ui/BookMockup.vue'
import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'
import { RouterLink } from 'vue-router'
import {
  fetchApprovedBooks,
  fetchBooks,
  fetchUserBooks,
} from '../services/books'
import { fetchUserById, isAdminUser } from '../services/auth'
import { getAssetUrl } from '../services/client'
import type { Book, User, UserBook } from '@/types'

const route = useRoute()

const userBooks = ref<UserBook[]>([])
const allBooks = ref<Book[]>([])
const user = ref<User | null>(null)
const error = ref('')
const isLoading = ref(false)
const selectedBookId = ref<number | null>(null)
const featuredDescriptionFallback = 'Explora os conteúdos deste livro, desbloqueia módulos e ganha mais pontos respondendo aos desafios criados para ti.'

const isAdmin = computed(() => isAdminUser(user.value))

// Filter state
const viewFilter = ref<'all' | 'owned' | 'missing' | 'completed'>('all')
const publisherFilter = ref('all')
const sortBy = ref<'default' | 'title' | 'date'>('default')

const viewOptions = [
  { label: 'Todos os livros', value: 'all' },
  { label: 'Minha coleção', value: 'owned' },
  { label: 'Para descobrir', value: 'missing' },
  { label: 'Concluídos', value: 'completed' },
]

const sortOptions = [
  { label: 'Ordem padrão', value: 'default' },
  { label: 'Título (A-Z)', value: 'title' },
  { label: 'Data de publicação', value: 'date' },
]

const searchQuery = computed(() => (route.query.q ?? '').toString().toLowerCase().trim())

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

const badgeMap = computed(() => {
  const map = new Map<number, BookBadgeTier>()
  for (const entry of userBooks.value) {
    const bid = typeof entry.book_id === 'object' ? (entry.book_id as Book)?.book_id : entry.book_id as number
    const badge = entry.current_badge
    if (bid && badge && badge !== 'default') {
      map.set(bid, badge as BookBadgeTier)
    }
  }
  return map
})

const badgeForBook = (bookId: number): BookBadgeTier | undefined => badgeMap.value.get(bookId)

const completedBookIds = computed(() => {
  const ids = new Set<number>()
  for (const entry of userBooks.value) {
    if (entry.final_quiz_unlocked) {
      const bid = typeof entry.book_id === 'object' ? (entry.book_id as Book)?.book_id : entry.book_id as number
      if (bid) ids.add(bid)
    }
  }
  return ids
})

const uniquePublishers = computed(() => {
  const pubs = new Set<string>()
  ;[...ownedBooks.value, ...missingBooks.value].forEach((b) => {
    if (b.editora?.nome_editora) pubs.add(b.editora.nome_editora)
  })
  return Array.from(pubs).sort()
})

const publisherOptions = computed(() => [
  { label: 'Todas as editoras', value: 'all' },
  ...uniquePublishers.value.map((p) => ({ label: p, value: p })),
])

const applyBookFilters = (books: Book[]) => {
  let list = books
  if (searchQuery.value) {
    list = list.filter((b) => b.title?.toLowerCase().includes(searchQuery.value))
  }
  if (publisherFilter.value !== 'all') {
    list = list.filter((b) => b.editora?.nome_editora === publisherFilter.value)
  }
  if (sortBy.value === 'title') {
    list = [...list].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
  } else if (sortBy.value === 'date') {
    list = [...list].sort((a, b) => {
      const da = a.publish_date ? new Date(a.publish_date).getTime() : 0
      const db = b.publish_date ? new Date(b.publish_date).getTime() : 0
      return db - da
    })
  }
  return list
}

const displayedOwnedBooks = computed(() => {
  let list = otherOwnedBooks.value
  if (viewFilter.value === 'completed') {
    list = list.filter((b) => completedBookIds.value.has(b.book_id))
  }
  return applyBookFilters(list)
})

const displayedMissingBooks = computed(() => applyBookFilters(missingBooks.value))

const showOwnedSection = computed(() => viewFilter.value !== 'missing')
const showMissingSection = computed(() => viewFilter.value === 'all' || viewFilter.value === 'missing')

const ownedShelvesVisible = ref(1)
const missingShelvesVisible = ref(1)

const collectionRef = ref<HTMLElement | null>(null)
const containerWidth = ref(1000)
let resizeObserver: ResizeObserver | null = null

const itemsPerShelf = computed(() => {
  const available = containerWidth.value - 64
  return Math.max(2, Math.floor(available / 132))
})

const ownedShelves = computed(() => {
  const arr = displayedOwnedBooks.value
  const size = itemsPerShelf.value
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size))
})
const visibleOwnedShelves = computed(() => ownedShelves.value.slice(0, ownedShelvesVisible.value))
const hasMoreOwned = computed(() => ownedShelvesVisible.value < ownedShelves.value.length)

const missingShelves = computed(() => {
  const arr = displayedMissingBooks.value
  const size = itemsPerShelf.value
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size))
})
const visibleMissingShelves = computed(() => missingShelves.value.slice(0, missingShelvesVisible.value))
const hasMoreMissing = computed(() => missingShelvesVisible.value < missingShelves.value.length)

const filteredAllOwnedBooks = computed(() => {
  let list = ownedBooks.value
  if (viewFilter.value === 'completed') {
    list = list.filter((b) => completedBookIds.value.has(b.book_id))
  }
  return applyBookFilters(list)
})

// Reset pagination when filters change and keep featured book within filtered results
watch([viewFilter, publisherFilter, sortBy, searchQuery], () => {
  ownedShelvesVisible.value = 1
  missingShelvesVisible.value = 1
  const filtered = filteredAllOwnedBooks.value
  if (filtered.length && !filtered.find((b) => b.book_id === selectedBookId.value)) {
    selectedBookId.value = filtered[0]?.book_id ?? null
  }
})

onMounted(async () => {
  resizeObserver = new ResizeObserver((entries) => {
    if (entries[0]) { containerWidth.value = entries[0].contentRect.width }
  })
  if (collectionRef.value) {
    resizeObserver.observe(collectionRef.value)
  }

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
    error.value = 'Não foi possível carregar a tua coleção.'
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
})

</script>

<template>
  <section class="collection" ref="collectionRef">
    <div class="header">
      <div>
        <h1>Catalogo de Livros</h1>
        <p class="meta">O teu livro principal, os livros que tens e os que ainda não tens.</p>
      </div>
    </div>

    <p v-if="isLoading" class="state">A carregar livros...</p>
    <p v-else-if="error" class="state error">{{ error }}</p>

    <template v-else-if="ownedBooks.length || missingBooks.length">
      <!-- Filter bar -->
      <div class="filters-bar">
        <div class="filter-item">
          <UiSelect :model-value="viewFilter" :options="viewOptions" @update="viewFilter = $event as any" />
        </div>
        <div class="filter-item">
          <UiSelect :model-value="publisherFilter" :options="publisherOptions" @update="publisherFilter = $event as any" />
        </div>
        <div class="filter-item">
          <UiSelect :model-value="sortBy" :options="sortOptions" @update="sortBy = $event as any" />
        </div>
      </div>

      <UiCard class="cartao-principal">

        <!-- DESTAQUE (ESTANTE SUPERIOR) -->
        <div class="destaque-wrapper" v-if="featuredBook && showOwnedSection">
          <div class="destaque-info">
            <div class="destaque-tags">
              <UiChip v-if="featuredBook.publish_date" :label="String(new Date(featuredBook.publish_date).getFullYear())"
                variant="outline" />
              <UiChip v-if="featuredBook.editora?.nome_editora" :label="featuredBook.editora.nome_editora"
                variant="soft" />
            </div>
            <h2 class="titulo-livro">{{ featuredBook.title || 'Sem título' }}</h2>
            <p class="descricao">
              {{ featuredBook.description || featuredDescriptionFallback }}
            </p>
            <div class="destaque-actions">
              <RouterLink :to="`/book/${featuredBook.book_id}`">
                <UiButton size="lg" variant="primary">Fazer Exercícios</UiButton>
              </RouterLink>
            </div>
          </div>

          <div class="destaque-visual">
            <Transition name="book-swap" mode="out-in">
              <BookMockup :key="featuredBook.book_id" :cover-url="getAssetUrl(featuredBook.cover_img)" :title="featuredBook.title" size="lg"
                :badge="badgeForBook(featuredBook.book_id)" />
            </Transition>
          </div>
        </div>

        <!-- Geometria 3D: Prateleira Grande (Sair do componente) -->
        <BookShelf variant="large" v-if="featuredBook && showOwnedSection" />

        <!-- OUTROS LIVROS (ESTANTE MEIO) -->
        <template v-if="showOwnedSection && displayedOwnedBooks.length">
          <div v-for="(shelf, index) in visibleOwnedShelves" :key="'owned-shelf-' + index">
            <div class="lista-wrapper">
              <h3 v-if="index === 0" class="titulo-secao">A Tua Coleção</h3>

              <div class="livros-fila">
                <div v-for="book in shelf" :key="book.book_id" class="livro-item"
                  :class="{ 'is-selected': book.book_id === selectedBookId }" @click="selectedBookId = book.book_id"
                  tabindex="0" role="button">
                  <BookMockup :cover-url="getAssetUrl(book.cover_img)" :title="book.title" size="sm"
                    :badge="badgeForBook(book.book_id)" />
                </div>
              </div>
            </div>

            <!-- Geometria 3D: Prateleira Pequena -->
            <BookShelf variant="small" />
          </div>

          <div v-if="hasMoreOwned" class="view-more-action">
            <UiButton variant="ghost" size="sm" @click="ownedShelvesVisible += 2">Ver mais</UiButton>
          </div>
        </template>

        <p v-else-if="showOwnedSection && (searchQuery || publisherFilter !== 'all' || viewFilter === 'completed')" class="state state-inline">
          Nenhum livro encontrado com os filtros atuais.
        </p>

        <!-- LIVROS QUE NÃO TENS (ESTANTE BAIXO) -->
        <template v-if="showMissingSection && displayedMissingBooks.length">
          <div v-for="(shelf, index) in visibleMissingShelves" :key="'missing-shelf-' + index">
            <div class="lista-wrapper">
              <h3 v-if="index === 0" class="titulo-secao">Para Descobrir</h3>

              <div class="livros-fila">
                <div v-for="book in shelf" :key="book.book_id" class="livro-item is-locked">
                  <BookMockup :cover-url="getAssetUrl(book.cover_img)" :title="book.title" size="sm" />
                </div>
              </div>
            </div>

            <!-- Geometria 3D: Prateleira Pequena -->
            <BookShelf variant="small" />
          </div>

          <div v-if="hasMoreMissing" class="view-more-action">
            <UiButton variant="ghost" size="sm" @click="missingShelvesVisible += 2">Ver mais</UiButton>
          </div>
        </template>
      </UiCard>
    </template>

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

/* Filter bar */
.filters-bar {
  display: flex;
  gap: var(--space-300);
  flex-wrap: wrap;
}

.filter-item {
  min-width: 180px;
}

.cartao-principal {
  padding: var(--space-600) 0 0 0 !important;
  overflow: visible !important;
}

/* =========================================
   1. ESTANTE SUPERIOR (DESTAQUE)
   ========================================= */
.destaque-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
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
  transform: translateY(2px);
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
  left: 0 !important;
  bottom: auto !important;
  margin: -12px -24px var(--space-600);
  width: calc(100% + 48px);
}

:deep(.estante-wrapper.grande .estante-topo) {
  height: 28px;
  background: linear-gradient(to bottom, var(--color-deep-200), var(--color-deep-400));
  border: 2px solid var(--color-mirage-800);
  border-top: none;
  border-bottom: none;
  transform-origin: bottom;
  transform: rotateX(45deg);
}

:deep(.estante-wrapper.grande .estante-frente) {
  height: 18px;
  background: var(--color-deep-600);
  border: 2px solid var(--color-mirage-800);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  box-shadow: 0 16px 20px -8px rgba(2, 29, 32, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

/* Estantes Secundárias */
:deep(.estante-wrapper.pequena) {
  position: relative !important;
  left: auto !important;
  bottom: auto !important;
  margin: -4px var(--space-200) var(--space-400);
  width: calc(100% - (var(--space-200) * 2));
}

:deep(.estante-wrapper.pequena .estante-topo) {
  height: 18px;
}

:deep(.estante-wrapper.pequena .estante-frente) {
  height: 14px;
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
  gap: var(--space-700);
  justify-content: flex-start;
  align-items: flex-end;
  margin-top: var(--space-200);
  padding: var(--space-400) var(--space-400) var(--space-200);
  position: relative;
  z-index: 1;
  width: 100%;
}

.livro-item {
  flex-shrink: 0;
  width: 100px;
  cursor: pointer;
  transition: transform 0.2s ease;
  transform: translateY(16px);
  transform-origin: bottom center;
}

.livro-item:hover:not(.is-locked) {
  transform: translateY(10px) scale(1.02);
}

.livro-item.is-locked {
  cursor: not-allowed;
  filter: grayscale(1) brightness(0.75);
}

.error {
  color: var(--color-amber-700);
}

.state-inline {
  padding: var(--space-400) var(--space-500);
  color: var(--color-mirage-500);
}

.view-more-action {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-600);
  margin-top: calc(var(--space-200) * -1);
}

.book-swap-enter-active,
.book-swap-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.book-swap-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.94);
}

.book-swap-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
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

  .filters-bar {
    flex-direction: column;
  }

  .filter-item {
    min-width: unset;
    width: 100%;
  }
}
</style>
