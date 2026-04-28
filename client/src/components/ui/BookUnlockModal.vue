<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { BookOpenIcon } from '@heroicons/vue/24/outline'
import UiButton from './UiButton.vue'
import { getAssetUrl } from '@/services/client'
import type { Book } from '@/types'

const props = defineProps<{
  visible: boolean
  book: Book | null
}>()

const emit = defineEmits<{ close: [] }>()
const router = useRouter()

const coverUrl = computed(() => getAssetUrl(props.book?.cover_img ?? ''))
const title = computed(() => props.book?.title ?? 'Livro')

const goToBook = () => {
  emit('close')
  if (props.book?.book_id) {
    router.push(`/book/${props.book.book_id}`)
  }
}

const COLORS = ['#2e7f7b', '#1a5e5b', '#4ade80', '#86efac', '#34d399', '#6ee7b7', '#166534', '#a7f3d0', '#059669', '#6ee7b7']
const confetti = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  color: COLORS[i % COLORS.length],
  left: `${(i * 3.25 + (i % 5) * 1.1) % 100}%`,
  delay: `${(i * 0.1) % 1.4}s`,
  dur: `${2.4 + (i % 5) * 0.3}s`,
  w: `${6 + (i % 4) * 3}px`,
  h: `${8 + (i % 3) * 5}px`,
  rot: `${(i * 47) % 360}deg`,
}))
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div v-if="visible" class="unlock-overlay" role="dialog" aria-modal="true" aria-label="Livro desbloqueado!">
        <div class="unlock-card">

          <div class="confetti-wrap" aria-hidden="true">
            <span
              v-for="p in confetti"
              :key="p.id"
              class="cp"
              :style="{ '--c': p.color, '--l': p.left, '--d': p.delay, '--dur': p.dur, width: p.w, height: p.h, '--r': p.rot }"
            />
          </div>

          <p class="up-label">Livro Desbloqueado!</p>

          <div class="cover-wrap" aria-hidden="true">
            <div class="cover-inner">
              <img v-if="coverUrl" :src="coverUrl" :alt="title" class="cover-img" />
              <div v-else class="cover-placeholder">
                <BookOpenIcon class="placeholder-icon" />
              </div>
            </div>
          </div>

          <h2 class="book-title">{{ title }}</h2>
          <p v-if="book?.description" class="book-desc">{{ book.description }}</p>

          <div class="actions">
            <UiButton variant="primary" class="btn-primary" @click="goToBook">Ver livro</UiButton>
            <UiButton variant="outline" @click="emit('close')">Fechar</UiButton>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.unlock-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: clamp(16px, 4vw, 32px);
}

.unlock-card {
  position: relative;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 24px;
  padding: 52px 48px 44px;
  max-width: 520px;
  width: 100%;
  text-align: center;
  box-shadow: 6px 6px 0 var(--color-shadow);
  overflow: hidden;
  animation: card-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes card-pop {
  from { transform: scale(0.65) translateY(24px); opacity: 0; }
  to   { transform: scale(1)    translateY(0);    opacity: 1; }
}

/* Confetti */
.confetti-wrap {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.cp {
  position: absolute;
  top: -14px;
  left: var(--l);
  background: var(--c);
  border-radius: 2px;
  transform: rotate(var(--r));
  animation: fall var(--dur) var(--d) ease-in forwards;
}

@keyframes fall {
  0%   { transform: translateY(0)     rotate(0deg);   opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateY(700px) rotate(900deg); opacity: 0; }
}

/* Label */
.up-label {
  margin: 0 0 32px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--color-deep-600);
}

/* Cover */
.cover-wrap {
  margin: 0 auto 28px;
  width: 140px;
  animation: cover-reveal 0.8s 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes cover-reveal {
  from { transform: scale(0.4) translateY(20px) rotate(-6deg); opacity: 0; }
  to   { transform: scale(1)   translateY(0)    rotate(0deg);  opacity: 1; }
}

.cover-inner {
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  overflow: hidden;
  aspect-ratio: 2/3;
  background: var(--color-wild-300);
  display: grid;
  place-items: center;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 24px;
}

.placeholder-icon {
  width: 48px;
  height: 48px;
  color: var(--color-mirage-400);
  stroke-width: 1.2;
}

/* Text */
.book-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-mirage-800);
  margin: 0 0 12px;
  animation: fade-up 0.5s 0.5s ease both;
}

.book-desc {
  font-size: 14px;
  color: var(--color-mirage-500);
  margin: 0 0 32px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  animation: fade-up 0.5s 0.6s ease both;
}

@keyframes fade-up {
  from { transform: translateY(10px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.actions {
  display: flex;
  gap: 12px;
  animation: fade-up 0.5s 0.7s ease both;
}

.btn-primary { flex: 1; }

@media (max-width: 400px) {
  .unlock-card { padding: 36px 24px 28px; }
  .cover-wrap { width: 100px; }
  .actions { flex-direction: column; }
  .btn-primary { flex: unset; }
}

/* Overlay transition */
.overlay-fade-enter-active { animation: overlay-in 0.3s ease both; }
.overlay-fade-leave-active { animation: overlay-in 0.2s ease reverse both; }

@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
