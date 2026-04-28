<script setup lang="ts">
import { computed } from 'vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import logoUrl from '@/assets/images/gamibook_logo.png'
import NavItem from './NavItem.vue'

type NavEntry = {
  label: string
  to?: string
  icon?: string
  isAction?: boolean
  exact?: boolean
}

type Props = {
  items: NavEntry[]
  username: string
  avatarUrl?: string
}

const props = defineProps<Props>()
defineEmits<{ action: [string] }>()

const initials = computed(() => {
  const value = props.username?.trim() || 'U'
  return value.charAt(0).toUpperCase()
})
</script>

<template>
  <aside class="sidebar">
    <div class="top">
      <div class="logo">
        <img :src="logoUrl" alt="GamiBook" />
      </div>
    </div>

    <nav class="nav">
      <NavItem v-for="item in items" :key="item.label" :label="item.label" :to="item.to" :icon="item.icon"
        :is-action="item.isAction" :exact="item.exact" @click="item.isAction ? $emit('action', item.label) : null" />
    </nav>

    <div class="spacer"></div>

    <div class="footer">
      <UiAvatar :alt="initials" :size="56" :src="avatarUrl" />
      <div class="text">
        <span class="welcome">Bem-vindo!</span>
        <strong>{{ username || 'Utilizador' }}</strong>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: max-content;
  min-width: 230px;
  background: var(--color-wild-100);
  border-right: 2px solid var(--color-mirage-800);
  display: flex;
  flex-direction: column;
  padding: var(--space-400) var(--space-300);
  gap: var(--space-300);
  height: 100vh;
  position: sticky;
  top: 0;
  z-index: 10;
  overflow: hidden;
}

.top {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(var(--topbar-height, 96px) - 24px);
  padding-bottom: 0;
  border-bottom: 2px solid var(--color-mirage-800);
}

.logo {
  font-family: var(--font-display);
  display: inline-flex;
  align-items: center;
  width: 100%;
  justify-content: center;
}

.logo img {
  width: 100%;
  height: 52px;
  object-fit: contain;
  display: block;
}

.nav {
  display: grid;
  gap: var(--space-400);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: var(--space-200);
  padding-bottom: var(--space-200);
  margin-top: var(--space-600);
}

.spacer {
  flex: 1;
}

.footer {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  padding: var(--space-200) 0 0;
  border-top: 2px solid var(--color-mirage-800);
}

.text {
  display: grid;
  gap: 6px;
}

.welcome {
  font-size: 14px;
  color: var(--color-mirage-500);
  font-weight: 600;
}

@media (max-width: 900px) {
  .sidebar {
    padding: var(--space-400) var(--space-300);
  }

  .logo img {
    width: 120px;
  }

  .sidebar {
    min-width: 200px;
  }
}

@media (max-width: 720px) {
  .sidebar {
    position: relative;
    height: auto;
    width: 100%;
    border-right: none;
    border-bottom: 2px solid var(--color-mirage-800);
  }
}
</style>
