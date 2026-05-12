<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
import UiChip from '@/components/ui/UiChip.vue'
import BookMockup from '@/components/ui/BookMockup.vue'
import BookBadge from '@/components/ui/BookBadge.vue'
import BookShelf from '@/components/ui/BookShelf.vue'
import {
  FireIcon,
  SparklesIcon,
  ChartBarIcon,
  BookOpenIcon,
} from '@heroicons/vue/24/solid'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchPublicApprovedBooks } from '@/services/books'
import { getAssetUrl } from '@/services/client'

const router = useRouter()

const FALLBACK = [
  { title: 'Magia', coverUrl: null },
  { title: 'Lógica', coverUrl: null },
  { title: 'História', coverUrl: null },
  { title: 'Código', coverUrl: null },
  { title: 'Espaço', coverUrl: null },
  { title: 'Ciência', coverUrl: null },
  { title: 'Música', coverUrl: null },
]

const bookList = ref<{ title: string; coverUrl: string | null }[]>(FALLBACK)
const currentIndex = ref(0)
const currentBook = computed(() => bookList.value[currentIndex.value] ?? { title: 'GamiBook', coverUrl: null })

const ICON_COUNT = 5
const activeIconIndex = ref<number | null>(0)
const isUserHovering = ref(false)

let intervalId: ReturnType<typeof setInterval>
let iconCycleId: ReturnType<typeof setInterval>

onMounted(async () => {
  intervalId = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % bookList.value.length
  }, 5000)

  iconCycleId = setInterval(() => {
    if (!isUserHovering.value) {
      activeIconIndex.value = ((activeIconIndex.value ?? -1) + 1) % ICON_COUNT
    }
  }, 3500)

  try {
    const books = await fetchPublicApprovedBooks()
    if (!books.length) return
    const shuffled = [...books]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = shuffled[i]!
      shuffled[i] = shuffled[j]!
      shuffled[j] = tmp
    }
    bookList.value = shuffled.map(b => ({
      title: b.title ?? '',
      coverUrl: b.cover_img ? getAssetUrl(b.cover_img) : null,
    }))
    currentIndex.value = 0
  } catch {
    // keep fallback
  }
})

onUnmounted(() => {
  clearInterval(intervalId)
  clearInterval(iconCycleId)
})

const onIconEnter = (index: number) => {
  isUserHovering.value = true
  activeIconIndex.value = index
}

const onIconLeave = () => {
  isUserHovering.value = false
}
</script>

