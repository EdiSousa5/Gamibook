<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiChip from '@/components/ui/UiChip.vue'
import { fetchUserById, getUserDisplayName } from '@/services/auth'
import { getAssetUrl } from '@/services/client'
import type { User } from '@/types'

const user = ref<User | null>(null)

onMounted(async () => {
  const storedId = localStorage.getItem('gb_user_id')
  if (!storedId) return
  try {
    user.value = await fetchUserById(storedId)
  } catch {
    user.value = null
  }
})

const displayName = computed(() => getUserDisplayName(user.value))
const email = computed(() => user.value?.email ?? '—')
const avatarUrl = computed(() => getAssetUrl(user.value?.avatar ?? user.value?.avatar_img ?? ''))
const initials = computed(() => displayName.value.charAt(0).toUpperCase())
const joinedAt = computed(() => {
  const raw = user.value?.date_created
  if (!raw) return '—'
  return new Date(raw).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
})

import { ChartBarIcon, CogIcon, SparklesIcon, SwatchIcon } from '@heroicons/vue/24/outline'

const quickLinks = [
  { label: 'Estatísticas', desc: 'Dados de livros e utilizadores', to: '/admin/stats', icon: ChartBarIcon },
  { label: 'Gerar exercícios', desc: 'Criar exercícios com IA', to: '/exercise-generator', icon: SparklesIcon },
  { label: 'Definições', desc: 'Configurações da conta', to: '/settings', icon: CogIcon },
  { label: 'UI Kit', desc: 'Componentes visuais', to: '/ui-kit', icon: SwatchIcon },
]
</script>

<template>
  <section class="admin-home">
    <header class="page-header">
      <p class="kicker">Painel de administração</p>
      <h1>Bem-vindo de volta<span v-if="displayName">, {{ displayName.split(' ')[0] }}</span></h1>
    </header>

    <UiCard class="account-card">
      <div class="account-inner">
        <UiAvatar :alt="initials" :src="avatarUrl" :size="72" />
        <div class="account-info">
          <div class="account-name-row">
            <strong class="account-name">{{ displayName }}</strong>
            <UiChip label="Admin" variant="filled" />
          </div>
          <span class="account-email">{{ email }}</span>
          <span class="account-joined">Conta criada em {{ joinedAt }}</span>
        </div>
      </div>
    </UiCard>

    <div class="links-grid">
      <RouterLink
        v-for="link in quickLinks"
        :key="link.to"
        :to="link.to"
        class="link-card"
      >
        <div class="link-icon-wrap" aria-hidden="true">
          <component :is="link.icon" class="link-icon" />
        </div>
        <div class="link-text">
          <strong>{{ link.label }}</strong>
          <span>{{ link.desc }}</span>
        </div>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.admin-home {
  display: grid;
  gap: var(--space-500);
}

.page-header {
  display: grid;
  gap: var(--space-100);
}

.kicker {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-mirage-500);
}

h1 {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-mirage-800);
  margin: 0;
}

.account-card {}

.account-inner {
  display: flex;
  align-items: center;
  gap: var(--space-400);
}

.account-info {
  display: grid;
  gap: var(--space-100);
  min-width: 0;
}

.account-name-row {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  flex-wrap: wrap;
}

.account-name {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.account-email {
  font-size: 13px;
  color: var(--color-mirage-600);
  font-weight: 500;
}

.account-joined {
  font-size: 12px;
  color: var(--color-mirage-400);
  font-weight: 500;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-400);
}

.link-card {
  display: flex;
  align-items: center;
  gap: var(--space-300);
  padding: var(--space-400);
  border-radius: 16px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.link-card:hover {
  transform: translateY(-3px);
  box-shadow: 4px 7px 0 var(--color-shadow);
}

.link-card:active {
  transform: translateY(1px);
  box-shadow: 3px 3px 0 var(--color-shadow);
}

.link-icon-wrap {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  background: var(--color-deep-100);
  display: grid;
  place-items: center;
}

.link-icon {
  width: 22px;
  height: 22px;
  color: var(--color-deep-700);
  stroke-width: 1.5;
}

.link-text {
  display: grid;
  gap: 2px;
}

.link-text strong {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.link-text span {
  font-size: 12px;
  color: var(--color-mirage-500);
}
</style>
