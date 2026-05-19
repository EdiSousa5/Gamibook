<script setup lang="ts">
defineProps<{ active: boolean }>()

const PARTICLES = Array.from({ length: 52 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 1.2,
  duration: 1.8 + Math.random() * 1.4,
  size: 6 + Math.floor(Math.random() * 8),
  color: [
    'var(--color-deep-500)',
    'var(--color-deep-400)',
    'var(--color-deep-600)',
    'var(--color-teal-400)',
    'var(--color-teal-300)',
    'var(--color-deep-300)',
    '#fff',
  ][Math.floor(Math.random() * 7)],
  rotation: Math.random() * 360,
  isRect: Math.random() > 0.5,
}))
</script>

<template>
  <Transition name="confetti-fade">
    <div v-if="active" class="confetti-root" aria-hidden="true">
      <span
        v-for="p in PARTICLES"
        :key="p.id"
        class="confetti-particle"
        :style="{
          left: `${p.x}%`,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          width: `${p.size}px`,
          height: p.isRect ? `${p.size * 0.5}px` : `${p.size}px`,
          background: p.color,
          borderRadius: p.isRect ? '2px' : '50%',
          '--rot': `${p.rotation}deg`,
        }"
      ></span>
    </div>
  </Transition>
</template>

<style scoped>
.confetti-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.confetti-particle {
  position: absolute;
  top: -12px;
  opacity: 0;
  animation: confetti-fall linear forwards;
}

@keyframes confetti-fall {
  0% {
    opacity: 1;
    transform: translateY(0) rotate(var(--rot, 0deg)) scale(1);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(105vh) rotate(calc(var(--rot, 0deg) + 540deg)) scale(0.6);
  }
}

.confetti-fade-enter-active { animation: none; }
.confetti-fade-leave-active { transition: opacity 0.5s ease 2s; }
.confetti-fade-leave-to { opacity: 0; }
</style>