<template>
  <div class="home-wrapper">
    <section class="landing">
      <div class="halo halo-1"></div>
      <div class="halo halo-2"></div>
      <div class="halo halo-3"></div>

      <div class="content">
        <UiChip label="Plataforma de Leitura Gamificada" variant="outline" class="hero-chip" />
        <h1>O jeito divertido e eficaz de <span class="highlight">dominar</span> os teus livros.</h1>
        <div class="cta">
          <UiButton size="lg" variant="primary" @click="router.push('/register')">Começar a Aventura</UiButton>
          <UiButton size="lg" variant="outline" @click="router.push('/login')">Já tenho conta</UiButton>
        </div>
      </div>

      <div class="visuals">
        <div class="hero-book">
          <Transition name="book-swap" mode="out-in">
            <BookMockup
              :key="currentIndex"
              :title="currentBook.title"
              :cover-url="currentBook.coverUrl"
              size="lg"
            />
          </Transition>
        </div>

        <BookShelf variant="hero" />

        <!-- Badge Galaxy -->
        <div class="fi-wrap bf-1" :class="{ 'is-active': activeIconIndex === 0 }" @mouseenter="onIconEnter(0)" @mouseleave="onIconLeave">
          <div class="badge-float">
            <BookBadge tier="galaxy" size="sm" />
            <span class="tip tip--bottom">Alcança o nível Galaxy</span>
          </div>
        </div>

        <!-- XP / pontos + nível -->
        <div class="fi-wrap oi-1" :class="{ 'is-active': activeIconIndex === 1 }" @mouseenter="onIconEnter(1)" @mouseleave="onIconLeave">
          <div class="orbit-icon" style="background:var(--color-amber-100);color:var(--color-amber-700)">
            <SparklesIcon class="o-icon" aria-hidden="true" />
            <span class="tip tip--bottom">Ganha XP e sobe de nível</span>
          </div>
        </div>

        <!-- Ranking -->
        <div class="fi-wrap oi-3" :class="{ 'is-active': activeIconIndex === 2 }" @mouseenter="onIconEnter(2)" @mouseleave="onIconLeave">
          <div class="orbit-icon" style="background:var(--color-teal-100);color:var(--color-teal-700)">
            <ChartBarIcon class="o-icon" aria-hidden="true" />
            <span class="tip tip--left">Compete no ranking global</span>
          </div>
        </div>

        <!-- Leitura -->
        <div class="fi-wrap oi-4" :class="{ 'is-active': activeIconIndex === 3 }" @mouseenter="onIconEnter(3)" @mouseleave="onIconLeave">
          <div class="orbit-icon" style="background:var(--color-wild-200);color:var(--color-deep-600)">
            <BookOpenIcon class="o-icon" aria-hidden="true" />
            <span class="tip tip--left">Coleciona e lê livros</span>
          </div>
        </div>

        <!-- Desafios diários -->
        <div class="fi-wrap oi-5" :class="{ 'is-active': activeIconIndex === 4 }" @mouseenter="onIconEnter(4)" @mouseleave="onIconLeave">
          <div class="orbit-icon" style="background:var(--color-amber-100);color:var(--color-amber-600)">
            <FireIcon class="o-icon" aria-hidden="true" />
            <span class="tip tip--right">Faz exercícios diários</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing {
  min-height: calc(100vh - 120px);
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: clamp(40px, 8vw, 100px);
  padding: var(--space-600) var(--space-400);
  position: relative;
  overflow: hidden;
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Halos ────────────────────────────────────────── */
.halo {
  position: absolute;
  border-radius: 50%;
  z-index: 0;
  pointer-events: none;
}

.halo-1 {
  width: 640px;
  height: 640px;
  background: radial-gradient(circle, rgba(46, 127, 123, 0.14), transparent 65%);
  top: -180px;
  right: -80px;
}

.halo-2 {
  width: 420px;
  height: 420px;
  background: radial-gradient(circle, rgba(249, 115, 22, 0.08), transparent 65%);
  bottom: -120px;
  left: -80px;
}

.halo-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(46, 127, 123, 0.08), transparent 65%);
  top: 40%;
  left: 40%;
}

/* ── Content ──────────────────────────────────────── */
.content {
  display: grid;
  gap: var(--space-300);
  position: relative;
  z-index: 1;
  text-align: left;
  padding-top: 0;
}

.hero-chip {
  justify-self: start;
  margin-bottom: var(--space-100);
}

h1 {
  font-size: clamp(32px, 4vw, 54px);
  margin: 0;
  line-height: 1.15;
  color: var(--color-mirage-900);
  font-weight: 900;
}

.highlight {
  color: var(--color-deep-600);
  display: inline-block;
}

.cta {
  display: flex;
  gap: var(--space-300);
  margin-top: var(--space-200);
}

/* ── Visuals ──────────────────────────────────────── */
.visuals {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  min-height: 560px;
  padding-bottom: 50px;
}

.hero-book {
  z-index: 2;
}

.hero-book :deep(.book-scene.lg .book) {
  width: 250px;
  height: 362px;
  --d: 44px;
}

/* ── Wrapper — trata posição + animação ───────────── */
.fi-wrap {
  position: absolute;
  z-index: 3;
}

/* Ícone ou badge activo sobe ao topo para o tooltip não ficar atrás */
.fi-wrap:hover,
.fi-wrap.is-active {
  z-index: 20;
}

