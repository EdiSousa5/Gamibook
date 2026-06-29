<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { PaperClipIcon, UserCircleIcon, KeyIcon } from '@heroicons/vue/24/outline'
import {
    fetchUserByIdBase,
    getUserAvatarId,
    updateUser,
    uploadUserAvatar,
} from '../../services/auth'
import { getAssetUrl, getStoredUserId } from '../../services/client'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import type { User } from '@/types'

const auth = useAuthStore()
const { error: toastError, success: toastSuccess } = useToast()

const user = ref<User | null>(null)
const isLoading = ref(false)

// Perfil
const name = ref('')
const isSavingProfile = ref(false)
const avatarPreview = ref('')
const avatarFile = ref<File | null>(null)
const fileName = ref('Nenhum ficheiro escolhido')

// Credenciais
const newPassword = ref('')
const confirmPassword = ref('')
const isSavingCredentials = ref(false)

const avatar = computed(() => {
    if (avatarPreview.value) return avatarPreview.value
    return getAssetUrl(getUserAvatarId(user.value))
})

const onAvatarChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
        toastError('Ficheiro demasiado grande. O tamanho máximo é 5 MB.')
        target.value = ''
        return
    }
    if (!file.type.startsWith('image/')) {
        toastError('Formato inválido. Escolhe uma imagem (JPG, PNG ou GIF).')
        target.value = ''
        return
    }
    avatarFile.value = file
    fileName.value = file.name
    const reader = new FileReader()
    reader.onload = () => { avatarPreview.value = String(reader.result || '') }
    reader.readAsDataURL(file)
}

const loadProfile = async () => {
    const storedId = getStoredUserId()
    if (!storedId) { user.value = null; return }
    isLoading.value = true
    try {
        const me = await fetchUserByIdBase(storedId)
        user.value = me
        name.value = [me.first_name, me.last_name].filter(Boolean).join(' ').trim() || ''
    } catch {
        toastError('Não foi possível carregar o perfil.')
    } finally {
        isLoading.value = false
    }
}

