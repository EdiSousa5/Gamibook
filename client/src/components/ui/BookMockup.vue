<script setup lang="ts">
import BookBadge from '@/components/ui/BookBadge.vue'
import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'

type Props = {
  coverUrl?: string | null
  title?: string
  size?: 'sm' | 'lg'
  badge?: BookBadgeTier
}

withDefaults(defineProps<Props>(), {
  coverUrl: null,
  title: 'Livro',
  size: 'sm',
  badge: undefined,
})
</script>

<template>
  <div class="book-scene" :class="size">
    <div class="book">
      <div class="book-face book-back"></div>
      <div class="book-face book-spine"></div>

      <div class="book-pages-block">
        <div class="page-face page-front"></div>
        <div class="page-face page-right"></div>
        <div class="page-face page-top"></div>
        <div class="page-face page-bottom"></div>
      </div>

      <div class="book-cover-hinge">
        <div class="book-face book-front">
          <img v-if="coverUrl" :src="coverUrl" :alt="title" />
          <div v-else class="empty-cover"><span>{{ title }}</span></div>
          <div class="book-lighting"></div>
          <BookBadge v-if="badge" :tier="badge" :size="size === 'lg' ? 'sm' : 'xs'" class="book-badge-overlay" />
        </div>
        <div class="book-face book-front-inside"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.book-scene {
  perspective: 1200px;
  width: max-content;
  display: flex;
  align-items: flex-end;
  z-index: 10;
}

.book {
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(4deg) rotateY(-25deg);
  transition: transform 0.5s ease;
  box-shadow: 12px 16px 20px rgba(2, 29, 32, 0.2);
  --d: 28px;
  --border-color: var(--color-mirage-900, #141a21);
  --page-bg: #fdfaf6;
  --page-line: rgba(0, 0, 0, 0.08);
  --cover-bg: var(--color-wild-100, #f8f9fa);
}

.book-scene.lg .book {
  width: 200px;
  height: 290px;
  --d: 40px;
}

.book-scene.sm .book {
  width: 100px;
  height: 145px;
  --d: 20px;
}

.book:hover {
  transform: rotateX(4deg) rotateY(-15deg);
}

/* TODAS AS FACES 3D */
.book-face {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 2px solid var(--border-color);
  box-sizing: border-box;
}

/* CAPA TRASEIRA */
.book-back {
  background: var(--color-deep-600, #2e7f7b);
  transform: translateZ(0);
}

/* LOMBADA (Esquerda) */
.book-spine {
  width: var(--d);
  background: var(--color-deep-600, #2e7f7b);
  transform-origin: left;
  transform: rotateY(-90deg);
}

.book-spine::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.2) 100%);
  pointer-events: none;
}

/* BLOCO DE PÁGINAS SÓLIDO (Mais pequeno que a capa para criar o overhang) */
.book-pages-block {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  right: 3px;
  transform-style: preserve-3d;
  transform: translateZ(2px);
  /* Fica logo acima da contracapa */
}

.page-face {
  position: absolute;
  box-sizing: border-box;
  background-color: var(--page-bg);
  border: 2px solid var(--border-color);
}

/* Primeira página visível ao abrir a capa */
.page-front {
  width: 100%;
  height: 100%;
  transform: translateZ(calc(var(--d) - 4px));
  border-left: none;
  background-image: linear-gradient(to right, rgba(0, 0, 0, 0.06) 0%, transparent 8%);
}

/* Corte Lateral das páginas */
.page-right {
  width: calc(var(--d) - 4px);
  height: 100%;
  right: 0;
  background-image: repeating-linear-gradient(to right, var(--page-bg) 0px, var(--page-bg) 2px, var(--page-line) 2px, var(--page-line) 3px);
  transform-origin: right;
  transform: rotateY(90deg);
}

/* Corte de Topo das páginas */
.page-top {
  width: 100%;
  height: calc(var(--d) - 4px);
  top: 0;
  background-image: repeating-linear-gradient(to bottom, var(--page-bg) 0px, var(--page-bg) 2px, var(--page-line) 2px, var(--page-line) 3px);
  transform-origin: top;
  transform: rotateX(90deg);
}

/* Corte de Fundo das páginas */
.page-bottom {
  width: 100%;
  height: calc(var(--d) - 4px);
  bottom: 0;
  background-image: repeating-linear-gradient(to top, var(--page-bg) 0px, var(--page-bg) 2px, var(--page-line) 2px, var(--page-line) 3px);
  transform-origin: bottom;
  transform: rotateX(-90deg);
}

/* Hinge da capa — pivota na lombada (bordo esquerdo) */
.book-cover-hinge {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  transform-style: preserve-3d;
  transition: transform 0.5s ease;
  transform: translateZ(var(--d));
}

.book:hover .book-cover-hinge {
  transform: translateZ(var(--d)) rotateY(-8deg);
}

/* CAPA FRONTAL (Exterior) */
.book-front {
  background-color: var(--cover-bg);
  display: flex;
  flex-direction: column;
  transform: rotateY(0deg);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/* CAPA FRONTAL (Interior) */
.book-front-inside {
  background-color: var(--color-wild-300, #e2e8f0);
  transform: rotateY(180deg);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-shadow: inset -6px 0 12px rgba(0, 0, 0, 0.06);
  /* Sombra subtil na lombada */
}

.book-badge-overlay {
  position: absolute;
  bottom: 6px;
  right: 6px;
  z-index: 3;
  transform: translateZ(1px);
}

.book-front img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.empty-cover {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 8px;
  font-weight: 800;
  font-size: 14px;
  color: var(--color-mirage-800, #141a21);
  background: var(--color-wild-300, #e2e8f0);
}

.book-scene.sm .empty-cover {
  font-size: 11px;
  padding: 6px;
}

/* Efeito de iluminação na capa */
.book-lighting {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right,
      rgba(255, 255, 255, 0.3) 0%,
      rgba(255, 255, 255, 0) 15%,
      rgba(0, 0, 0, 0.05) 85%,
      rgba(0, 0, 0, 0.2) 100%);
  pointer-events: none;
}

@media (max-width: 45em) {
  .book-scene.lg .book {
    width: 160px;
    height: 232px;
    --d: 32px;
  }

  .book-scene.sm .book {
    width: 84px;
    height: 122px;
    --d: 16px;
  }
}

@media (max-width: 30em) {
  .book-scene.lg .book {
    width: 140px;
    height: 203px;
    --d: 28px;
  }

  .book-scene.sm .book {
    width: 72px;
    height: 104px;
    --d: 14px;
  }
}
</style>
