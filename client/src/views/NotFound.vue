<script setup lang="ts">
import { useRouter } from 'vue-router'
import { HomeIcon } from '@heroicons/vue/24/outline'
import UiButton from '@/components/ui/UiButton.vue'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <div class="card">
      <p class="code">404</p>
      <h1>Página não encontrada</h1>
      <p class="desc">O endereço que tentaste aceder não existe ou foi removido.</p>
      <UiButton variant="primary" @click="router.push('/')">
        <HomeIcon class="icon" aria-hidden="true" />
        Voltar ao início
      </UiButton>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--space-500);
}

.card {
  display: grid;
  place-items: center;
  gap: var(--space-300);
  text-align: center;
  max-width: 420px;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: var(--radius-400);
  box-shadow: 4px 4px 0 var(--color-shadow);
  padding: var(--space-700) var(--space-600);
}

.code {
  margin: 0;
  font-family: var(--font-display);
  font-size: 80px;
  font-weight: 900;
  line-height: 1;
  color: var(--color-deep-600);
}

h1 {
  margin: 0;
  font-size: 22px;
  color: var(--color-mirage-800);
}

.desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-500);
  line-height: 1.6;
}

.icon {
  width: 18px;
  height: 18px;
  stroke-width: var(--icon-stroke);
}
</style>
