<script setup lang="ts">
import { ref, computed } from 'vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiChip from '@/components/ui/UiChip.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import UiRadio from '@/components/ui/UiRadio.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/vue/24/outline'

type ExerciseType = 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'

type GeneratedExercise = {
    localId: string
    questionText: string
    content: Record<string, any>
    exerciseType: ExerciseType
    moduleId?: number | null
    moduleTitle?: string | null
}

type Section = {
    moduleId: number | null
    moduleTitle: string
    types: Array<{ type: ExerciseType; items: GeneratedExercise[] }>
}

type Props = {
    sections: Section[]
    typeLabels: Record<ExerciseType, string>
    approvingMap: Record<string, boolean>
}

defineProps<Props>()

defineEmits<{ approve: [GeneratedExercise]; reject: [GeneratedExercise] }>()

const getOptionLabel = (value: string) => String(value || '').trim()

const getOptionLetter = (value: string) => {
    const trimmed = getOptionLabel(value)
    const match = trimmed.match(/^([A-F])\)/i)
    return match?.[1] ? match[1].toUpperCase() : ''
}

const getOptionText = (value: string) => {
    const trimmed = getOptionLabel(value)
    return trimmed.replace(/^[A-F]\)\s*/i, '')
}

const isOptionCorrect = (option: string, correct: string) => {
    const optionLetter = getOptionLetter(option)
    const correctLetter = String(correct || '').trim().toUpperCase()
    if (optionLetter && correctLetter) return optionLetter === correctLetter
    return getOptionLabel(option) === String(correct || '').trim()
}

const normalizeAnswers = (value: any) => {
    if (Array.isArray(value)) return value.map((item) => String(item))
    if (value == null) return []
    return [String(value)]
}

const getFillBlankAnswers = (exercise: GeneratedExercise) => {
    const answers = normalizeAnswers(exercise.content.respostas_corretas)
    return answers.length ? answers.join(' / ') : 'Sem resposta'
}

const editingId = ref<string | null>(null)
const editDraft = ref<GeneratedExercise | null>(null)
const correctOptionIndex = ref<number>(0)

const openEdit = (exercise: GeneratedExercise) => {
    editingId.value = exercise.localId
    editDraft.value = JSON.parse(JSON.stringify(exercise))
    if (exercise.exerciseType === 'multiple-choice' && editDraft.value?.content?.opcoes) {
        const correct = exercise.content.resposta_correta
        const idx = editDraft.value.content.opcoes.findIndex((o: string) => o === correct || getOptionLetter(o) === getOptionLetter(correct))
        correctOptionIndex.value = Math.max(0, idx)
        // Remove as letras "A)", "B)" do inicio para as edições
        editDraft.value.content.opcoes = editDraft.value.content.opcoes.map((o: string) => getOptionText(o))
    }
}

const resetEdit = (exercise: GeneratedExercise) => {
    openEdit(exercise)
}

const closeEdit = () => {
    editingId.value = null
    editDraft.value = null
}

const saveEdit = (exercise: GeneratedExercise) => {
    if (!editDraft.value) return
    if (editDraft.value.exerciseType === 'multiple-choice') {
        editDraft.value.content.resposta_correta = editDraft.value.content.opcoes[correctOptionIndex.value]
    }
    exercise.questionText = editDraft.value.questionText
    exercise.content = editDraft.value.content
    closeEdit()
}

const addOption = () => {
    if (editDraft.value && editDraft.value.content.opcoes && editDraft.value.content.opcoes.length < 6) {
        editDraft.value.content.opcoes.push('')
    }
}

const removeOption = (idx: number) => {
    if (editDraft.value && editDraft.value.content.opcoes) {
        editDraft.value.content.opcoes.splice(idx, 1)
        if (correctOptionIndex.value === idx) {
            correctOptionIndex.value = 0
        } else if (correctOptionIndex.value > idx) {
            correctOptionIndex.value--
        }
    }
}

