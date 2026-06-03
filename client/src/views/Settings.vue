<script setup lang="ts">
import { useRoute } from 'vue-router'
import UiSideMenuItem from '@/components/ui/UiSideMenuItem.vue'
import {
  UserIcon,
  IdentificationIcon,
  BellIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  EyeIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()

const sections = [
  { id: 'conta', label: 'Conta', description: 'Perfil e avatar', path: '/settings/conta', icon: UserIcon },
  { id: 'dados', label: 'Dados Pessoais', description: 'Informação do utilizador', path: '/settings/dados', icon: IdentificationIcon },
  { id: 'aparencia', label: 'Aparência', description: 'Temas e cores', path: '/settings/aparencia', icon: PaintBrushIcon },
  { id: 'notificacoes', label: 'Notificações', description: 'Alertas e resumos', path: '/settings/notificacoes', icon: BellIcon },
  { id: 'privacidade', label: 'Privacidade', description: 'Segurança e dados', path: '/settings/privacidade', icon: ShieldCheckIcon },
  { id: 'acessibilidade', label: 'Acessibilidade', description: 'Letra, cores e contraste', path: '/settings/acessibilidade', icon: EyeIcon },
] as const

const isActive = (path: string) => route.path === path
</script>

<template>
  <section class="settings">
    <div class="header">
      <div>
        <h1>Definições</h1>
        <p class="meta">Preferências do utilizador e configurações pessoais.</p>
      </div>
    </div>

    <div class="settings-body">
      <nav class="side-nav">
        <UiSideMenuItem v-for="section in sections" :key="section.id" :to="section.path" :label="section.label"
          :description="section.description" :icon="section.icon" :is-active="isActive(section.path)" />
      </nav>

      <p class="side-nav-hint">No telemóvel, desliza para ver mais opções.</p>

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
  grid-template-columns: minmax(13.75rem, 17.5rem) 1fr;
  gap: var(--space-400);
  align-items: start;
}

.side-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
  align-self: start;
  position: sticky;
  top: calc(var(--topbar-height, 4.5rem) + var(--space-300));
}

.side-nav-hint {
  display: none;
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-mirage-500);
}

.panel {
  display: grid;
  gap: var(--space-300);
  background: var(--color-wild-100);
  border-radius: var(--radius-400);
  padding: var(--space-500);
  padding-bottom: calc(var(--space-500) + 0.5rem);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  min-height: 35rem;
  align-content: start;
  overflow: visible;
}

@media (max-width: 56.25em) {
  .settings-body {
    grid-template-columns: minmax(11rem, 13rem) 1fr;
    gap: var(--space-300);
  }
}

@media (max-width: 45em) {
  .settings {
    gap: var(--space-200);
  }

  .settings-body {
    grid-template-columns: 1fr;
    gap: var(--space-200);
  }

  .side-nav {
    position: static;
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    gap: var(--space-150);
    padding-bottom: var(--space-100);
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .side-nav::-webkit-scrollbar {
    display: none;
  }

  .side-nav-hint {
    display: block;
  }

  .panel {
    padding: var(--space-300);
    min-height: unset;
  }
}
</style>
