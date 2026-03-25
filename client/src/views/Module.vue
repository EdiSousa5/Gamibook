<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchBook, fetchModule, type Book, type Module } from '../services/directus'

const route = useRoute()
const bookId = computed(() => Number(route.params.bookId || 1))
const moduleId = computed(() => Number(route.params.moduleId || 1))

const book = ref<Book | null>(null)
const moduleData = ref<Module | null>(null)
const error = ref('')
const isLoading = ref(false)

watch(
    [bookId, moduleId],
    async ([currentBookId, currentModuleId]) => {
        error.value = ''
        isLoading.value = true
        try {
            const [bookInfo, moduleInfo] = await Promise.all([
                fetchBook(currentBookId),
                fetchModule(currentModuleId),
            ])
            book.value = bookInfo
            moduleData.value = moduleInfo
        } catch {
            error.value = 'Nao foi possivel carregar o modulo.'
            book.value = null
            moduleData.value = null
        } finally {
            isLoading.value = false
        }
    },
    { immediate: true }
)
</script>

<template>
    <section class="module">
        <div class="header">
            <h1>{{ moduleData?.module_title || `Modulo ${moduleId}` }}</h1>
            <p class="meta">{{ book?.title || `Livro ${bookId}` }}</p>
        </div>

        <div class="panel">
            <p v-if="isLoading" class="state">A carregar modulo...</p>
            <p v-else-if="error" class="state error">{{ error }}</p>
            <p v-else class="state">
                {{ moduleData?.additional_description || 'Sem descricao.' }}
            </p>
        </div>
    </section>
</template>

<style scoped>
.module {
    display: grid;
    gap: 22px;
}

.header {
    background: #ffffff;
    padding: 20px;
    border-radius: 16px;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}

.meta {
    color: #6f6f6f;
}

.panel {
    background: #ffffff;
    padding: 22px;
    border-radius: 18px;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
    display: grid;
    gap: 18px;
}

.state {
    font-weight: 600;
    color: #6f6f6f;
}

.error {
    color: #b13b3b;
}
</style>
