<script setup lang="ts">
import { ref } from 'vue'
import UiSwitch from '@/components/ui/UiSwitch.vue'

const notifications = ref(true)
const weeklySummary = ref(false)
</script>

<template>
    <div class="settings-section">
        <div class="section-header">
            <h2>Notificacoes</h2>
            <p class="meta">Controla alertas e resumos.</p>
        </div>

        <div class="row">
            <span>Alertas no dispositivo</span>
            <UiSwitch :model-value="notifications" @update="notifications = $event" />
        </div>
        <div class="row">
            <span>Resumo semanal</span>
            <UiSwitch :model-value="weeklySummary" @update="weeklySummary = $event" />
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

.row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-300);
    font-weight: 600;
}

.meta {
    color: var(--color-mirage-500);
}
</style>
