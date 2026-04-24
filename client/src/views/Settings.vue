<script setup lang="ts">
import { useRoute } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiSideMenuItem from '@/components/ui/UiSideMenuItem.vue'
import {
  UserIcon,
  IdentificationIcon,
  BellIcon,
  PaintBrushIcon,
  ShieldCheckIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()

const sections = [
  { id: 'conta', label: 'Conta', description: 'Perfil e avatar', path: '/settings/conta', icon: UserIcon },
  { id: 'dados', label: 'Dados Pessoais', description: 'Informação do utilizador', path: '/settings/dados', icon: IdentificationIcon },
  { id: 'aparencia', label: 'Aparência', description: 'Temas e cores', path: '/settings/aparencia', icon: PaintBrushIcon },
  { id: 'notificacoes', label: 'Notificações', description: 'Alertas e resumos', path: '/settings/notificacoes', icon: BellIcon },
  { id: 'privacidade', label: 'Privacidade', description: 'Segurança e dados', path: '/settings/privacidade', icon: ShieldCheckIcon },
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
        <UiSideMenuItem v-for="section in sections" :key="section.id" :to="section.path" :label="section.label"
          :description="section.description" :icon="section.icon" :is-active="isActive(section.path)" />
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
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-self: start;
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
