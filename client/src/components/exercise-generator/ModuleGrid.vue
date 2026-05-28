<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiChip from '@/components/ui/UiChip.vue'
import { CheckCircleIcon, ClockIcon } from '@heroicons/vue/24/outline'
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
                    <h3>{{ moduleItem.module_title || `Módulo ${moduleItem.modules_id}` }}</h3>
                    <p class="desc">{{ moduleItem.additional_description || 'Sem descrição' }}</p>
                    <span class="status-badge" :class="{ 'is-approved': moduleItem.minimum_exercises }">
                        <CheckCircleIcon v-if="moduleItem.minimum_exercises" class="status-icon" aria-hidden="true" />
                        <ClockIcon v-else class="status-icon" aria-hidden="true" />
                        {{ moduleItem.minimum_exercises ? 'Aprovado' : 'Por aprovar' }}
                    </span>
                </div>
                <div class="check" :class="{ 'check--selected': selectedModuleIds.includes(moduleItem.modules_id) }" aria-hidden="true">
                    <CheckCircleIcon v-if="selectedModuleIds.includes(moduleItem.modules_id)" class="check-icon" />
                </div>
            </UiCard>
        </div>
    </section>
</template>

<style scoped>
.modules {
    display: grid;
    gap: var(--space-300);
}

.section-header {
    display: grid;
    gap: var(--space-100);
}

.section-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: var(--color-mirage-800);
}

.section-header p {
    margin: 0;
    font-size: 13px;
    color: var(--color-mirage-500);
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-300);
}

.card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-300);
    cursor: pointer;
    text-align: left;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    align-items: center;
}

.card:hover {
    transform: translateY(-2px);
}

.card.selected {
    border-color: var(--color-deep-500);
    box-shadow: 6px 6px 0 var(--color-shadow);
}

.card.active {
    border-color: var(--color-deep-600);
}

.card:active {
    transform: translate(4px, 4px);
    box-shadow: 1px 1px 0 var(--color-shadow);
}

.info {
    display: grid;
    gap: var(--space-100);
}

.info h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--color-mirage-800);
}

.desc {
    margin: 0;
    font-size: 12px;
    color: var(--color-mirage-500);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    border: 2px solid var(--color-mirage-800);
    box-shadow: 2px 2px 0 var(--color-shadow);
    background: var(--color-amber-100);
    color: var(--color-amber-700);
    width: fit-content;
}

.status-badge.is-approved {
    background: var(--color-teal-100);
    color: var(--color-teal-700);
}

.status-icon {
    width: 12px;
    height: 12px;
    stroke-width: 2.5;
    flex-shrink: 0;
}

.check {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid var(--color-mirage-300);
    display: grid;
    place-items: center;
    align-self: center;
    flex-shrink: 0;
    color: var(--color-mirage-300);
    transition: border-color 0.15s ease, color 0.15s ease;
}

.check--selected {
    border-color: var(--color-deep-500);
    color: var(--color-deep-500);
    background: var(--color-teal-100);
}

.check-icon {
    width: 16px;
    height: 16px;
    stroke-width: 2.5;
}
</style>
