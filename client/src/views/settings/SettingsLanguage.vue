<script setup lang="ts">
import { ref } from 'vue'
import UiSelect from '@/components/ui/UiSelect.vue'

const language = ref<string | number | null>('pt')

const languageOptions = [
    { label: 'Portugues', value: 'pt' },
    { label: 'English', value: 'en' },
    { label: 'Espanol', value: 'es' },
]
</script>

<template>
    <div class="settings-section">
        <div class="section-header">
            <h2>Idioma</h2>
            <p class="meta">Escolhe o idioma da aplicacao.</p>
        </div>

        <UiSelect label="Idioma preferido" :options="languageOptions" :model-value="language"
            @update="language = $event" />
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

.meta {
    color: var(--color-mirage-500);
}
</style>
