<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import logoUrl from '@/assets/images/gamibook_logo.jpg'
import NavItem from './NavItem.vue'
import { useAuthStore } from '@/stores/auth'

const { avatarConfig } = storeToRefs(useAuthStore())

type NavEntry = {
  label: string
  to?: string
  icon?: string
  isAction?: boolean
  exact?: boolean
  dataTour?: string
}

type Props = {
  items: NavEntry[]
  username: string
  avatarAssetId?: string | null
  open?: boolean
}

const props = defineProps<Props>()
defineEmits<{ action: [string]; close: [] }>()

const initials = computed(() => {
  const value = props.username?.trim() || 'U'
  return value.charAt(0).toUpperCase()
})
</script>

<template>
  <div v-if="open" class="sidebar-backdrop" aria-hidden="true" @click="$emit('close')" />

  <aside class="sidebar" :class="{ 'is-open': open }">
    <div class="top">
      <div class="logo">
        <img :src="logoUrl" alt="GamiBook" />
      </div>
    </div>

    <nav class="nav" data-tour="sidebar" @click="$emit('close')">
      <div v-for="item in items" :key="item.label" :data-tour="item.dataTour">
        <NavItem :label="item.label" :to="item.to" :icon="item.icon"
          :is-action="item.isAction" :exact="item.exact" @click="item.isAction ? $emit('action', item.label) : null" />
      </div>
    </nav>

    <div class="spacer"></div>

    <div class="footer">
      <UiAvatar
        :alt="initials"
        :size="56"
        :asset-id="avatarAssetId"
        :border="avatarConfig.border"
        :avatar-color="avatarConfig.avatarColor"
        :effect="avatarConfig.effect"
        :shadow="avatarConfig.shadow"
      />
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
  min-width: 14.375rem;
  background: var(--color-wild-100);
  border-right: 2px solid var(--color-mirage-800);
  display: flex;
  flex-direction: column;
  padding: var(--space-400) var(--space-300);
  gap: var(--space-300);
  height: 100dvh;
  position: sticky;
  top: 0;
  z-index: 10;
  overflow: hidden;
}

.top {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(var(--topbar-height, 6rem) - 1.5rem);
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
  height: 3.25rem;
  object-fit: contain;
  display: block;
}

.nav {
  display: grid;
  gap: var(--space-300);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: var(--space-200);
  padding-bottom: var(--space-200);
  padding-top: var(--space-500);
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
  min-width: 0;
}

.text {
  display: grid;
  gap: 0.375rem;
  min-width: 0;
}

.text strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9375rem;
}

.welcome {
  font-size: 0.875rem;
  color: var(--color-mirage-500);
  font-weight: 600;
}

/* ── Backdrop (mobile) ── */
.sidebar-backdrop {
  display: none;
}

/* ── Drawer (tablet + mobile) ── */
@media (max-width: 64em) {
  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(14, 22, 27, 0.5);
    z-index: 49;
    animation: backdrop-in 0.2s ease both;
  }

  @keyframes backdrop-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: min(18rem, 85vw);
    min-width: unset;
    height: 100dvh;
    border-right: 2px solid var(--color-mirage-800);
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 50;
    overflow-y: auto;
    overflow-x: hidden;
    box-shadow: 4px 0 24px rgba(14, 22, 27, 0.18);
  }

  .sidebar.is-open {
    transform: translateX(0);
  }

  .nav {
    padding-top: var(--space-500);
  }
}
</style>
