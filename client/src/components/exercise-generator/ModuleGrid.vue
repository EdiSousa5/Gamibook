<script setup lang="ts">
import type { Module } from '@/services/directus'

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
            <button v-for="moduleItem in modules" :key="moduleItem.modules_id" class="card" :class="{
                selected: selectedModuleIds.includes(moduleItem.modules_id),
                active: moduleItem.modules_id === activeModuleId,
            }" type="button" @click="() => {
                $emit('toggle', moduleItem.modules_id)
                $emit('active', moduleItem.modules_id)
            }">
                <div class="order">{{ moduleItem.order_number || '-' }}</div>
                <div class="info">
                    <h3>{{ moduleItem.module_title || `Modulo ${moduleItem.modules_id}` }}</h3>
                    <p>{{ moduleItem.additional_description || 'Sem descricao' }}</p>
                    <p class="meta">Estado: {{ moduleItem.minimum_exercises ? 'Aprovado' : 'Por aprovar' }}</p>
                </div>
                <div class="check" aria-hidden="true">
                    <span v-if="selectedModuleIds.includes(moduleItem.modules_id)">✓</span>
                </div>
            </button>
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
    padding: 14px;
    border-radius: 18px;
    border: 2px solid transparent;
    background: #ffffff;
    cursor: pointer;
    text-align: left;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06);
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    align-items: center;
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 28px rgba(12, 122, 90, 0.16);
}

.card.selected {
    border-color: #0c7a5a;
    box-shadow: 0 18px 32px rgba(12, 122, 90, 0.2);
}

.card.active {
    border-color: #0d5c91;
    box-shadow: 0 18px 32px rgba(13, 92, 145, 0.2);
}

.order {
    min-width: 36px;
    height: 36px;
    border-radius: 12px;
    background: #0c7a5a;
    color: #ffffff;
    display: grid;
    place-items: center;
    font-weight: 700;
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

.info .meta {
    color: #3a3a3a;
    font-weight: 600;
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
