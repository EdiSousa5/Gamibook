<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
</script>

<template>
  <section class="admin-books">
    <div class="header">
      <div>
        <h1>Livros</h1>
        <p class="meta">Area administrativa para gerir livros e catalogo.</p>
      </div>
    </div>

    <UiCard>
      <h2>Em breve</h2>
      <p class="meta">Aqui vais conseguir criar livros, upload de capas e definir modulos.</p>
    </UiCard>
  </section>
</template>

<style scoped>
.admin-books {
  display: grid;
  gap: var(--space-300);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-300);
}

.meta {
  color: var(--color-mirage-500);
}
</style>
