<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
import UiChip from '@/components/ui/UiChip.vue'
import BookMockup from '@/components/ui/BookMockup.vue'
import BookBadge from '@/components/ui/BookBadge.vue'
import {
  FireIcon,
  SparklesIcon,
  ChartBarIcon,
  BookOpenIcon,
  BoltIcon,
  TrophyIcon,
} from '@heroicons/vue/24/outline'
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

const ICON_COUNT = 7
const activeIconIndex = ref<number | null>(0)
const isUserHovering = ref(false)

let intervalId: ReturnType<typeof setInterval>
let iconCycleId: ReturnType<typeof setInterval>

onMounted(async () => {
  intervalId = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % bookList.value.length
  }, 2500)

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
        <p class="subtitle">
          Desbloqueia aventuras literárias, completa missões diárias, ganha XP a cada resposta certa e
          evolui as tuas badges até ao nível Galaxy. A tua jornada começa agora!
        </p>
        <div class="cta">
          <UiButton size="lg" variant="primary" @click="router.push('/register')">Começar a Aventura</UiButton>
          <UiButton size="lg" variant="outline" @click="router.push('/login')">Já tenho conta</UiButton>
        </div>
      </div>

      <div class="visuals">
        <div class="hero-book">
          <BookMockup :title="currentBook.title" :cover-url="currentBook.coverUrl" size="lg" />
        </div>

        <!-- Badge Galaxy -->
        <div class="fi-wrap bf-1" :class="{ 'is-active': activeIconIndex === 0 }" @mouseenter="onIconEnter(0)" @mouseleave="onIconLeave">
          <div class="badge-float">
            <BookBadge tier="galaxy" size="sm" />
            <span class="tip tip--right">Ganha badges para os teus livros</span>
          </div>
        </div>

        <!-- Nível / Trophy -->
        <div class="fi-wrap bf-2" :class="{ 'is-active': activeIconIndex === 1 }" @mouseenter="onIconEnter(1)" @mouseleave="onIconLeave">
          <div class="orbit-icon" style="background:var(--color-amber-100);color:var(--color-amber-700)">
            <TrophyIcon class="o-icon" aria-hidden="true" />
            <span class="tip tip--left">Sobe de nível</span>
          </div>
        </div>

        <!-- XP / pontos -->
        <div class="fi-wrap oi-1" :class="{ 'is-active': activeIconIndex === 2 }" @mouseenter="onIconEnter(2)" @mouseleave="onIconLeave">
          <div class="orbit-icon" style="background:var(--color-amber-100);color:var(--color-amber-700)">
            <SparklesIcon class="o-icon" aria-hidden="true" />
            <span class="tip tip--right">Ganha XP por cada resposta</span>
          </div>
        </div>

        <!-- Sequência diária -->
        <div class="fi-wrap oi-2" :class="{ 'is-active': activeIconIndex === 3 }" @mouseenter="onIconEnter(3)" @mouseleave="onIconLeave">
          <div class="orbit-icon" style="background:var(--color-amber-100);color:var(--color-amber-600)">
            <FireIcon class="o-icon" aria-hidden="true" />
            <span class="tip tip--right">Mantém a tua sequência diária</span>
          </div>
        </div>

        <!-- Ranking -->
        <div class="fi-wrap oi-3" :class="{ 'is-active': activeIconIndex === 4 }" @mouseenter="onIconEnter(4)" @mouseleave="onIconLeave">
          <div class="orbit-icon" style="background:var(--color-teal-100);color:var(--color-teal-700)">
            <ChartBarIcon class="o-icon" aria-hidden="true" />
            <span class="tip tip--left">Compete no ranking global</span>
          </div>
        </div>

        <!-- Leitura -->
        <div class="fi-wrap oi-4" :class="{ 'is-active': activeIconIndex === 5 }" @mouseenter="onIconEnter(5)" @mouseleave="onIconLeave">
          <div class="orbit-icon" style="background:var(--color-wild-200);color:var(--color-deep-600)">
            <BookOpenIcon class="o-icon" aria-hidden="true" />
            <span class="tip tip--left">Coleciona livros</span>
          </div>
        </div>

        <!-- Desafios diários -->
        <div class="fi-wrap oi-5" :class="{ 'is-active': activeIconIndex === 6 }" @mouseenter="onIconEnter(6)" @mouseleave="onIconLeave">
          <div class="orbit-icon" style="background:var(--color-deep-100);color:var(--color-deep-600)">
            <BoltIcon class="o-icon" aria-hidden="true" />
            <span class="tip tip--left">Faz exercícios diários</span>
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

