<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'
import { PaperClipIcon } from '@heroicons/vue/24/outline'
import {
    fetchUserById,
    getAssetUrl,
    getUserAvatarId,
    updateUser,
    uploadUserAvatar,
    type User,
} from '../../services/directus'

const user = ref<User | null>(null)
const name = ref('')
const error = ref('')
const isLoading = ref(false)
const avatarPreview = ref('')
const avatarFile = ref<File | null>(null)
const fileName = ref('Nenhum ficheiro escolhido')

const avatar = computed(() => {
    if (avatarPreview.value) return avatarPreview.value
    return getAssetUrl(getUserAvatarId(user.value))
})

const onAvatarChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
    avatarFile.value = file
    fileName.value = file.name
    const reader = new FileReader()
    reader.onload = () => {
        avatarPreview.value = String(reader.result || '')
    }
    reader.readAsDataURL(file)
}

const loadProfile = async () => {
    const storedId = localStorage.getItem('gb_user_id')
    if (!storedId) {
        user.value = null
        return
    }

    error.value = ''
    isLoading.value = true
    try {
        const me = await fetchUserById(storedId)
        user.value = me
        name.value = [me.first_name, me.last_name].filter(Boolean).join(' ').trim() || ''
    } catch {
        error.value = 'Nao foi possivel carregar o perfil.'
    } finally {
        isLoading.value = false
    }
}

const saveProfile = async () => {
    error.value = ''
    if (!user.value?.id) return
    const trimmedName = name.value.trim()
    const [firstName, ...rest] = trimmedName.split(' ').filter(Boolean)
    const lastName = rest.join(' ') || undefined
    try {
        user.value = await updateUser(user.value.id, {
            first_name: firstName || undefined,
            last_name: lastName,
        })
        if (avatarFile.value) {
            const avatarId = await uploadUserAvatar(String(user.value.id), avatarFile.value)
            user.value = { ...user.value, avatar: avatarId }
            avatarFile.value = null
            avatarPreview.value = ''
        }
        window.dispatchEvent(new Event('gb-auth-changed'))
    } catch {
        error.value = 'Nao foi possivel guardar o perfil.'
    }
}

onMounted(loadProfile)
</script>

<template>
    <div class="settings-section">
        <div class="section-header">
            <h2>Conta</h2>
            <p class="meta">Atualiza o teu nome e avatar.</p>
        </div>

        <div class="form">
            <UiInput label="Nome" :model-value="name" @update="name = String($event)" />
            <label class="file-field">
                <span class="label">Avatar</span>
                <div class="file-picker">
                    <PaperClipIcon class="file-icon" aria-hidden="true" />
                    <span class="file-name">{{ fileName }}</span>
                    <span class="file-action">Selecionar</span>
                    <input type="file" accept="image/*" @change="onAvatarChange" />
                </div>
            </label>
            <div v-if="avatar" class="avatar">
                <UiAvatar :src="avatar" alt="Avatar" :size="96" />
            </div>
            <p v-if="isLoading" class="state">A carregar perfil...</p>
            <p v-else-if="error" class="state error">{{ error }}</p>
            <UiButton type="button" class="cta" @click="saveProfile">Guardar</UiButton>
        </div>
    </div>
</template>

<style scoped>
.settings-section {
    display: grid;
    gap: var(--space-300);
}

.section-header {
    display: grid;
    gap: 6px;
}

.form {
    display: grid;
    gap: 12px;
}

.file-field {
    display: grid;
    gap: var(--space-150);
    font-weight: 600;
    position: relative;
}

.label {
    color: var(--color-mirage-600);
    font-size: 12px;
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

.file-picker input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
}

.file-icon {
    width: 18px;
    height: 18px;
    color: var(--color-mirage-700);
}

.file-name {
    font-size: 13px;
    color: var(--color-mirage-600);
}

.file-action {
    padding: 4px 10px;
    border-radius: 999px;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-100);
    font-size: 12px;
    font-weight: 700;
    box-shadow: 3px 3px 0 var(--color-shadow);
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease;
}

.file-picker:hover .file-action {
    background: var(--color-wild-200);
}

.file-picker:active .file-action {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 var(--color-shadow);
}

.avatar {
    width: fit-content;
}

.cta {
    width: fit-content;
}

.meta {
    color: var(--color-mirage-500);
}

.state {
    font-weight: 600;
    color: var(--color-mirage-500);
}

.error {
    color: #b13b3b;
}
</style>
