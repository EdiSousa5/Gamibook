<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiChip from '@/components/ui/UiChip.vue'
import type { Module } from '@/types'

type Props = {
    modules: Module[]
    selectedModuleIds: number[]
    activeModuleId: number | null
}

defineProps<Props>()

defineEmits<{ toggle: [number]; active: [number] }>()
</script>

<template>
    <section class="modules">
        <div class="section-header">
            <h2>Modulos</h2>
            <p>Seleciona um ou mais modulos para gerar exercicios.</p>
        </div>
        <div class="grid">
            <UiCard v-for="moduleItem in modules" :key="moduleItem.modules_id" class="card" :class="{
                selected: selectedModuleIds.includes(moduleItem.modules_id),
                active: moduleItem.modules_id === activeModuleId,
            }" role="button" tabindex="0" @click="() => {
                $emit('toggle', moduleItem.modules_id)
                $emit('active', moduleItem.modules_id)
            }">
                <UiChip :label="String(moduleItem.order_number || '-')" variant="filled" />
                <div class="info">
                    <h3>{{ moduleItem.module_title || `Modulo ${moduleItem.modules_id}` }}</h3>
                    <p class="desc">{{ moduleItem.additional_description || 'Sem descricao' }}</p>
                    <span class="status-badge" :class="{ 'is-approved': moduleItem.minimum_exercises }">
                        <span class="status-dot" />
                        {{ moduleItem.minimum_exercises ? 'Aprovado' : 'Por aprovar' }}
                    </span>
                </div>
                <div class="check" aria-hidden="true">
                    <span v-if="selectedModuleIds.includes(moduleItem.modules_id)">✓</span>
                </div>
            </UiCard>
        </div>
    </section>
</template>

<style scoped>
.modules {
    display: grid;
    gap: 12px;
}

.section-header {
    display: grid;
    gap: 6px;
}

.section-header h2 {
    margin: 0;
}

.section-header p {
    margin: 0;
    color: #555;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
}

.card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 14px;
    cursor: pointer;
    text-align: left;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    align-items: center;
}

.card:hover {
    transform: translateY(-2px);
}

.card.selected {
    border-color: #0c7a5a;
}

.card.active {
    border-color: #0d5c91;
}

.card:active {
    transform: translate(4px, 6px);
    box-shadow: 1px 1px 0 var(--color-shadow);
}


.info {
    display: grid;
    gap: 6px;
}

.info h3 {
    margin: 0;
    font-size: 16px;
}

.info p {
    margin: 0;
    color: #6f6f6f;
    font-size: 12px;
}

.desc {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    background: #fff3e0;
    color: #b45309;
    border: 1.5px solid #f59e0b;
}

.status-badge.is-approved {
    background: #ecfdf5;
    color: #065f46;
    border-color: #10b981;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
}

.check {
    width: 26px;
    height: 26px;
    border-radius: 999px;
    border: 2px solid #0c7a5a;
    display: grid;
    place-items: center;
    color: #0c7a5a;
    font-weight: 800;
    align-self: center;
}
</style>
