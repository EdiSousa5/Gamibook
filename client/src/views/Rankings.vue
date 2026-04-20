<script setup lang="ts">
import { onMounted, ref } from 'vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiCard from '@/components/ui/UiCard.vue'
import { fetchUsers, getUserDisplayName, type User } from '../services/directus'

const topGlobal = ref<User[]>([])
const error = ref('')
const isLoading = ref(false)
const displayUserName = (entry?: User | null) => getUserDisplayName(entry)

onMounted(async () => {
  error.value = ''
  isLoading.value = true
  try {
    topGlobal.value = await fetchUsers(10)
  } catch {
    error.value = 'Nao foi possivel carregar os rankings.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section class="rankings">
    <h1>Rankings</h1>

    <div class="grid">
      <UiCard class="card">
        <div class="card-header">
          <h2>Top geral points</h2>
          <UiBadge label="Global" />
        </div>
        <p v-if="isLoading" class="state">A carregar...</p>
        <p v-else-if="error" class="state error">{{ error }}</p>
        <ol v-else-if="topGlobal.length">
          <li v-for="user in topGlobal" :key="user.id || user.email || user.name">
            <span>{{ displayUserName(user) }}</span>
            <strong>{{ user.points ?? '-' }}</strong>
          </li>
        </ol>
        <p v-else class="state">Sem dados disponiveis.</p>
      </UiCard>
    </div>
  </section>
</template>

<style scoped>
.rankings {
  display: grid;
  gap: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
}

.card {
  background: transparent;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-200);
}

ol,
ul {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: grid;
  gap: 10px;
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-weight: 700;
}

.meta {
  font-size: 12px;
  color: #6f6f6f;
}

.state {
  margin-top: 12px;
  font-weight: 600;
  color: #6f6f6f;
}

.error {
  color: #b13b3b;
}
</style>
