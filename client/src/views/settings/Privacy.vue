<script setup lang="ts">
import { ref } from 'vue'
import UiSwitch from '@/components/ui/UiSwitch.vue'
import UiButton from '@/components/ui/UiButton.vue'

const publicProfile = ref(true)
const showActivity = ref(true)
</script>

<template>
    <div class="settings-section">
        <h2>Privacidade</h2>
        <p class="description">Gere quem pode ver as tuas informações e a tua atividade.</p>

        <div class="setting-group">
            <div class="setting-row">
                <div class="setting-info">
                    <h3>Perfil Público</h3>
                    <p>Permite que outros utilizadores vejam o teu perfil nas classificações.</p>
                </div>
                <UiSwitch :model-value="publicProfile" @update="publicProfile = $event" />
            </div>

            <div class="setting-row">
                <div class="setting-info">
                    <h3>Mostrar Atividade</h3>
                    <p>Exibir os teus exercícios recentes no teu perfil público.</p>
                </div>
                <UiSwitch :model-value="showActivity" @update="showActivity = $event" />
            </div>

            <div class="setting-row danger-zone">
                <div class="setting-info">
                    <h3>Apagar Conta</h3>
                    <p>Aviso: Esta ação é irreversível e apagará todos os teus dados e progresso.</p>
                </div>
                <UiButton variant="outline" class="btn-danger">Apagar a minha conta</UiButton>
            </div>
        </div>
    </div>
</template>

<style scoped>
.settings-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-400);
}

h2 {
    margin: 0;
}

.description {
    margin: 0;
    color: var(--color-mirage-600);
}

.setting-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-400);
    margin-top: var(--space-200);
}

.setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--space-400);
    border-bottom: 1px solid var(--color-wild-300);
}

.setting-row.danger-zone {
    border-bottom: none;
    padding-top: var(--space-200);
}

.setting-info h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
}

.setting-info p {
    margin: 0;
    font-size: 13px;
    color: var(--color-mirage-600);
}

.btn-danger {
    color: #d93025;
    border-color: #fce8e6;
    --btn-face: #fce8e6;
    --btn-face-hover: #fad2ce;
}
</style>