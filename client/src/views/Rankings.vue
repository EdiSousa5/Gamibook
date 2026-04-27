<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import PodiumItem from '@/components/ui/PodiumItem.vue'
import RankingListItem from '@/components/ui/RankingListItem.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiSegmented from '@/components/ui/UiSegmented.vue'
import UiButton from '@/components/ui/UiButton.vue'
import {
  fetchUsers,
  getUserDisplayName,
  getUserAvatarId,
} from '../services/auth'
import { getAssetUrl, getStoredUserId } from '../services/client'
import type { User } from '@/types'

const topGlobal = ref<User[]>([])
const error = ref('')
const isLoading = ref(false)
const displayUserName = (entry?: User | null) => getUserDisplayName(entry)
const getAvatarUrl = (user?: User | null) => getAssetUrl(getUserAvatarId(user))
const currentUserId = getStoredUserId()

// Computadas para separar o pódio da lista restante
const podiumUsers = computed(() => topGlobal.value.slice(0, 3))
const remainingUsersList = computed(() => topGlobal.value.slice(3))

const filterPeriod = ref('all')
const filterOptions = [
  { label: 'Sempre', value: 'all' },
  { label: 'Este Ano', value: 'year' },
  { label: 'Este Mês', value: 'month' },
  { label: 'Esta Semana', value: 'week' },
]

const isUserInList = computed(() => topGlobal.value.some(u => String(u.id) === String(currentUserId)))

const scrollToMe = () => {
  if (!currentUserId) return
  const el = document.getElementById(`user-${currentUserId}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('highlight-pulse')
    setTimeout(() => {
      el.classList.remove('highlight-pulse')
    }, 2500)
  } else {
    alert('Ainda não te encontras nesta tabela de classificação!')
  }
}

onMounted(async () => {
  error.value = ''
  isLoading.value = true
  try {
    // DICA: O ideal sera atualizar a funcao fetchUsers no ficheiro services/auth.ts
    // para passar o filtro nativamente: { filter: { role: { name: { _eq: "Utilizador" } } } }
    // Para já, buscamos mais utilizadores e filtramos no lado do cliente:
    const users = await fetchUsers(50)

    topGlobal.value = users
      .filter((u: any) => u.role?.name === 'Utilizador' || u.role === 'Utilizador')
      .slice(0, 10)
  } catch {
    error.value = 'Não foi possível carregar os rankings.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section class="rankings">
    <div class="filters-row" v-if="topGlobal.length || isLoading">
      <UiSegmented :model-value="filterPeriod" :options="filterOptions" @update="filterPeriod = $event" />
      <UiButton v-if="isUserInList" size="sm" variant="outline" @click="scrollToMe">O Meu Lugar</UiButton>
    </div>

    <p v-if="isLoading" class="state podium-state">A carregar rankings...</p>
    <p v-else-if="error" class="state error podium-state">{{ error }}</p>

    <template v-else-if="topGlobal.length">
      <section class="podium">
        <!-- 2º Lugar -->
        <div class="podium-col place-2-col">
          <PodiumItem v-if="podiumUsers[1]" :user="podiumUsers[1]" :position="2"
            :avatarUrl="getAvatarUrl(podiumUsers[1])" :displayName="displayUserName(podiumUsers[1])" />
        </div>

        <!-- 1º Lugar -->
        <div class="podium-col place-1-col">
          <PodiumItem v-if="podiumUsers[0]" :user="podiumUsers[0]" :position="1"
            :avatarUrl="getAssetUrl(podiumUsers[0]?.avatar) || getAvatarUrl(podiumUsers[0])"
            :displayName="displayUserName(podiumUsers[0])" />
        </div>

        <!-- 3º Lugar -->
        <div class="podium-col place-3-col">
          <PodiumItem v-if="podiumUsers[2]" :user="podiumUsers[2]" :position="3"
            :avatarUrl="getAvatarUrl(podiumUsers[2])" :displayName="displayUserName(podiumUsers[2])" />
        </div>
      </section>

      <div class="list-container">
        <UiCard v-if="remainingUsersList.length" class="list-card">
          <ul class="user-list">
            <RankingListItem v-for="(user, index) in remainingUsersList" :key="user.id || user.email || user.name"
              :id="`user-${user.id}`" :user="user" :position="index + 4"
              :isCurrentUser="String(user.id) === String(currentUserId)" :avatarUrl="getAvatarUrl(user)"
              :displayName="displayUserName(user)" />
          </ul>
        </UiCard>
      </div>
    </template>

    <p v-else-if="!isLoading && !error" class="state">Sem utilizadores disponíveis.</p>
  </section>
</template>

<style scoped>
.rankings {
  padding: 32px 16px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--color-mirage-900);
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-bottom: 32px;
  z-index: 10;
}

.state {
  margin-top: 12px;
  font-weight: 600;
  color: var(--color-mirage-600);
  text-align: center;
}

.error {
  color: #b13b3b;
}

.podium-state {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.podium {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 0;
  width: 100%;
  max-width: 800px;
  margin-top: 24px;
  margin-bottom: 0px;
}

.podium-col {
  flex: 1;
  display: flex;
  justify-content: center;
}

.place-1-col {
  z-index: 3;
  position: relative;
}

.place-2-col {
  z-index: 2;
  position: relative;
}

.place-3-col {
  z-index: 1;
  position: relative;
}

.list-container {
  width: 100%;
  max-width: 1120px;
  position: relative;
  z-index: 10;
  margin-top: -40px;
  /* Faz com que a lista passe um bocado por cima dos pódios */
}

.list-card {
  padding: 16px;
  overflow: hidden;
  background: var(--color-wild-100);
}

.user-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>