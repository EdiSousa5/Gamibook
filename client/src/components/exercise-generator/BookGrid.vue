<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import { getAssetUrl } from '@/services/client'
import type { Book } from '@/types'

type Props = {
    books: Book[]
    selectedBookId: number | null
}

defineProps<Props>()

defineEmits<{ select: [number] }>()
</script>

<template>
    <section class="books">
        <div class="section-header">
            <h2>Livros</h2>
            <p>Seleciona um livro para ver os modulos.</p>
        </div>
        <div class="grid">
            <UiCard v-for="book in books" :key="book.book_id" class="card"
                :class="{ selected: book.book_id === selectedBookId }" role="button" tabindex="0"
                @click="$emit('select', book.book_id)">
                <div class="cover">
                    <img v-if="book.cover_img" :src="getAssetUrl(book.cover_img)" alt="" />
                    <span v-else>Livro</span>
                </div>
                <div class="info">
                    <h3>{{ book.title || `Livro ${book.book_id}` }}</h3>
                    <p class="meta">{{ (book as any).editora?.nome_editora || 'Sem editora' }}</p>
                    <p>{{ book.description || 'Sem descricao' }}</p>
                    <p class="status" :class="{ 'is-approved': book.is_approved }">Estado: {{ book.is_approved ?
                        'Aprovado' : 'Por aprovar' }}</p>
                </div>
            </UiCard>
        </div>
    </section>
</template>

<style scoped>
.books {
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
    grid-template-columns: 72px 1fr;
    gap: 14px;
    cursor: pointer;
    text-align: left;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
    transform: translateY(-2px);
}

.card.selected {
    border-color: #0c7a5a;
}

.card:active {
    transform: translate(4px, 6px);
    box-shadow: 1px 1px 0 var(--color-shadow);
}

.cover {
    width: 72px;
    height: 96px;
    border-radius: 3px 8px 8px 3px;
    background: var(--color-wild-300);
    color: var(--color-mirage-500);
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 12px;
    position: relative;
    box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1) inset, 4px 4px 10px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--color-mirage-800);
}

.cover::after {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%);
    pointer-events: none;
}

.cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 2px 7px 7px 2px;
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
    font-weight: 600;
    color: var(--color-mirage-600);
    margin-bottom: 2px;
}

.status {
    font-size: 11px !important;
    font-weight: 700;
    color: var(--color-amber-600) !important;
    margin-top: auto !important;
}

.status.is-approved {
    color: var(--color-teal-600) !important;
}
</style>