const canSave = computed(() => {
    if (!editDraft.value) return false
    const qText = String(editDraft.value.questionText || '').trim()
    if (qText.length < 10) return false

    if (editDraft.value.exerciseType === 'multiple-choice') {
        const ops = editDraft.value.content.opcoes || []
        if (ops.length < 4 || ops.length > 6) return false
        if (ops.some((o: string) => !String(o).trim())) return false
    }
    return true
})
</script>

<template>
    <section v-if="sections.length" class="exercise-list">
        <div v-for="section in sections" :key="String(section.moduleId)" class="group">
            <div class="module-header">
                <h3>{{ section.moduleTitle }}</h3>
                <UiChip :label="`Modulo ${section.moduleId ?? '-'}`" variant="outline" />
            </div>
            <div v-for="typeSection in section.types" :key="`${section.moduleId}-${typeSection.type}`">
                <div class="grid">
                    <UiCard v-for="(exercise, index) in typeSection.items" :key="exercise.localId" class="card"
                        :style="{ '--i': index }">
                        <header>
                            <div class="header-top">
                                <div class="header-badges">
                                    <UiBadge :label="`Exercicio ${index + 1}`" />
                                    <UiBadge :label="typeLabels[exercise.exerciseType]" />
                                </div>
                                <UiIconButton size="md" shape="square" variant="outline" @click="openEdit(exercise)" title="Editar exercício">
                                    <PencilIcon class="remove-icon" aria-hidden="true" />
                                </UiIconButton>
                            </div>
                            <p class="question">{{ exercise.questionText }}</p>
                        </header>

                        <div class="content">
                            <template v-if="exercise.exerciseType === 'multiple-choice'">
                                <ul>
                                    <li v-for="(option, idx) in exercise.content.opcoes" :key="idx"
                                        :class="{ correct: isOptionCorrect(option, exercise.content.resposta_correta) }">
                                        <strong>{{ String.fromCharCode(65 + idx) }}) {{ getOptionText(option) }}</strong>
                                    </li>
                                </ul>
                                <p><strong>Resposta correta:</strong> {{ exercise.content.resposta_correta || 'Semresposta' }}</p>
                                <p><strong>Justificação da resposta pela IA:</strong> {{ exercise.content.justificacao || 'Sem justificacao.' }}</p>
                            </template>

                            <template v-else-if="exercise.exerciseType === 'true-false'">
                                <p><strong>Resposta correta:</strong> {{ exercise.content.resposta_correta ? 'Verdadeiro' : 'Falso' }}</p>
                                <p><strong>Justificação da resposta pela IA:</strong> {{ exercise.content.justificacao || 'Sem justificacao.' }}</p>
                            </template>

                            <template v-else-if="exercise.exerciseType === 'fill-blanks'">
                                <p><strong>Frase:</strong> {{ exercise.questionText }}</p>
                                <div class="options">
                                    <p><strong>Opcoes</strong></p>
                                    <ul>
                                        <li v-for="option in exercise.content.opcoes" :key="option"
                                            :class="{ correct: normalizeAnswers(exercise.content.respostas_corretas).includes(String(option)) }">
                                            <strong>{{ option }}</strong>
                                        </li>
                                    </ul>
                                </div>
                                <p><strong>Respostas corretas:</strong> {{ getFillBlankAnswers(exercise) }}</p>
                                <p><strong>Justificação da resposta pela IA:</strong> {{ exercise.content.justificacao || 'Sem justificacao.' }}</p>
                            </template>

                            <template v-else>
                                <div class="ordering">
                                    <div>
                                        <p><strong>Itens desordenados</strong></p>
                                        <ol>
                                            <li v-for="item in exercise.content.itens_desordenados" :key="item">{{ item
                                            }}</li>
                                        </ol>
                                    </div>
                                    <div>
                                        <p><strong>Ordem correta</strong></p>
                                        <p>{{ exercise.content.ordem_correta?.join(', ') || 'Sem ordem' }}</p>
                                    </div>
                                </div>
                                <p><strong>Justificação da resposta pela IA:</strong> {{ exercise.content.justificacao || 'Sem justificacao.' }}</p>
                            </template>
                        </div>

                        <footer>
                            <div class="footer-left">
                                <!-- Botão de editar movido para o cabeçalho -->
                            </div>
                            <div class="footer-right">
                                <UiButton variant="ghost" type="button" @click="$emit('reject', exercise)">Rejeitar
                                </UiButton>
                                <UiButton variant="primary" type="button" :disabled="approvingMap[exercise.localId]"
                                    @click="$emit('approve', exercise)">
                                    {{ approvingMap[exercise.localId] ? 'A guardar...' : 'Aprovar' }}
                                </UiButton>
                            </div>
                        </footer>

                        <!-- MODAL DE EDIÇÃO -->
                        <Teleport to="body">
                            <div v-if="editingId === exercise.localId && editDraft" class="edit-overlay" @click.self="closeEdit">
                                <div class="edit-modal">
                                    <h3>Editar Exercício</h3>
                                    
                                    <div class="edit-field">
                                        <label>Pergunta</label>
                                        <UiTextarea :model-value="editDraft.questionText" @update="editDraft.questionText = $event" :rows="2" />
                                        <p class="edit-hint" :class="{ 'is-error': (editDraft.questionText?.trim().length || 0) < 10 }">A pergunta deve ter pelo menos 10 caracteres e não pode estar vazia.</p>
                                    </div>

                                    <template v-if="editDraft.exerciseType === 'multiple-choice'">
                                        <div class="edit-field">
                                            <label>Alíneas (Selecione a correta)</label>
                                            <p class="edit-hint" :class="{ 'is-error': (editDraft.content.opcoes?.length < 4 || editDraft.content.opcoes?.length > 6) }">O exercício deve ter no mínimo 4 e no máximo 6 alíneas e todas devem ser preenchidas.</p>
                                            <div class="options-edit-list">
                                                <div v-for="(opt, idx) in editDraft.content.opcoes" :key="idx" class="option-edit-item">
                                                    <UiRadio :value="idx" name="correct_option_edit" :model-value="correctOptionIndex" @update="correctOptionIndex = Number($event)" title="Marcar como correta" />
                                                    <span class="option-letter">{{ String.fromCharCode(65 + idx) }})</span>
                                                    <div class="option-input-wrapper">
                                                        <UiInput :model-value="editDraft.content.opcoes[idx]" @update="editDraft.content.opcoes[idx] = String($event)" />
                                                    </div>
                                                    <UiIconButton size="md" shape="square" variant="outline" @click="removeOption(idx)" title="Remover alínea">
                                                        <TrashIcon class="remove-icon" aria-hidden="true" />
                                                    </UiIconButton>
                                                </div>
                                            </div>
                                            <UiButton v-if="editDraft.content.opcoes.length < 6" variant="outline" size="sm" @click="addOption" style="align-self: flex-start; margin-top: 8px;">
                                                <PlusIcon class="btn-icon" /> Adicionar Alínea
                                            </UiButton>
                                        </div>
                                    </template>

                                    <template v-else-if="editDraft.exerciseType === 'true-false'">
                                        <div class="edit-field">
                                            <label>Resposta Correta</label>
                                            <UiSelect 
                                                :options="[{ label: 'Verdadeiro', value: 'true' }, { label: 'Falso', value: 'false' }]" 
                                                :model-value="editDraft.content.resposta_correta ? 'true' : 'false'" 
                                                @update="editDraft.content.resposta_correta = ($event === 'true')" 
                                            />
                                        </div>
                                    </template>
                                    
                                    <template v-else>
                                        <div class="edit-field">
                                            <p style="font-size: 13px; color: var(--color-mirage-600); margin: 0;">A edição detalhada das respostas não está disponível para este formato no menu rápido. Podes alterar a pergunta livremente.</p>
                                        </div>
                                    </template>

                                    <div class="edit-actions">
                                        <UiButton variant="outline" size="sm" @click="closeEdit">Cancelar</UiButton>
                                        <UiButton variant="ghost" size="sm" @click="resetEdit(exercise)">Resetar</UiButton>
                                        <UiButton variant="primary" size="sm" :disabled="!canSave" @click="saveEdit(exercise)">Guardar</UiButton>
                                    </div>
                                </div>
                            </div>
                        </Teleport>
                    </UiCard>
                </div>
            </div>
        </div>
    </section>

    <section v-else class="empty">
        <p>Sem exercicios gerados. Clica em "Gerar exercicios" para comecar.</p>
    </section>
