<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  EnvelopeIcon,
  StarIcon,
  ClockIcon,
  TrophyIcon,
  ShieldCheckIcon,
  IdentificationIcon,
} from '@heroicons/vue/24/outline'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiSkeleton from '@/components/ui/UiSkeleton.vue'
import { useAuthStore } from '@/stores/auth'
import { fetchUserByIdBase } from '../../services/auth'
import { getStoredUserId } from '../../services/storage'
import type { User } from '@/types'

const authStore = useAuthStore()
const { avatarConfig } = storeToRefs(authStore)

const user = ref<User | null>(null)
const isLoading = ref(true)
const error = ref('')

const fullName = computed(() => {
    const parts = [user.value?.first_name, user.value?.last_name].filter(Boolean)
    return parts.join(' ') || '—'
})

const roleName = computed(() => {
    const role = user.value?.role
    if (!role) return '—'
    if (typeof role === 'object') return role.name ?? '—'
    return String(role)
})

const formattedLastAccess = computed(() => {
    const raw = user.value?.last_access
    if (!raw) return '—'
    return new Date(raw).toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
})

const initials = computed(() => fullName.value.charAt(0).toUpperCase() || 'U')

onMounted(async () => {
    const storedId = getStoredUserId()
    if (!storedId) { isLoading.value = false; return }
    try {
        user.value = await fetchUserByIdBase(storedId)
    } catch {
        error.value = 'Não foi possível carregar os dados do utilizador.'
    } finally {
        isLoading.value = false
    }
})
</script>

<template>
    <div class="settings-section">
        <div class="section-heading">
            <h2>Os meus dados</h2>
            <p class="description">As tuas informações de conta na plataforma GamiBook.</p>
        </div>

        <div v-if="isLoading" class="skeleton-group">
            <UiSkeleton height="5rem" radius="16px" />
            <UiSkeleton height="3.5rem" radius="12px" />
            <UiSkeleton height="3.5rem" radius="12px" />
            <UiSkeleton height="3.5rem" radius="12px" />
            <UiSkeleton height="3.5rem" radius="12px" />
        </div>

        <template v-else-if="user">
            <!-- Cartão de perfil -->
            <div class="profile-card">
                <UiAvatar
                    :alt="initials"
                    :size="60"
                    :asset-id="user.avatar ?? null"
                    :border="avatarConfig.border"
                    :avatar-color="avatarConfig.avatarColor"
                    :effect="avatarConfig.effect"
                    :shadow="avatarConfig.shadow"
                />
                <div class="profile-info">
                    <strong class="profile-name">{{ fullName }}</strong>
                    <span class="role-chip">{{ roleName }}</span>
                </div>
            </div>

            <!-- Lista de campos -->
            <div class="field-list">
                <div class="field-item">
                    <div class="field-icon-wrap">
                        <EnvelopeIcon class="field-icon" aria-hidden="true" />
                    </div>
                    <div class="field-body">
                        <span class="field-label">Email</span>
                        <span class="field-value">{{ user.email ?? '—' }}</span>
                    </div>
                </div>

                <div class="field-item">
                    <div class="field-icon-wrap">
                        <StarIcon class="field-icon" aria-hidden="true" />
                    </div>
                    <div class="field-body">
                        <span class="field-label">Nível</span>
                        <span class="field-value">{{ user.level ?? 1 }}</span>
                    </div>
                </div>

                <div class="field-item">
                    <div class="field-icon-wrap">
                        <TrophyIcon class="field-icon" aria-hidden="true" />
                    </div>
                    <div class="field-body">
                        <span class="field-label">Melhor classificação</span>
                        <span class="field-value">{{ user.best_rank != null ? `#${user.best_rank}` : '—' }}</span>
                    </div>
                </div>

                <div class="field-item">
                    <div class="field-icon-wrap">
                        <ClockIcon class="field-icon" aria-hidden="true" />
                    </div>
                    <div class="field-body">
                        <span class="field-label">Último acesso</span>
                        <span class="field-value">{{ formattedLastAccess }}</span>
                    </div>
                </div>

                <div class="field-item">
                    <div class="field-icon-wrap">
                        <ShieldCheckIcon class="field-icon" aria-hidden="true" />
                    </div>
                    <div class="field-body">
                        <span class="field-label">Perfil privado</span>
                        <span class="field-value">{{ user.profile_private ? 'Sim' : 'Não' }}</span>
                    </div>
                </div>
            </div>

            <!-- ID da conta (secundário) -->
            <div class="id-row">
                <IdentificationIcon class="id-icon" aria-hidden="true" />
                <span class="id-label">ID da conta</span>
                <code class="id-value">{{ user.id }}</code>
            </div>
        </template>

        <p v-else-if="error" class="state error">{{ error }}</p>
        <p v-else class="state">Sem dados para mostrar.</p>
    </div>
</template>

<style scoped>
.settings-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-400);
    max-width: 600px;
}

.section-heading h2 {
    margin: 0 0 var(--space-100) 0;
    font-family: var(--font-display);
}

.description {
    margin: 0;
    font-size: 13px;
    color: var(--color-mirage-600);
}

/* ── Skeletons ────────────────────────────────────────── */
.skeleton-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-300);
}

/* ── Cartão de perfil ─────────────────────────────────── */
.profile-card {
    display: flex;
    align-items: center;
    gap: var(--space-400);
    padding: var(--space-400) var(--space-500);
    border-radius: 16px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 4px 4px 0 var(--color-shadow);
}

.profile-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-150);
    min-width: 0;
}

.profile-name {
    font-size: 18px;
    font-family: var(--font-display);
    font-weight: 800;
    color: var(--color-mirage-800);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.role-chip {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-deep-100);
    font-size: 11px;
    font-weight: 700;
    color: var(--color-deep-700);
    box-shadow: 2px 2px 0 var(--color-deep-300);
    width: fit-content;
}

/* ── Lista de campos ──────────────────────────────────── */
.field-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-200);
}

.field-item {
    display: flex;
    align-items: center;
    gap: var(--space-300);
    padding: var(--space-300) var(--space-400);
    border-radius: 12px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 3px 3px 0 var(--color-shadow);
}

.field-icon-wrap {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--color-wild-300);
    border: 1.5px solid var(--color-mirage-800);
    display: grid;
    place-items: center;
}

.field-icon {
    width: 18px;
    height: 18px;
    color: var(--color-deep-700);
    stroke-width: var(--icon-stroke, 2.25);
}

.field-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.field-label {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-500);
}

.field-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-mirage-800);
    overflow-wrap: anywhere;
}

/* ── ID da conta ──────────────────────────────────────── */
.id-row {
    display: flex;
    align-items: center;
    gap: var(--space-200);
    padding: var(--space-200) var(--space-400);
    border-radius: 10px;
    border: 1.5px dashed var(--color-mirage-400);
    background: var(--color-wild-200);
}

.id-icon {
    width: 14px;
    height: 14px;
    color: var(--color-mirage-500);
    stroke-width: 2.25;
    flex-shrink: 0;
}

.id-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--color-mirage-500);
    flex-shrink: 0;
}

.id-value {
    font-size: 11px;
    color: var(--color-mirage-600);
    font-family: monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}

/* ── Estados ──────────────────────────────────────────── */
.state {
    font-weight: 600;
    color: var(--color-mirage-500);
}

.error {
    color: var(--color-error-strong);
}

@media (max-width: 45em) {
    .profile-card {
        padding: var(--space-300) var(--space-400);
    }

    .profile-name {
        font-size: 16px;
    }

    .id-value {
        font-size: 10px;
    }
}
</style>