/*
  5 ícones: Galaxy topo-esq | XP topo-dir | Ranking dir-alta | Leitura dir-baixa | Fogo esq-meio
*/
.bf-1 { left:  3%; top:  5%;  animation: fi 5.3s -2.1s ease-in-out infinite alternate; }
.oi-1 { left: 64%; top:  1%;  animation: fi 4.7s -1.3s ease-in-out infinite alternate; }
.oi-3 { left: 89%; top: 22%;  animation: fi 6.2s -0.8s ease-in-out infinite alternate; }
.oi-4 { left: 83%; top: 52%;  animation: fi 5.0s -3.7s ease-in-out infinite alternate-reverse; }
.oi-5 { left:  5%; top: 50%;  animation: fi 3.8s -2.4s ease-in-out infinite alternate-reverse; }

/* ── Badge float interior ─────────────────────────── */
.badge-float {
  position: relative;
  display: inline-flex;
  cursor: default;
  transition: transform 0.15s ease;
}

/* ── Orbit icons interior ─────────────────────────── */
.orbit-icon {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  cursor: default;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.o-icon {
  width: 26px;
  height: 26px;
}

/* ── Tooltips ─────────────────────────────────────── */
.tip {
  position: absolute;
  background: var(--color-wild-100);
  color: var(--color-mirage-800);
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  z-index: 1;
  transform: scale(0.85);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

/* Horizontal — centrados verticalmente no ícone */
.tip--right { top: 50%; left: calc(100% + 12px);  translate: 0 -50%; }
.tip--left  { top: 50%; right: calc(100% + 12px); translate: 0 -50%; }

/* Vertical — centrados horizontalmente no ícone */
.tip--bottom { top: calc(100% + 10px); left: 50%; translate: -50% 0; }
.tip--top    { bottom: calc(100% + 10px); left: 50%; translate: -50% 0; }

/* tooltips shown via is-active; :hover kept as CSS fallback */
.orbit-icon:hover .tip,
.badge-float:hover .tip {
  opacity: 1;
  transform: scale(1);
}

/* ── Keyframes ────────────────────────────────────── */
@keyframes fi {
  0%   { transform: translateY(0px) scale(1); }
  100% { transform: translateY(-14px) scale(1.04); }
}

/* ── Transição entre livros — efeito de prateleira ── */
.book-swap-enter-active {
  transition: opacity 0.5s cubic-bezier(0.34, 1.28, 0.64, 1), transform 0.5s cubic-bezier(0.34, 1.28, 0.64, 1);
}
.book-swap-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.book-swap-enter-from {
  opacity: 0;
  transform: translateY(32px) scale(0.82);
}
.book-swap-leave-to {
  opacity: 0;
  transform: scale(0.88);
}

/* ── Responsive ───────────────────────────────────── */
@media (max-width: 900px) {
  .landing {
    grid-template-columns: 1fr;
    text-align: center;
    padding-top: var(--space-600);
  }

  .content {
    text-align: center;
    place-items: center;
  }

  .hero-chip { justify-self: center; }

  .content {
    padding-top: var(--space-400);
  }

  .cta {
    flex-direction: column;
    width: 100%;
  }

  .visuals {
    grid-row: 1;
    margin-bottom: var(--space-400);
    min-height: 440px;
    padding-bottom: 64px;
  }

  .hero-book :deep(.book-scene.lg .book) {
    width: 180px;
    height: 261px;
    --d: 34px;
  }

  /* No mobile esconde alguns para não aglomerar */
  .oi-4, .oi-5 { display: none; }

  /* Mantém 3: Galaxy topo-esq | XP topo-dir | Ranking dir */
  .bf-1 { left:  4%; top:  5%; }
  .oi-1 { left: 66%; top:  1%; }
  .oi-3 { left: 87%; top: 22%; }
}

/* ── Auto-cycle active state (button press effect) ── */
.fi-wrap.is-active .orbit-icon {
  transform: translate(4px, 4px);
  box-shadow: 0px 0px 0 var(--color-shadow);
}

.fi-wrap.is-active .badge-float {
  transform: translate(2px, 2px) scale(0.95);
}

.fi-wrap.is-active .tip {
  opacity: 1;
  transform: scale(1);
}
</style>