</template>

<style scoped>
.exercise-list {
    display: grid;
    gap: 16px;
}

.group {
    display: grid;
    gap: 12px;
}

.group h3 {
    margin: 0;
    font-size: 18px;
}

.module-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}


.grid {
    display: grid;
    gap: 16px;
    grid-template-columns: 1fr;
}

.card {
    display: grid;
    gap: 14px;
    animation: fadeUp 0.5s ease;
    animation-delay: calc(var(--i) * 80ms);
    animation-fill-mode: both;
}

.card header {
    display: grid;
    gap: 8px;
}

.header-top {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
}

.header-badges {
    display: flex;
    gap: 8px;
    align-items: center;
}

footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.footer-left, .footer-right {
    display: flex;
    gap: 10px;
}

.btn-icon {
    width: 16px;
    height: 16px;
    margin-right: 6px;
    stroke-width: 2;
}

.content ul,
.content ol {
    margin: 0;
    padding-left: 20px;
}

.content li.correct {
    color: #0c7a5a;
    font-weight: 700;
}

.options {
    display: grid;
    gap: 6px;
}

.ordering {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
}

.approve {
    padding: 10px 16px;
    border-radius: 12px;
    border: none;
    background: #0c7a5a;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
}

.approve:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.empty {
    background: #ffffff;
    border-radius: 18px;
    padding: 18px;
    border: 1px dashed #d4d4d4;
    color: #5c5c5c;
}

