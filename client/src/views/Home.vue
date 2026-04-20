<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
</script>

<template>
  <section class="landing">
    <div class="halo"></div>
    <div class="content">
      <p class="tag">Aprender nunca foi tao simples</p>
      <h1>O jeito divertido e eficaz de dominar os teus livros.</h1>
      <p class="subtitle">Entra para transformares cada leitura num jogo.</p>
      <div class="cta">
        <RouterLink to="/register" custom v-slot="{ navigate }">
          <UiButton size="lg" variant="primary" @click="navigate">Comecar agora</UiButton>
        </RouterLink>
        <RouterLink to="/login" custom v-slot="{ navigate }">
          <UiButton size="lg" variant="outline" @click="navigate">Ja tenho uma conta</UiButton>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>

.landing {
  min-height: calc(100vh - 120px);
  display: grid;
  place-items: center;
  text-align: center;
  padding: var(--space-800) var(--space-500);
  position: relative;
  overflow: hidden;
}

.halo {
  position: absolute;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(12, 122, 90, 0.18), transparent 65%);
  top: -120px;
  right: -80px;
  z-index: 0;
}

.content {
  display: grid;
  gap: var(--space-300);
  max-width: 640px;
  position: relative;
  z-index: 1;
}

.tag {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 12px;
  color: var(--color-deep-700);
  font-weight: 700;
}

h1 {
  font-size: clamp(28px, 4vw, 44px);
  margin: 0;
}

.subtitle {
  font-size: 16px;
  color: var(--color-mirage-500);
}


.cta {
  display: flex;
  gap: var(--space-300);
  justify-content: center;
  margin-top: var(--space-200);
}

@media (max-width: 640px) {
  .cta {
    flex-direction: column;
  }
}
</style>
