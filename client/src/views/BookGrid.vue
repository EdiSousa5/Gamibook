<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import { getAssetUrl, type Book } from '@/services/directus'

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
    border-radius: 12px;
    overflow: hidden;
    background: linear-gradient(160deg, #0c7a5a, #6bd3b0);
    color: #ffffff;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 12px;
}

.cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
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
</style>
