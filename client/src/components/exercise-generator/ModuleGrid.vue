<script setup lang="ts">
import type { Module } from '@/services/directus'

type Props = {
    modules: Module[]
    selectedModuleId: number | null
}

defineProps<Props>()

defineEmits<{ select: [number] }>()
</script>

<template>
    <section class="modules">
        <div class="section-header">
            <h2>Modulos</h2>
            <p>Seleciona um modulo para gerir os exercicios.</p>
        </div>
        <div class="grid">
            <button v-for="moduleItem in modules" :key="moduleItem.modules_id" class="card"
                :class="{ selected: moduleItem.modules_id === selectedModuleId }" type="button"
                @click="$emit('select', moduleItem.modules_id)">
                <div class="order">{{ moduleItem.order_number || '-' }}</div>
                <div class="info">
                    <h3>{{ moduleItem.module_title || `Modulo ${moduleItem.modules_id}` }}</h3>
                    <p>{{ moduleItem.additional_description || 'Sem descricao' }}</p>
                    <p class="meta">Minimo: {{ moduleItem.minimum_exercises ?? 5 }}</p>
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
    grid-template-columns: auto 1fr;
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
</style>