.subtitle {
  font-size: 18px;
  line-height: 1.6;
  color: var(--color-mirage-600);
  max-width: 500px;
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
  align-items: center;
  min-height: 480px;
}

.hero-book {
  animation: float-hero 7s ease-in-out infinite;
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

/* Galaxy — esquerda, topo */
.bf-1 { top: 7%;    left: 3%;   animation: fi 5.3s -2.1s  ease-in-out infinite alternate; }
/* Gold — direita, abaixo do meio */
.bf-2 { top: 58%;   right: 3%;  animation: fi 4.1s -3.0s  ease-in-out infinite alternate-reverse; }
/* Sparkles — esquerda, quase a meio */
.oi-1 { top: 38%;   left: 4%;   animation: fi 4.7s -1.3s  ease-in-out infinite alternate; }
/* Fire — esquerda, baixo */
.oi-2 { bottom: 12%; left: 7%;  animation: fi 3.8s -2.4s  ease-in-out infinite alternate-reverse; }
/* Chart — direita, topo */
.oi-3 { top: 9%;    right: 5%;  animation: fi 6.2s -0.8s  ease-in-out infinite alternate; }
/* Book — direita, meio-alto */
.oi-4 { top: 28%;   right: 2%;  animation: fi 5.0s -3.7s  ease-in-out infinite alternate-reverse; }
/* Bolt — direita, baixo */
.oi-5 { bottom: 8%; right: 6%;  animation: fi 4.4s -1.9s  ease-in-out infinite alternate; }

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
  stroke-width: 1.8;
}

/* ── Tooltips ─────────────────────────────────────── */
.tip {
  position: absolute;
  top: 50%;
  translate: 0 -50%;
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
  transform: scale(0.85);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.tip--right { left: calc(100% + 12px); }
.tip--left  { right: calc(100% + 12px); }

/* tooltips shown via is-active; :hover kept as CSS fallback */
.orbit-icon:hover .tip,
.badge-float:hover .tip {
  opacity: 1;
  transform: scale(1);
}

/* ── Keyframes ────────────────────────────────────── */
@keyframes float-hero {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50%       { transform: translateY(-16px) rotate(1.5deg); }
}

@keyframes fi {
  0%   { transform: translateY(0px) scale(1); }
  100% { transform: translateY(-14px) scale(1.04); }
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
  .subtitle  { max-width: 100%; }

  .cta {
    flex-direction: column;
    width: 100%;
  }

  .visuals {
    grid-row: 1;
    margin-bottom: var(--space-400);
    min-height: 380px;
  }

  .hero-book :deep(.book-scene.lg .book) {
    width: 180px;
    height: 261px;
    --d: 34px;
  }

  /* No mobile esconde alguns para não aglomerar */
  .oi-2, .oi-4, .oi-5 { display: none; }

  /* Mantém os 4 restantes nas faixas laterais */
  .bf-1 { top: 6%;  left: 2%;  }
  .bf-2 { top: 52%; right: 2%; }
  .oi-1 { top: 34%; left: 3%;  }
  .oi-3 { top: 8%;  right: 4%; }
}

/* ── Auto-cycle active state (button press effect) ── */
.fi-wrap.is-active .orbit-icon {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 var(--color-shadow);
}

.fi-wrap.is-active .badge-float {
  transform: translate(2px, 2px) scale(0.95);
}

.fi-wrap.is-active .tip {
  opacity: 1;
  transform: scale(1);
}
</style>
