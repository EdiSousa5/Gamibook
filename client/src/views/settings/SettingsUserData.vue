<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchUserByIdBase } from '../../services/auth'
import { getStoredUserId } from '../../services/storage'
import type { User } from '@/types'

const user = ref<User | null>(null)
const error = ref('')

const userFields = computed(() => {
    if (!user.value) return []
    return Object.entries(user.value).map(([key, value]) => {
        if (value == null) return [key, '-'] as const
        if (typeof value === 'object') return [key, JSON.stringify(value)] as const
        return [key, String(value)] as const
    })
})

const loadUser = async () => {
    const storedId = getStoredUserId()
    if (!storedId) return
    error.value = ''
    try {
        user.value = await fetchUserByIdBase(storedId)
    } catch {
        error.value = 'Não foi possível carregar os dados do utilizador.'
    }
}

onMounted(loadUser)
</script>

<template>
    <div class="settings-section">
        <div class="section-header">
            <h2>Dados do utilizador</h2>
            <p class="meta">Campos do utilizador atual vindos do Directus.</p>
        </div>

        <div v-if="userFields.length" class="field-grid">
            <div v-for="[key, value] in userFields" :key="key" class="field-row">
                <span class="field-key">{{ key }}</span>
                <span class="field-value">{{ value }}</span>
            </div>
        </div>
        <p v-else-if="error" class="state error">{{ error }}</p>
        <p v-else class="state">Sem dados para mostrar.</p>
    </div>
</template>

<style scoped>
.settings-section {
    display: grid;
    gap: var(--space-300);
    width: 100%;
}

.section-header {
    display: grid;
    gap: 6px;
}

.field-grid {
    display: grid;
    gap: 8px;
}

.field-row {
    display: grid;
    grid-template-columns: minmax(120px, 180px) minmax(0, 1fr);
    gap: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid #d7d7d7;
    background: #fff;
    min-width: 0;
}

.field-key {
    font-weight: 600;
    overflow-wrap: anywhere;
}

.field-value {
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
}

.meta {
    color: var(--color-mirage-500);
}

.state {
    font-weight: 600;
    color: var(--color-mirage-500);
}

.error {
    color: var(--color-error-strong);
}

@media (max-width: 45em) {
    .field-row {
        grid-template-columns: 1fr;
        gap: 4px;
    }

    .field-key {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: var(--color-mirage-500);
    }
}
</style>