const saveProfile = async () => {
    if (!user.value?.id) return
    const userId = String(user.value.id)
    const trimmedName = name.value.trim().replace(/[<>"'&]/g, '').slice(0, 100)
    if (!trimmedName || trimmedName.length < 2) {
        toastError('Nome inválido (mínimo 2 caracteres).')
        return
    }
    const [firstName, ...rest] = trimmedName.split(' ').filter(Boolean)
    const lastName = rest.join(' ') || undefined
    isSavingProfile.value = true
    try {
        await updateUser(userId, { first_name: firstName || undefined, last_name: lastName })
        if (avatarFile.value) {
            try {
                const avatarId = await uploadUserAvatar(userId, avatarFile.value)
                if (user.value) user.value.avatar = avatarId
                avatarFile.value = null
                avatarPreview.value = ''
                fileName.value = 'Nenhum ficheiro escolhido'
            } catch {
                toastError('Perfil guardado, mas não foi possível carregar o avatar.')
                await auth.loadUser()
                return
            }
        }
        await auth.loadUser()
        toastSuccess('Perfil guardado com sucesso.')
    } catch {
        toastError('Não foi possível guardar o perfil.')
    } finally {
        isSavingProfile.value = false
    }
}

const saveCredentials = async () => {
    if (!user.value?.id) return
    if (!newPassword.value) {
        toastError('Preenche a nova palavra-passe.')
        return
    }
    if (newPassword.value.length < 8) {
        toastError('A palavra-passe deve ter pelo menos 8 caracteres.')
        return
    }
    if (newPassword.value !== confirmPassword.value) {
        toastError('As palavras-passe não coincidem.')
        return
    }
    isSavingCredentials.value = true
    try {
        await updateUser(String(user.value.id), { password: newPassword.value })
        newPassword.value = ''
        confirmPassword.value = ''
        await auth.loadUser()
        toastSuccess('Palavra-passe atualizada com sucesso.')
    } catch {
        toastError('Não foi possível atualizar a palavra-passe.')
    } finally {
        isSavingCredentials.value = false
    }
}

onMounted(loadProfile)
</script>

<template>
    <div class="settings-section">
        <div class="section-header">
            <h2>Conta</h2>
            <p class="meta">Gere o teu perfil e credenciais de acesso.</p>
        </div>

        <p v-if="isLoading" class="state">A carregar perfil...</p>

        <template v-else>
            <!-- Perfil -->
            <div class="account-group">
                <div class="group-header">
                    <div class="group-icon-wrap">
                        <UserCircleIcon class="group-icon" aria-hidden="true" />
                    </div>
                    <div>
                        <h3>Perfil</h3>
                        <p>Nome de apresentação e fotografia.</p>
                    </div>
                </div>
                <div class="group-body">
                    <div class="avatar-section">
                        <div class="avatar-preview-wrap">
                            <UiAvatar
                                v-if="avatar"
                                :src="avatar"
                                alt="Avatar"
                                :size="88"
                                :border="auth.avatarConfig.border"
                                :avatar-color="auth.avatarConfig.avatarColor"
                                :effect="auth.avatarConfig.effect"
                                :shadow="auth.avatarConfig.shadow"
                            />
                        </div>
                        <label class="file-field">
                            <div class="file-picker">
                                <PaperClipIcon class="file-icon" aria-hidden="true" />
                                <span class="file-name">{{ fileName }}</span>
                                <span class="file-action">Selecionar foto</span>
                                <input type="file" accept="image/*" @change="onAvatarChange" />
                            </div>
                            <span class="file-hint">JPG, PNG ou GIF · máx. 5 MB</span>
                        </label>
                    </div>
                    <UiInput label="Nome de apresentação" :model-value="name" @update="name = String($event)" />
                    <div class="group-actions">
                        <UiButton type="button" :loading="isSavingProfile" @click="saveProfile">Guardar perfil</UiButton>
                    </div>
                </div>
            </div>

            <!-- Credenciais -->
            <div class="account-group">
                <div class="group-header">
                    <div class="group-icon-wrap">
                        <KeyIcon class="group-icon" aria-hidden="true" />
                    </div>
                    <div>
                        <h3>Palavra-passe</h3>
                        <p>Email: <strong class="current-value">{{ user?.email || '—' }}</strong></p>
                    </div>
                </div>
                <div class="group-body">
                    <UiInput
                        label="Nova palavra-passe"
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        :model-value="newPassword"
                        @update="newPassword = String($event)"
                    />
                    <UiInput
                        label="Confirmar palavra-passe"
                        type="password"
                        placeholder="Repete a nova palavra-passe"
                        :model-value="confirmPassword"
                        @update="confirmPassword = String($event)"
                    />
                    <div class="group-actions">
                        <UiButton
                            type="button"
                            :disabled="!newPassword"
                            :loading="isSavingCredentials"
                            @click="saveCredentials"
                        >
                            Alterar palavra-passe
                        </UiButton>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.settings-section {
    display: grid;
    gap: var(--space-400);
    max-width: 42.5rem;
    width: 100%;
}

.section-header h2 { margin: 0; font-family: var(--font-display); font-size: clamp(1.125rem, 3vw, 1.375rem); }
.meta { margin: 0; color: var(--color-mirage-500); font-size: 0.8125rem; }
.state { font-weight: 600; color: var(--color-mirage-500); font-size: 0.875rem; }

.account-group {
    border: 2px solid var(--color-mirage-800);
    border-radius: var(--radius-400);
    box-shadow: 3px 3px 0 var(--color-shadow);
    overflow: hidden;
}

.group-header {
    display: flex;
    align-items: center;
    gap: var(--space-300);
    padding: var(--space-300) var(--space-400);
    background: var(--color-wild-200);
    border-bottom: 2px solid var(--color-mirage-800);
}

.group-icon-wrap {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.625rem;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 2px 2px 0 var(--color-shadow);
    display: grid;
    place-items: center;
    flex-shrink: 0;
}

.group-icon { width: 1.125rem; height: 1.125rem; color: var(--color-deep-700); stroke-width: 2; }
.group-header h3 { margin: 0 0 2px; font-size: 0.9375rem; font-weight: 800; font-family: var(--font-display); color: var(--color-mirage-800); }
.group-header p { margin: 0; font-size: 0.75rem; color: var(--color-mirage-500); }
.current-value { color: var(--color-mirage-700); }

.group-body {
    padding: var(--space-400);
    display: grid;
    gap: var(--space-300);
    background: var(--color-wild-100);
}

/* Avatar section */
.avatar-section {
    display: flex;
    align-items: center;
    gap: var(--space-400);
    padding: var(--space-300) var(--space-400);
    background: var(--color-wild-200);
    border: 2px solid var(--color-wild-500);
    border-radius: 0.875rem;
}

.avatar-preview-wrap { flex-shrink: 0; }

.file-field {
    flex: 1;
    display: grid;
    gap: var(--space-150);
    cursor: pointer;
    min-width: 0;
}

.file-picker {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-200);
    padding: var(--space-200) var(--space-300);
    border-radius: 999px;
    border: 2px dashed var(--color-mirage-800);
    background: var(--color-wild-100);
    box-shadow: 3px 3px 0 var(--color-shadow);
    cursor: pointer;
}

.file-picker input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.file-icon { width: 1rem; height: 1rem; color: var(--color-mirage-600); flex-shrink: 0; }
.file-name { font-size: 0.75rem; color: var(--color-mirage-500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.file-action {
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    font-size: 0.6875rem;
    font-weight: 700;
    white-space: nowrap;
    box-shadow: 2px 2px 0 var(--color-shadow);
    transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
}

.file-picker:hover .file-action { background: var(--color-wild-200); }
.file-picker:active .file-action { transform: translate(2px, 2px); box-shadow: 0 0 0 var(--color-shadow); }
.file-hint { font-size: 0.6875rem; font-weight: 600; color: var(--color-mirage-400); }

/* Credentials divider */
.creds-divider {
    display: flex;
    align-items: center;
    gap: var(--space-200);
    margin: var(--space-100) 0;
}

.creds-divider::before,
.creds-divider::after {
    content: '';
    flex: 1;
    height: 1.5px;
    background: var(--color-wild-500);
}

.creds-divider span {
    font-size: 0.625rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-mirage-400);
    white-space: nowrap;
}

.creds-hint { margin: 0; font-size: 0.6875rem; font-weight: 600; color: var(--color-mirage-400); }
.group-actions { display: flex; gap: var(--space-200); }

@media (max-width: 37.5em) {
    .group-body { padding: var(--space-300); }
    .group-header { padding: var(--space-200) var(--space-300); }
}

@media (max-width: 30em) {
    .avatar-section { flex-direction: column; align-items: flex-start; }
    .file-picker { grid-template-columns: auto 1fr; }
    .file-action { display: none; }
}
</style>
