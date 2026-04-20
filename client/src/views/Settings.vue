<script setup lang="ts">
import { useRoute } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'

const route = useRoute()

const sections = [
  { id: 'conta', label: 'Conta', description: 'Perfil e avatar', path: '/settings/conta' },
  { id: 'dados', label: 'Dados do utilizador', description: 'Informacao da conta', path: '/settings/dados' },
  { id: 'notificacoes', label: 'Notificacoes', description: 'Alertas e resumos', path: '/settings/notificacoes' },
  { id: 'idioma', label: 'Idioma', description: 'Preferencias de idioma', path: '/settings/idioma' },
] as const

const isActive = (path: string) => route.path === path
</script>

<template>
  <section class="settings">
    <div class="header">
      <div>
        <h1>Definicoes</h1>
        <p class="meta">Preferencias do utilizador e configuracoes pessoais.</p>
      </div>
      <UiButton variant="outline">Guardar</UiButton>
    </div>

    <div class="settings-body">
      <nav class="side-nav">
        <RouterLink v-for="section in sections" :key="section.id" class="side-item"
          :class="{ active: isActive(section.path) }" :to="section.path">
          <span class="side-title">{{ section.label }}</span>
          <span class="side-desc">{{ section.description }}</span>
        </RouterLink>
      </nav>

      <div class="panel">
        <RouterView />
      </div>
    </div>
  </section>
</template>

<style scoped>
.settings {
  display: grid;
  gap: var(--space-300);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-300);
}

.settings-body {
  display: grid;
  grid-template-columns: minmax(220px, 280px) 1fr;
  gap: var(--space-400);
}

.side-nav {
  display: grid;
  gap: var(--space-200);
}

.side-item {
  display: grid;
  gap: 6px;
  padding: var(--space-200) var(--space-300);
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  text-align: left;
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--color-shadow);
  text-decoration: none;
  color: inherit;
}

.side-item.active {
  border-color: var(--color-deep-600);
  background: #eef7f2;
}

.side-title {
  font-weight: 700;
}

.side-desc {
  font-size: 12px;
  color: var(--color-mirage-600);
}

.panel {
  display: grid;
  gap: var(--space-300);
  background: var(--color-wild-100);
  border-radius: var(--radius-400);
  padding: var(--space-500);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  min-height: 560px;
  align-content: start;
}

@media (max-width: 900px) {
  .settings-body {
    grid-template-columns: 1fr;
  }
}
</style>
