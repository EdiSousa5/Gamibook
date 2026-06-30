<script setup lang="ts">
import { useRoute } from 'vue-router'
import UiSideMenuItem from '@/components/ui/UiSideMenuItem.vue'
import {
  UserIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  EyeIcon,
  IdentificationIcon,
  ClockIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()

const sections = [
  { id: 'conta', label: 'Conta', description: 'Perfil e avatar', path: '/settings/conta', icon: UserIcon },
  { id: 'aparencia', label: 'Aparência', description: 'Temas e cores', path: '/settings/aparencia', icon: PaintBrushIcon },
  { id: 'privacidade', label: 'Privacidade', description: 'Segurança e dados', path: '/settings/privacidade', icon: ShieldCheckIcon },
  { id: 'acessibilidade', label: 'Acessibilidade', description: 'Letra, cores e contraste', path: '/settings/acessibilidade', icon: EyeIcon },
  { id: 'dados', label: 'Dados da Conta', description: 'Informação do perfil', path: '/settings/dados', icon: IdentificationIcon },
  { id: 'historico', label: 'Histórico', description: 'Atividade e XP ganho', path: '/settings/historico', icon: ClockIcon },
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
      <div class="side-nav-wrap">
        <nav class="side-nav">
          <UiSideMenuItem v-for="section in sections" :key="section.id" :to="section.path" :label="section.label"
            :description="section.description" :icon="section.icon" :is-active="isActive(section.path)" />
        </nav>
      </div>

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

.side-nav-wrap {
  align-self: start;
  position: sticky;
  top: calc(var(--topbar-height, 4.5rem) + var(--space-300));
}

.side-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
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
    gap: var(--space-400);
  }

  /* Nav com card próprio, separado do panel que agora é transparente */
  .side-nav-wrap {
    background: var(--color-wild-100);
    border: 2px solid var(--color-mirage-800);
    border-radius: var(--radius-200);
    padding: var(--space-150);
    box-shadow: 4px 4px 0 var(--color-shadow);
    overflow: hidden;
  }

  .side-nav-wrap::after {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    width: 40px;
    background: linear-gradient(to right, transparent, var(--color-bg-page, rgba(255,255,255,0)));
    pointer-events: none;
    z-index: 2;
  }

  .side-nav {
    flex-direction: row;
    overflow-x: auto;
    overflow-y: visible;
    gap: var(--space-200);
    padding-bottom: var(--space-100);
    padding-right: var(--space-600);
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
  }

  .side-nav::-webkit-scrollbar {
    display: none;
  }

  /* Panel sem card — os sub-componentes (account-group, etc.) têm os seus próprios cards */
  .panel {
    background: transparent;
    border: none;
    border-radius: 0;
    box-shadow: none;
    padding: 0;
    min-height: unset;
  }
}
</style>
