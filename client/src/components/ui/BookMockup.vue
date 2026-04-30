
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
      <div class="book-face book-front">
        <img v-if="coverUrl" :src="coverUrl" :alt="title" />
        <div v-else class="empty-cover"><span>{{ title }}</span></div>
        <div class="book-lighting"></div>
        <BookBadge
          v-if="badge"
          :tier="badge"
          :size="size === 'lg' ? 'md' : 'sm'"
          class="book-badge-overlay"
        />
      </div>
      
      <div class="book-face book-spine"></div>
      <div class="book-face book-pages"></div>
    </div>
  </div>
</template>

<style scoped>
/* Define a perspetiva da cena 3D e garante que assenta no fundo */
.book-scene {
  perspective: 1000px;
  width: max-content;
  display: flex;
  align-items: flex-end;
  z-index: 10;
}

/* Estrutura base do livro com variáveis CSS para controlo de tamanho */
.book {
  position: relative;
  transform-style: preserve-3d;
  transform: rotateY(-25deg); 
  transition: transform 0.4s ease;
  box-shadow: 12px 16px 20px rgba(2, 29, 32, 0.2);
  border-radius: 2px 6px 6px 2px;
  /* Variáveis de geometria que se ajustam pelo tamanho */
  --d: 24px; 
  --d-half: calc(var(--d) / 2);
}

/* Tamanho Grande (Destaque) */
.book-scene.lg .book {
  width: 200px;
  height: 290px;
  --d: 36px;
}

/* Tamanho Pequeno (Lista) */
.book-scene.sm .book {
  width: 100px;
  height: 145px;
  --d: 18px;
}

.book:hover {
  transform: rotateY(-15deg);
}

.book-face {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* CAPA FRONTAL */
.book-front {
  transform: translateZ(var(--d-half));
  border-radius: 2px 6px 6px 2px;
  overflow: hidden;
  background-color: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  display: flex;
  flex-direction: column;
  position: relative;
}

.book-badge-overlay {
  position: absolute;
  bottom: 6px;
  right: 6px;
  z-index: 3;
}

.book-front img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  color: var(--color-mirage-600);
  background: var(--color-wild-300);
}
.book-scene.sm .empty-cover { font-size: 11px; }

/* Efeito de iluminação na dobra da capa */
.book-lighting {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to right, 
    rgba(255, 255, 255, 0.3) 0%, 
    rgba(255, 255, 255, 0) 10%, 
    rgba(0, 0, 0, 0.05) 90%, 
    rgba(0, 0, 0, 0.15) 100%
  );
  pointer-events: none;
}

/* LOMBADA (Esquerda) */
.book-spine {
  width: var(--d);
  transform: rotateY(-90deg) translateZ(var(--d-half));
  background-color: var(--color-deep-600);
  border: 2px solid var(--color-mirage-800);
  border-right: none;
  border-radius: 4px 0 0 4px;
  box-shadow: inset 4px 0 10px rgba(0, 0, 0, 0.2);
}

/* PÁGINAS (Direita) */
.book-pages {
  width: var(--d);
  height: 96%;
  top: 2%;
  left: auto;
  right: 0;
  transform: rotateY(90deg) translateZ(var(--d-half));
  background: linear-gradient(to right, #ccc, #fff 10%, #f4f4f4 90%, #ccc);
  border: 2px solid var(--color-mirage-800);
  border-left: none;
}
</style>
