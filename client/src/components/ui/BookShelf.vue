<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'small' | 'large' | 'hero'
  }>(),
  { variant: 'small' }
)
</script>

<template>
  <div class="estante-wrapper" :class="variant === 'large' ? 'grande' : variant === 'hero' ? 'hero' : 'pequena'">
    <div class="estante-topo"></div>
    <div class="estante-frente"></div>
  </div>
</template>

<style scoped>
.estante-wrapper {
  width: 100%;
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 1; /* Fica atrás dos livros */
  pointer-events: none;
}

/* Variante: Grande (Usada no destaque, toca nas bordas) */
.estante-wrapper.grande {
  left: -24px;
  width: calc(100% + 48px);
  bottom: -16px;
}

.estante-wrapper.grande .estante-topo {
  height: 32px;
  background: linear-gradient(to bottom, var(--color-deep-200), var(--color-deep-400));
  border: 2px solid var(--color-mirage-800);
  border-bottom: none;
  transform-origin: bottom;
  transform: perspective(600px) rotateX(40deg);
}

.estante-wrapper.grande .estante-frente {
  height: 20px;
  background: var(--color-deep-600);
  border: 2px solid var(--color-mirage-800);
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  box-shadow: 0 16px 24px -8px rgba(2, 29, 32, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

/* Variante: Hero (Página inicial — estante em destaque) */
.estante-wrapper.hero {
  left: 0;
  width: 100%;
  bottom: 0;
}

.estante-wrapper.hero .estante-topo {
  height: 44px;
  background: linear-gradient(to bottom, var(--color-deep-100), var(--color-deep-300));
  border: 2px solid var(--color-mirage-900);
  border-bottom: none;
  transform-origin: bottom;
  transform: perspective(480px) rotateX(36deg);
}

.estante-wrapper.hero .estante-frente {
  height: 32px;
  background: linear-gradient(to bottom, var(--color-deep-500), var(--color-deep-700));
  border: 2px solid var(--color-mirage-900);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow:
    0 18px 40px -6px rgba(2, 29, 32, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Variante: Pequena (Usada na lista de livros) */
.estante-wrapper.pequena {
  left: 0;
  width: 100%;
  bottom: 0;
}

.estante-wrapper.pequena .estante-topo {
  height: 24px;
  background: linear-gradient(to bottom, var(--color-deep-200), var(--color-deep-400));
  border: 2px solid var(--color-mirage-800);
  border-bottom: none;
  transform-origin: bottom;
  transform: perspective(500px) rotateX(40deg);
}

.estante-wrapper.pequena .estante-frente {
  height: 16px;
  background: var(--color-deep-600);
  border: 2px solid var(--color-mirage-800);
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  box-shadow: 0 8px 16px -4px rgba(2, 29, 32, 0.4);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}
</style>