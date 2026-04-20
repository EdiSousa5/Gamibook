<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiChip from '@/components/ui/UiChip.vue'
</script>

<template>
  <section class="help">
    <div class="header">
      <div>
        <h1>Ajuda</h1>
        <p class="meta">Precisas de ajuda? Aqui estao os atalhos mais rapidos.</p>
      </div>
      <UiChip label="Suporte" variant="outline" />
    </div>

    <div class="grid">
      <UiCard>
        <h2>FAQs</h2>
        <p class="meta">Explora respostas rapidas para as duvidas mais comuns.</p>
        <UiButton variant="secondary">Ver FAQs</UiButton>
      </UiCard>
      <UiCard>
        <h2>Contacto direto</h2>
        <p class="meta">Fala connosco e responde a uma pessoa da equipa.</p>
        <UiButton variant="primary">Enviar mensagem</UiButton>
      </UiCard>
      <UiCard>
        <h2>Estado da plataforma</h2>
        <p class="meta">Consulta disponibilidade e manutencao programada.</p>
        <UiButton variant="outline">Ver estado</UiButton>
      </UiCard>
    </div>
  </section>
</template>

<style scoped>
.help {
  display: grid;
  gap: var(--space-300);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-300);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-300);
}

.meta {
  color: var(--color-mirage-500);
}
</style>