.edit-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 29, 32, 0.6);
    display: grid;
    place-items: center;
    z-index: 9999;
}
.edit-modal {
    width: min(680px, 90vw);
    background: #ffffff;
    border-radius: 16px;
    border: 2px solid #1a262e;
    box-shadow: 6px 6px 0 rgba(2, 29, 32, 0.15);
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-height: 90vh;
    overflow-y: auto;
}
.edit-modal h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
}
.edit-field {
    display: flex;
    flex-direction: column;
    gap: 14px;
}
.edit-field label {
    font-weight: 700;
    font-size: 14px;
    color: #1a262e;
}
.edit-hint {
    margin: 0;
    font-size: 13px;
    color: var(--color-mirage-600);
}
.edit-hint.is-error {
    color: #ef4444;
    font-weight: 600;
}
.option-letter {
    font-weight: 700;
    font-size: 14px;
    color: var(--color-mirage-800);
    min-width: 22px;
    text-align: right;
}
.option-input-wrapper {
    flex: 1;
    min-width: 0;
}
.options-edit-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
}
.option-edit-item {
    display: flex;
    align-items: center;
    gap: 16px;
}
.edit-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
}
.remove-icon {
    width: 20px;
    height: 20px;
    stroke-width: var(--icon-stroke);
}

@keyframes fadeUp {
    from {
        opacity: 0;
        transform: translateY(12px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 720px) {
    .module-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .card footer {
        flex-direction: column;
        align-items: stretch;
    }
    .footer-left, .footer-right {
        flex-direction: column;
        align-items: stretch;
    }

    .ordering {
        grid-template-columns: 1fr;
    }
}
</style>
