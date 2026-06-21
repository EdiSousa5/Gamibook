<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiChip from '@/components/ui/UiChip.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import BookMockup from '@/components/ui/BookMockup.vue'
import { gerarExercicios } from '@/services/flowise'
import { useAuthStore } from '@/stores/auth'
import {
    ArrowLeftIcon,
    ChevronDownIcon,
    ClipboardDocumentIcon,
    ClipboardDocumentCheckIcon,
    ExclamationCircleIcon,
    GlobeAltIcon,
    ExclamationTriangleIcon,
    TrashIcon,
    QrCodeIcon,
    CalendarDaysIcon,
    LinkIcon,
    ArrowTopRightOnSquareIcon,
} from '@heroicons/vue/24/outline'
import {
    fetchBooks,
    fetchModulesByBook,
    fetchModules,
    updateModuleApproval,
    updateBookApproval,
    updateBookMinimumContent,
    fetchActivationCodeStats,
    generateActivationCodes,
} from '@/services/books'
import UiModal from '@/components/ui/UiModal.vue'
import UiSearch from '@/components/ui/UiSearch.vue'
import UiInput from '@/components/ui/UiInput.vue'
import {
    createExercise,
    deleteExercise,
    fetchExercisesByModule,
} from '@/services/exercises'
import { getAssetUrl } from '@/services/client'
import type { Book, Exercise, Module } from '@/types'
import ModuleGrid from '@/components/exercise-generator/ModuleGrid.vue'
import ApprovedExercisesList from '@/components/exercise-generator/ApprovedExercisesList.vue'
import GeneratedExercisesList from '@/components/exercise-generator/GeneratedExercisesList.vue'
import GeneratorConfigPanel from '@/components/exercise-generator/GeneratorConfigPanel.vue'
import GeneratorLoadingOverlay from '@/components/exercise-generator/GeneratorLoadingOverlay.vue'
import {
    normalizeExerciseList,
    normalizeModuleResults,
    getQuestionText,
    buildContent,
    resolveExerciseType,
    resolveModuleId,
    resolveModuleTitle,
    type ExerciseType
} from '@/utils/exerciseParser'
import { useToast } from '@/composables/useToast'


type GeneratedExercise = {
    localId: string
    questionText: string
    content: Record<string, unknown>
    exerciseType: ExerciseType
    moduleId?: number | null
    moduleTitle?: string | null
}

type Section = {
    moduleId: number | null
    moduleTitle: string
    types: Array<{ type: ExerciseType; items: GeneratedExercise[] }>
}

const APPROVAL_THRESHOLD = 5
const MAX_TOTAL_QUESTIONS = 40
const MAX_SELECTED_MODULES = 4
const MAX_MODULE_EXERCISES = 15
let exerciseSeed = 0

const authStore = useAuthStore()
const router = useRouter()

const loggedUserId = authStore.user?.id ? String(authStore.user.id) : ''
const books = ref<Book[]>([])
const modules = ref<Module[]>([])
const selectedBookId = ref<number | null>(null)
const selectedModuleId = ref<number | null>(null)
const selectedModuleIds = ref<number[]>([])
const countPerModule = ref(5)
const approvedExercisesByModule = ref<Record<number, Exercise[]>>({})
const generatedExercises = ref<GeneratedExercise[]>([])
const rawFlowiseResponse = ref('')
const rawFlowiseRequest = ref('')
const copiedResponse = ref(false)
const copiedRequest = ref(false)

// ── Secção atual: 'books' | 'book-detail' | 'generator' ──────────────────────
const currentSection = ref<'books' | 'book-detail' | 'generator'>('books')

const copyToClipboard = async (text: string, which: 'response' | 'request') => {
    await navigator.clipboard.writeText(text)
    if (which === 'response') {
        copiedResponse.value = true
        window.setTimeout(() => { copiedResponse.value = false }, 2000)
    } else {
        copiedRequest.value = true
        window.setTimeout(() => { copiedRequest.value = false }, 2000)
    }
}

const toast = useToast()
const isLoadingData = ref(false)
const isGenerating = ref(false)
const elapsedSeconds = ref(0)
let elapsedTimer: number | null = null
const progressLabel = ref('')
const generationHalfTime = ref(20)
const approvingMap = ref<Record<string, boolean>>({})
const expandedModules = ref<Record<number, boolean>>({})
const statusFilter = ref<'all' | 'published' | 'ready' | 'incomplete'>('all')
const publisherFilter = ref<string>('all')
const bookSearch = ref('')
const showApprovalModal = ref(false)
const isApprovingBook = ref(false)
const showClearExercisesModal = ref(false)
const showRegenerateModal = ref(false)
const showDiscardModal = ref(false)
let discardConfirmCallback: (() => void) | null = null
let confirmedLeave = false

const generationProgress = computed(() => {
    if (!isGenerating.value) return 0
    const t = elapsedSeconds.value
    const h = generationHalfTime.value
    return Math.min(95, Math.round(95 * (1 - Math.exp(-t / h))))
})

const typeLabels: Record<ExerciseType, string> = {
    'multiple-choice': 'Escolha múltipla',
    'true-false': 'Verdadeiro / Falso',
}

const uniquePublishers = computed(() => {
    const pubs = new Set<string>()
    books.value.forEach((b: any) => {
        if (b.editora?.nome_editora) pubs.add(b.editora.nome_editora)
    })
    return Array.from(pubs).sort()
})

const publisherOptions = computed(() => {
    const opts = [{ label: 'Todas as editoras', value: 'all' }]
    uniquePublishers.value.forEach(pub => {
        opts.push({ label: pub, value: pub })
    })
    return opts
})

const statusOptions = [
    { label: 'Todos os estados', value: 'all' },
    { label: 'Publicados no site', value: 'published' },
    { label: 'Prontos a publicar', value: 'ready' },
    { label: 'Em desenvolvimento', value: 'incomplete' },
]

const filteredBooks = computed(() => {
    let list = books.value

    const q = bookSearch.value.toLowerCase().trim()
    if (q) list = list.filter(b => b.title?.toLowerCase().includes(q))

    if (statusFilter.value === 'published') {
        list = list.filter(b => b.is_approved)
    } else if (statusFilter.value === 'ready') {
        list = list.filter(b => b.has_minimum_content && !b.is_approved)
    } else if (statusFilter.value === 'incomplete') {
        list = list.filter(b => !b.has_minimum_content)
    }

    if (publisherFilter.value !== 'all') {
        list = list.filter((b: any) => b.editora?.nome_editora === publisherFilter.value)
    }

    return list
})

const selectedModule = computed(() =>
    modules.value.find((moduleItem) => moduleItem.modules_id === selectedModuleId.value),
)

const selectedModules = computed(() =>
    filteredModules.value.filter((moduleItem) =>
        selectedModuleIds.value.includes(moduleItem.modules_id),
    ),
)

const selectedBook = computed(() => {
    if (!selectedBookId.value) return null
    return books.value.find((book) => book.book_id === selectedBookId.value) || null
})

const filteredModules = computed(() => {
    if (!selectedBookId.value) return modules.value
    return modules.value.filter((moduleItem) => moduleItem.id_book === selectedBookId.value)
})

const maxPerModule = computed(() => {
    const total = Math.max(1, selectedModuleIds.value.length)
    return Math.max(1, Math.floor(MAX_TOTAL_QUESTIONS / total))
})

const totalQuestions = computed(() => countPerModule.value * selectedModuleIds.value.length)
const isOverMaxTotal = computed(() => totalQuestions.value > MAX_TOTAL_QUESTIONS)

const approvedSummaries = computed(() =>
    selectedModules.value.map((moduleItem) => {
        const approved = approvedExercisesByModule.value[moduleItem.modules_id] || []
        const required = APPROVAL_THRESHOLD
        return {
            moduleItem,
            approved,
            approvedCount: approved.length,
            required,
            isApproved: approved.length >= required,
        }
    }),
)

const groupedSections = computed<Section[]>(() => {
    const grouped = new Map<number | null, Record<ExerciseType, GeneratedExercise[]>>()
    const typeOrder: ExerciseType[] = ['multiple-choice', 'true-false']

    generatedExercises.value.forEach((exercise) => {
        if (!exercise.exerciseType) return
        const moduleId = exercise.moduleId ?? null
        if (!grouped.has(moduleId)) {
            grouped.set(moduleId, {
                'multiple-choice': [],
                'true-false': [],
            })
        }
        grouped.get(moduleId)?.[exercise.exerciseType].push(exercise)
    })

    const moduleTitleById = new Map(
        modules.value.map((moduleItem) => [moduleItem.modules_id, moduleItem.module_title || 'Módulo']),
    )

    const order = selectedModuleIds.value.length
        ? selectedModuleIds.value
        : Array.from(grouped.keys()).filter((id): id is number => id !== null)

    const sections = Array.from(grouped.entries()).map(([moduleId, typeMap]) => {
        const moduleTitle = moduleId
            ? moduleTitleById.get(moduleId) || `Módulo ${moduleId}`
            : 'Módulo desconhecido'
        const types = typeOrder
            .map((type) => ({ type, items: typeMap[type] }))
            .filter((entry) => entry.items.length > 0)
        return { moduleId, moduleTitle, types }
    })

    return sections
        .sort((a, b) => {
            const aIndex = a.moduleId ? order.indexOf(a.moduleId) : Number.MAX_SAFE_INTEGER
            const bIndex = b.moduleId ? order.indexOf(b.moduleId) : Number.MAX_SAFE_INTEGER
            return aIndex - bIndex
        })
        .filter((entry) => entry.types.length > 0)
})

// ── Códigos mínimos para publicar ────────────────────────────────────────────
const minCodesRequired = computed(() => {
    const v = selectedBook.value?.min_active_codes
    return v != null && Number(v) > 0 ? Number(v) : 100
})

const hasEnoughCodes = computed(() => {
    if (!codeStats.value) return false
    return codeStats.value.total >= minCodesRequired.value
})

const canPublish = computed(() =>
    !!selectedBook.value?.has_minimum_content && hasEnoughCodes.value
)

// ── Formatação de data ────────────────────────────────────────────────────────
const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—'
    try {
        return new Date(dateStr).toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
        return dateStr
    }
}

const loadInitialData = async () => {
    isLoadingData.value = true
    try {
        const [moduleList, bookList] = await Promise.all([fetchModules(), fetchBooks()])
        modules.value = moduleList
        books.value = bookList
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível carregar os módulos.')
    } finally {
        isLoadingData.value = false
    }
}

const refreshApprovedExercises = async () => {
    if (!selectedModuleIds.value.length) {
        approvedExercisesByModule.value = {}
        return
    }

    try {
        const entries = await Promise.all(
            selectedModuleIds.value.map(async (moduleId) => [
                moduleId,
                await fetchExercisesByModule(moduleId),
            ] as const),
        )
        const nextMap: Record<number, Exercise[]> = {}
        entries.forEach(([moduleId, list]) => {
            nextMap[moduleId] = list
        })
        approvedExercisesByModule.value = nextMap
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível carregar os exercícios aprovados.')
    }
}

const refreshApprovedExercisesForModule = async (moduleId: number) => {
    try {
        const list = await fetchExercisesByModule(moduleId)
        approvedExercisesByModule.value = {
            ...approvedExercisesByModule.value,
            [moduleId]: list,
        }
        return list
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível carregar os exercícios aprovados.')
        return []
    }
}

const setLocalModuleApproval = (moduleId: number, isApproved: boolean) => {
    modules.value = modules.value.map((moduleItem) =>
        moduleItem.modules_id === moduleId
            ? { ...moduleItem, minimum_exercises: isApproved }
            : moduleItem,
    )
}

const setLocalBookMinimumContent = (bookId: number, hasMinimumContent: boolean) => {
    books.value = books.value.map((book) =>
        book.book_id === bookId ? { ...book, has_minimum_content: hasMinimumContent } : book,
    )
}

const setLocalBookApproval = (bookId: number, isApproved: boolean) => {
    books.value = books.value.map((book) =>
        book.book_id === bookId ? { ...book, is_approved: isApproved } : book,
    )
}

const syncModuleApproval = async (moduleId: number, approvedCount: number) => {
    const isApproved = approvedCount >= APPROVAL_THRESHOLD
    try {
        await updateModuleApproval(moduleId, isApproved)
        setLocalModuleApproval(moduleId, isApproved)
        const moduleItem = modules.value.find((item) => item.modules_id === moduleId)
        if (moduleItem?.id_book) {
            await syncBookMinimumContent(moduleItem.id_book)
        }
    } catch (err) {
        console.error(err)
    }
}

const syncBookMinimumContent = async (bookId: number) => {
    try {
        const moduleList = await fetchModulesByBook(bookId)
        const hasModules = moduleList.length > 0
        const hasMinContent = hasModules && moduleList.every((item) => item.minimum_exercises === true)
        await updateBookMinimumContent(bookId, hasMinContent)
        setLocalBookMinimumContent(bookId, hasMinContent)
    } catch (err) {
        console.error(err)
    }
}

const handlePublishBook = () => {
    showApprovalModal.value = true
}

const handleConfirmPublish = async () => {
    if (!selectedBookId.value) return
    isApprovingBook.value = true
    try {
        await updateBookApproval(selectedBookId.value, true)
        setLocalBookApproval(selectedBookId.value, true)
        showApprovalModal.value = false
        toast.info('Livro publicado com sucesso.')
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível publicar o livro.')
    } finally {
        isApprovingBook.value = false
    }
}

const toggleModuleSelection = (moduleId: number) => {
    const isSelected = selectedModuleIds.value.includes(moduleId)
    if (isSelected) {
        selectedModuleIds.value = selectedModuleIds.value.filter((id) => id !== moduleId)
        if (selectedModuleId.value === moduleId) {
            selectedModuleId.value = selectedModuleIds.value[0] ?? null
        }
    } else {
        if (selectedModuleIds.value.length >= MAX_SELECTED_MODULES) {
            toast.warning(`Só podes selecionar até ${MAX_SELECTED_MODULES} módulos de cada vez.`)
            return
        }
        selectedModuleIds.value = [...selectedModuleIds.value, moduleId]
        selectedModuleId.value = moduleId
    }
}

const generateForModules = async (count: number, modulesToUse = selectedModules.value) => {
    const modulePayload = modulesToUse.map((moduleItem) => {
        return {
            id: moduleItem.modules_id,
            titulo: moduleItem.module_title || `Módulo ${moduleItem.modules_id}`,
            descricao: moduleItem.additional_description || '',
        }
    })

    const perguntasJaCriadas = modulesToUse.flatMap((moduleItem) => {
        const list = approvedExercisesByModule.value[moduleItem.modules_id] || []
        return list.map((item) => getQuestionText(item.content || item))
    }).join('\n')

    const requestPayload = {
        titulo_livro: selectedBook.value?.title || 'Ciências da Vida',
        numero_perguntas: count,
        perguntas_existentes: perguntasJaCriadas || 'Nenhuma pergunta existente.',
        modulos: modulePayload,
    }

    rawFlowiseRequest.value = JSON.stringify(requestPayload, null, 2)

    const response = await gerarExercicios(requestPayload)

    const rawResponse = response.raw
    const parsedResponse = response.parsed

    const lookupByTitle = new Map(
        modulePayload.map((item) => [item.titulo.trim().toLowerCase(), Number(item.id)]),
    )
    const lookupById = new Map(
        modulePayload.map((item) => [Number(item.id), item.titulo]),
    )

    const results = normalizeModuleResults(parsedResponse)
    const fallbackList = normalizeExerciseList(parsedResponse)
    const defaultModuleId = selectedModuleIds.value[0] ?? null
    const items: GeneratedExercise[] = []

    if (results.length) {
        results.forEach((result: any) => {
            const list = Array.isArray(result?.exercicios)
                ? result.exercicios
                : Array.isArray(result?.quiz)
                    ? result.quiz
                    : []
            list.forEach((item: any) => {
                const exerciseType = resolveExerciseType(item?.tipo || item?.type || result?.tipo)
                const questionText = getQuestionText(item)
                const moduleId = resolveModuleId(result, item, lookupByTitle) ?? defaultModuleId
                items.push({
                    localId: `gen-${Date.now()}-${exerciseSeed++}`,
                    questionText,
                    content: buildContent(item, exerciseType, questionText),
                    exerciseType,
                    moduleId,
                    moduleTitle: resolveModuleTitle(moduleId, lookupById),
                })
            })
        })
    } else {
        fallbackList.forEach((item: any) => {
            const exerciseType = resolveExerciseType(item?.tipo || item?.type)
            const questionText = getQuestionText(item)
            const moduleId = resolveModuleId({}, item, lookupByTitle) ?? defaultModuleId
            items.push({
                localId: `gen-${Date.now()}-${exerciseSeed++}`,
                questionText,
                content: buildContent(item, exerciseType, questionText),
                exerciseType,
                moduleId,
                moduleTitle: resolveModuleTitle(moduleId, lookupById),
            })
        })
    }

    return { items, receivedCount: items.length, rawResponse }
}

const doGenerate = async () => {
    const fullModules = selectedModules.value.filter(
        (m) => (approvedExercisesByModule.value[m.modules_id] ?? []).length >= MAX_MODULE_EXERCISES,
    )
    const generatableModules = selectedModules.value.filter(
        (m) => (approvedExercisesByModule.value[m.modules_id] ?? []).length < MAX_MODULE_EXERCISES,
    )

    if (generatableModules.length === 0) {
        toast.error(`Todos os módulos selecionados já atingiram o limite de ${MAX_MODULE_EXERCISES} exercícios.`)
        return
    }

    if (fullModules.length > 0) {
        const names = fullModules.map((m) => m.module_title || `Módulo ${m.modules_id}`).join(', ')
        toast.warning(`Os seguintes módulos já estão no limite e serão ignorados: ${names}.`)
    }

    isGenerating.value = true
    elapsedSeconds.value = 0
    generationHalfTime.value = Math.max(15, generatableModules.length * Math.min(countPerModule.value, maxPerModule.value) * 1.8)
    if (elapsedTimer) window.clearInterval(elapsedTimer)
    elapsedTimer = window.setInterval(() => {
        elapsedSeconds.value += 1
    }, 1000)
    progressLabel.value = ''
    rawFlowiseResponse.value = ''
    rawFlowiseRequest.value = ''

    try {
        progressLabel.value = `A gerar exercícios para ${generatableModules.length} módulo${generatableModules.length !== 1 ? 's' : ''}`
        const result = await generateForModules(Math.min(countPerModule.value, maxPerModule.value), generatableModules)
        rawFlowiseResponse.value = JSON.stringify(result.rawResponse ?? null, null, 2)
        if (!result.items.length) {
            toast.error('A IA não devolveu exercícios. Tenta novamente.')
            return
        }
        generatedExercises.value = result.items
        toast.info('Exercícios gerados. Revê e aprova os melhores.')
    } catch (err) {
        console.error(err)
        toast.error('Erro ao gerar exercícios.')
    } finally {
        isGenerating.value = false
        progressLabel.value = ''
        if (elapsedTimer) {
            window.clearInterval(elapsedTimer)
            elapsedTimer = null
        }
    }
}

const handleGenerate = async () => {
    if (!selectedModules.value.length) {
        toast.error('Seleciona pelo menos um módulo primeiro.')
        return
    }
    if (countPerModule.value <= 0) {
        toast.error('Define uma quantidade maior que zero.')
        return
    }
    if (isOverMaxTotal.value) {
        toast.error(`O total pedido (${totalQuestions.value}) excede o máximo permitido (${MAX_TOTAL_QUESTIONS}).`)
        return
    }

    if (generatedExercises.value.length > 0) {
        showRegenerateModal.value = true
        return
    }

    await doGenerate()
}

const confirmRegenerate = async () => {
    showRegenerateModal.value = false
    generatedExercises.value = []
    await doGenerate()
}

const handleClearExercises = () => {
    showClearExercisesModal.value = true
}

const confirmClearExercises = () => {
    generatedExercises.value = []
    showClearExercisesModal.value = false
    toast.info('Lista de exercícios limpa.')
}

const requestDiscard = (onConfirm: () => void) => {
    if (generatedExercises.value.length === 0) {
        onConfirm()
        return
    }
    discardConfirmCallback = onConfirm
    showDiscardModal.value = true
}

const goToBooks = () => {
    requestDiscard(() => { selectedBookId.value = null })
}

const goToGenerator = () => {
    currentSection.value = 'generator'
    if (selectedModuleIds.value.length) refreshApprovedExercises()
}

const goToBookDetail = () => {
    requestDiscard(() => {
        generatedExercises.value = []
        rawFlowiseResponse.value = ''
        rawFlowiseRequest.value = ''
        currentSection.value = 'book-detail'
    })
}

const confirmDiscard = () => {
    showDiscardModal.value = false
    discardConfirmCallback?.()
    discardConfirmCallback = null
}

const cancelDiscard = () => {
    showDiscardModal.value = false
    discardConfirmCallback = null
}

const removeGenerated = (localId: string) => {
    generatedExercises.value = generatedExercises.value.filter((item) => item.localId !== localId)
}

const setApproving = (localId: string, value: boolean) => {
    approvingMap.value = { ...approvingMap.value, [localId]: value }
}

const handleApprove = async (exercise: GeneratedExercise) => {
    setApproving(exercise.localId, true)

    try {
        const targetModuleId = exercise.moduleId || selectedModule.value?.modules_id
        if (!targetModuleId) return
        const currentCount = (approvedExercisesByModule.value[targetModuleId] || []).length
        if (currentCount >= MAX_MODULE_EXERCISES) {
            toast.error(`Este módulo já atingiu o limite de ${MAX_MODULE_EXERCISES} exercícios.`)
            return
        }
        await createExercise({
            id_module: targetModuleId,
            type: exercise.exerciseType,
            content: exercise.content,
            created_by: loggedUserId || undefined,
        })
        removeGenerated(exercise.localId)
        const list = await refreshApprovedExercisesForModule(targetModuleId)
        await syncModuleApproval(targetModuleId, list.length)
        toast.info('Exercício aprovado e guardado com sucesso.')
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível aprovar o exercício.')
    } finally {
        setApproving(exercise.localId, false)
    }
}

const handleReject = async (exercise: GeneratedExercise) => {
    setApproving(exercise.localId, true)
    try {
        removeGenerated(exercise.localId)
        toast.info('Exercício rejeitado e removido da lista.')
    } catch (err) {
        console.error(err)
        toast.error('Ocorreu um erro ao rejeitar o exercício.')
    } finally {
        setApproving(exercise.localId, false)
    }
}

const handleRemoveApproved = async (exercise: Exercise) => {
    if (!exercise.exercise_id) return
    try {
        await deleteExercise(exercise.exercise_id)
        if (exercise.id_module) {
            const list = await refreshApprovedExercisesForModule(exercise.id_module)
            await syncModuleApproval(exercise.id_module, list.length)
        } else {
            await refreshApprovedExercises()
        }
        toast.info('Exercício removido com sucesso.')
    } catch (err) {
        console.error(err)
        toast.error('Não foi possível remover o exercício.')
    }
}

const toggleModuleExpanded = (moduleId: number) => {
    expandedModules.value[moduleId] = !expandedModules.value[moduleId]
}

watch(selectedModuleId, async () => {
    generatedExercises.value = []
})

watch([selectedModuleIds, maxPerModule], async () => {
    if (countPerModule.value > maxPerModule.value) {
        countPerModule.value = maxPerModule.value
    }
    if (countPerModule.value < 1) countPerModule.value = 1
    await refreshApprovedExercises()
})

const moduleExerciseCounts = ref<Record<number, number>>({})

const loadModuleStats = async () => {
    if (!filteredModules.value.length) {
        moduleExerciseCounts.value = {}
        return
    }
    try {
        const entries = await Promise.all(
            filteredModules.value.map(async (mod) => [
                mod.modules_id,
                (await fetchExercisesByModule(mod.modules_id)).length,
            ] as const),
        )
        const counts: Record<number, number> = {}
        entries.forEach(([id, count]) => { counts[id] = count })
        moduleExerciseCounts.value = counts
    } catch (err) {
        console.error(err)
    }
}

// ── Códigos de ativação ───────────────────────────────────────────────────────
const codeStats = ref<{ total: number; unused: number } | null>(null)
const codeStatsLoading = ref(false)
const generateQty = ref(100)
const isGeneratingCodes = ref(false)
const codeGenDone = ref(0)
const codeGenTotal = ref(0)

const loadCodeStats = async (bookId: number) => {
    codeStatsLoading.value = true
    try {
        codeStats.value = await fetchActivationCodeStats(bookId)
    } catch {
        codeStats.value = null
    } finally {
        codeStatsLoading.value = false
    }
}

const handleGenerateCodes = async () => {
    if (!selectedBookId.value || isGeneratingCodes.value) return
    const qty = Math.max(1, Math.floor(generateQty.value))
    isGeneratingCodes.value = true
    codeGenDone.value = 0
    codeGenTotal.value = qty
    try {
        await generateActivationCodes(selectedBookId.value, qty, (done, total) => {
            codeGenDone.value = done
            codeGenTotal.value = total
        })
        toast.info(`${qty.toLocaleString('pt-PT')} código(s) gerado(s) com sucesso.`)
        await loadCodeStats(selectedBookId.value)
    } catch {
        toast.error('Erro ao gerar os códigos. Tenta novamente.')
    } finally {
        isGeneratingCodes.value = false
        codeGenDone.value = 0
        codeGenTotal.value = 0
    }
}

watch(selectedBookId, () => {
    selectedModuleId.value = null
    selectedModuleIds.value = []
    generatedExercises.value = []
    approvedExercisesByModule.value = {}
    rawFlowiseResponse.value = ''
    rawFlowiseRequest.value = ''
    codeStats.value = null
    moduleExerciseCounts.value = {}
    if (selectedBookId.value) {
        loadCodeStats(selectedBookId.value)
        loadModuleStats()
        currentSection.value = 'book-detail'
    } else {
        currentSection.value = 'books'
    }
})

onBeforeRouteLeave((to) => {
    if (generatedExercises.value.length > 0 && !confirmedLeave) {
        requestDiscard(() => {
            confirmedLeave = true
            router.push(to.fullPath)
        })
        return false
    }
})

onMounted(async () => {
    await loadInitialData()
})
</script>

<template>
    <div class="manage-books-page">

        <!-- ── Secção 1: Lista de livros ───────────────────────────────────── -->
        <template v-if="currentSection === 'books'">
            <header class="hero">
                <div class="hero-content">
                    <h1 class="hero-title">Gerir Livros</h1>
                    <p class="hero-subtitle">
                        Consulta e gere todos os livros da plataforma. Seleciona um livro para ver os seus detalhes,
                        módulos, códigos de ativação e opções de publicação.
                    </p>
                </div>
            </header>

            <div v-if="isLoadingData" class="loading-banner">A carregar os dados da plataforma...</div>

            <UiCard class="books-list-card">
                <div class="panel-header">
                    <div class="step-indicator">1</div>
                    <div class="header-text">
                        <h2>Escolhe um Livro</h2>
                        <p class="meta">Seleciona um livro para ver os seus detalhes e gerir o seu conteúdo.</p>
                    </div>
                </div>

                <div class="panel-body">
                    <div class="book-list-filters">
                        <div class="filter-search">
                            <UiSearch :model-value="bookSearch" placeholder="Pesquisar livro..."
                                @update="bookSearch = $event" />
                        </div>
                        <UiSelect :model-value="statusFilter" :options="statusOptions"
                            @update="statusFilter = $event as any" />
                        <UiSelect :model-value="publisherFilter" :options="publisherOptions"
                            @update="publisherFilter = $event as any" />
                    </div>

                    <div class="book-grid-wrapper">
                        <div class="book-grid-legend">
                            <p class="bgl-title">Etiquetas</p>
                            <div class="bgl-row">
                                <UiChip label="Conteúdo completo" variant="filled" />
                                <span class="bgl-sep">/</span>
                                <UiChip label="Conteúdo em falta" variant="outline" />
                                <span class="bgl-desc">— todos os módulos têm exercícios suficientes ou não</span>
                            </div>
                            <div class="bgl-row">
                                <UiChip label="Publicado no site" variant="filled" />
                                <span class="bgl-sep">/</span>
                                <UiChip label="Não publicado" variant="outline" />
                                <span class="bgl-desc">— livro visível ou não para os utilizadores</span>
                            </div>
                        </div>

                        <div class="book-cards-grid">
                            <button v-for="book in filteredBooks" :key="book.book_id" class="book-card" type="button"
                                @click="selectedBookId = book.book_id">
                                <div class="book-card-cover">
                                    <img v-if="book.cover_img" :src="getAssetUrl(book.cover_img)"
                                        :alt="book.title || ''" />
                                    <span v-else class="book-card-cover-placeholder">
                                        {{ book.title?.[0]?.toUpperCase() || '?' }}
                                    </span>
                                </div>
                                <div class="book-card-info">
                                    <span class="book-card-title">{{ book.title }}</span>
                                    <span class="book-card-publisher">
                                        {{ book.editora?.nome_editora || 'Sem editora' }}
                                    </span>
                                    <div class="book-card-chips">
                                        <UiChip
                                            :label="book.has_minimum_content ? 'Conteúdo completo' : 'Conteúdo em falta'"
                                            :variant="book.has_minimum_content ? 'filled' : 'outline'" />
                                        <UiChip :label="book.is_approved ? 'Publicado no site' : 'Não publicado'"
                                            :variant="book.is_approved ? 'filled' : 'outline'" />
                                    </div>
                                </div>
                            </button>
                            <p v-if="!filteredBooks.length" class="book-cards-empty">
                                Nenhum livro encontrado com os filtros atuais.
                            </p>
                        </div>
                    </div>
                </div>
            </UiCard>
        </template>

        <!-- ── Secção 2: Detalhe do livro ─────────────────────────────────── -->
        <template v-else-if="currentSection === 'book-detail'">
            <div v-if="isLoadingData" class="loading-banner">A carregar os dados da plataforma...</div>

            <div class="detail-nav">
                <UiButton variant="outline" size="sm" @click="goToBooks">
                    <template #icon-left>
                        <ArrowLeftIcon style="width: 16px; height: 16px; stroke-width: 2.5; flex-shrink: 0;"
                            aria-hidden="true" />
                    </template>
                    Todos os livros
                </UiButton>
            </div>

            <!-- ── Informações do Livro ── -->
            <div class="detail-hero-wrapper">
                <UiCard class="detail-hero-card">
                    <div class="detail-hero-content">
                        <div class="dh-cover">
                            <BookMockup size="lg"
                                :cover-url="selectedBook?.cover_img ? getAssetUrl(selectedBook.cover_img) : null"
                                :title="selectedBook?.title" />
                        </div>
                        <div class="dh-info">
                            <div class="dh-title-group">
                                <h2 class="dh-title">{{ selectedBook?.title }}</h2>
                                <span class="dh-publisher">{{ selectedBook?.editora?.nome_editora || 'Sem editora'
                                }}</span>
                            </div>

                            <div class="dh-tags">
                                <UiChip
                                    :label="selectedBook?.has_minimum_content ? 'Conteúdo completo' : 'Conteúdo em falta'"
                                    :variant="selectedBook?.has_minimum_content ? 'filled' : 'outline'" />
                                <UiChip :label="selectedBook?.is_approved ? 'Publicado no site' : 'Não publicado'"
                                    :variant="selectedBook?.is_approved ? 'filled' : 'outline'" />
                                <UiChip :label="hasEnoughCodes ? 'Códigos suficientes' : 'Códigos insuficientes'"
                                    :variant="hasEnoughCodes ? 'filled' : 'outline'" />
                            </div>

                            <dl v-if="selectedBook?.ISBN || selectedBook?.publish_date || selectedBook?.editora?.nome_editora || selectedBook?.site_url"
                                class="dh-info-list">
                                <div v-if="selectedBook?.ISBN" class="dh-info-row">
                                    <dt>ISBN</dt>
                                    <dd>{{ selectedBook.ISBN }}</dd>
                                </div>
                                <div v-if="selectedBook?.publish_date" class="dh-info-row">
                                    <dt>Data de publicação</dt>
                                    <dd>{{ formatDate(selectedBook.publish_date) }}</dd>
                                </div>
                                <div v-if="selectedBook?.editora?.nome_editora" class="dh-info-row">
                                    <dt>Editora</dt>
                                    <dd>{{ selectedBook.editora.nome_editora }}</dd>
                                </div>
                                <div v-if="selectedBook?.site_url" class="dh-info-row">
                                    <dt>Site oficial</dt>
                                    <dd>
                                        <a :href="selectedBook.site_url" target="_blank" rel="noopener" class="dh-site-link">
                                            Visite o site
                                            <ArrowTopRightOnSquareIcon class="dh-site-link-icon" aria-hidden="true" />
                                        </a>
                                    </dd>
                                </div>
                            </dl>

                            <div class="dh-actions">
                                <UiButton variant="primary" @click="goToGenerator">
                                    Gerar Exercícios
                                </UiButton>
                                <UiButton v-if="authStore.isAdmin && !selectedBook?.is_approved" variant="outline"
                                    :disabled="!canPublish || codeStatsLoading" @click="handlePublishBook">
                                    <template #icon-left>
                                        <GlobeAltIcon style="width:18px;height:18px;stroke-width:2"
                                            aria-hidden="true" />
                                    </template>
                                    Publicar Livro
                                </UiButton>
                            </div>

                            <div v-if="authStore.isAdmin && !selectedBook?.is_approved && !canPublish"
                                class="dh-alerts">
                                <div v-if="!selectedBook?.has_minimum_content" class="dh-alert-card">
                                    <ExclamationCircleIcon class="dh-alert-icon" aria-hidden="true" />
                                    <span>Conteúdo mínimo em falta — todos os módulos precisam de {{ APPROVAL_THRESHOLD
                                    }}
                                        exercícios aprovados.</span>
                                </div>
                                <div v-if="selectedBook?.has_minimum_content && !hasEnoughCodes" class="dh-alert-card">
                                    <ExclamationCircleIcon class="dh-alert-icon" aria-hidden="true" />
                                    <span>São necessários pelo menos {{ minCodesRequired }} códigos de ativação gerados
                                        (atual: {{
                                            codeStats?.total ?? 0 }}).</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="selectedBook?.description" class="dh-description">
                        <div class="dh-desc-header">
                            <h3 class="dh-desc-title">Sinopse</h3>
                        </div>
                        <p class="dh-desc-text">{{ selectedBook.description }}</p>
                    </div>
                </UiCard>
            </div>

            <!-- ── Grid Inferior (Módulos e Códigos) ── -->
            <div class="detail-body-grid">

                <!-- ── Módulos ── -->
                <UiCard class="detail-modules-card">
                    <div class="dm-header-title">
                        <h3>Módulos</h3>
                        <UiChip :label="`${filteredModules.length}`" variant="soft" />
                    </div>

                    <ul v-if="filteredModules.length" class="dm-list">
                        <li
                            v-for="mod in filteredModules"
                            :key="mod.modules_id"
                            class="dm-row"
                            :class="{ 'is-approved': mod.minimum_exercises }">
                            <span class="dm-num" aria-hidden="true">
                                {{ mod.order_number != null ? String(mod.order_number).padStart(2, '0') : '—' }}
                            </span>
                            <div class="dm-body">
                                <span class="dm-name">{{ mod.module_title || 'Módulo sem título' }}</span>
                                <span class="dm-desc" :class="{ 'dm-desc--empty': !mod.additional_description }">
                                    {{ mod.additional_description || 'Sem descrição' }}
                                </span>
                            </div>
                            <span v-if="moduleExerciseCounts[mod.modules_id] !== undefined" class="dm-count">
                                {{ moduleExerciseCounts[mod.modules_id] }}/15
                            </span>
                            <UiChip
                                :label="mod.minimum_exercises ? 'Aprovado' : 'Por aprovar'"
                                :variant="mod.minimum_exercises ? 'filled' : 'outline'"
                                size="sm" />
                        </li>
                    </ul>
                    <p v-else class="dm-empty">Ainda não há módulos neste livro.</p>
                </UiCard>

                <!-- ── Códigos de Ativação ── -->
                <UiCard class="codes-management-card">
                    <div class="codes-card-header">
                        <QrCodeIcon class="codes-header-icon" aria-hidden="true" />
                        <h3>Códigos de Ativação</h3>
                    </div>

                    <div v-if="codeStatsLoading" class="codes-loading">
                        <div class="codes-spinner" />
                        <span>A carregar...</span>
                    </div>
                    <template v-else-if="codeStats">
                        <div class="codes-stat-row">
                            <span class="codes-stat-label">Total gerado</span>
                            <span class="codes-stat-value">{{ codeStats.total.toLocaleString('pt-PT') }}</span>
                        </div>
                        <div class="codes-stat-row">
                            <span class="codes-stat-label">Não utilizados</span>
                            <span class="codes-stat-value" :class="{ 'codes-stat-value--low': codeStats.unused <= 10 }">
                                {{ codeStats.unused.toLocaleString('pt-PT') }}
                            </span>
                        </div>
                        <div class="codes-stat-row">
                            <span class="codes-stat-label">Utilizados</span>
                            <span class="codes-stat-value">{{ (codeStats.total -
                                codeStats.unused).toLocaleString('pt-PT') }}</span>
                        </div>
                        <div v-if="!hasEnoughCodes" class="codes-low-warning">
                            <ExclamationTriangleIcon class="codes-low-icon" aria-hidden="true" />
                            <span>Gera pelo menos {{ (minCodesRequired - codeStats.total).toLocaleString('pt-PT') }}
                                código(s) para poder publicar o livro.</span>
                        </div>
                        <div v-else-if="codeStats.unused <= 10" class="codes-low-warning">
                            <ExclamationTriangleIcon class="codes-low-icon" aria-hidden="true" />
                            <span>Stock de códigos disponíveis baixo. Gera mais antes de distribuir.</span>
                        </div>
                    </template>

                    <div class="codes-divider" />

                    <UiInput id="gen-qty" v-model.number="generateQty" type="number" label="Quantidade a gerar" :min="1"
                        :max="100000" :disabled="isGeneratingCodes" />

                    <div v-if="isGeneratingCodes" class="codes-progress-wrap">
                        <div class="codes-progress-bar">
                            <div class="codes-progress-fill"
                                :style="{ width: codeGenTotal ? `${Math.round((codeGenDone / codeGenTotal) * 100)}%` : '0%' }" />
                        </div>
                        <span class="codes-progress-label">
                            {{ codeGenDone.toLocaleString('pt-PT') }} / {{ codeGenTotal.toLocaleString('pt-PT') }}
                        </span>
                    </div>

                    <UiButton variant="primary" class="w-full justify-center"
                        :disabled="isGeneratingCodes || !generateQty || generateQty < 1" @click="handleGenerateCodes">
                        {{ isGeneratingCodes ? 'A gerar...' : 'Gerar códigos' }}
                    </UiButton>
                </UiCard>

            </div>
        </template>

        <!-- ── Secção 3: Gerador de Exercícios ────────────────────────────── -->
        <template v-else-if="currentSection === 'generator'">
            <div class="generator-nav">
                <UiButton variant="outline" size="sm" @click="goToBookDetail">
                    <template #icon-left>
                        <ArrowLeftIcon style="width: 16px; height: 16px; stroke-width: 2.5; flex-shrink: 0;"
                            aria-hidden="true" />
                    </template>
                    Voltar ao livro
                </UiButton>
            </div>

            <UiCard class="book-context-card">
                <div class="sbp-inline">
                    <div class="sbp-cover">
                        <img v-if="selectedBook?.cover_img" :src="getAssetUrl(selectedBook.cover_img)"
                            :alt="selectedBook?.title || ''" />
                        <span v-else class="sbp-cover-placeholder">
                            {{ selectedBook?.title?.[0]?.toUpperCase() || '?' }}
                        </span>
                    </div>
                    <div class="sbp-text">
                        <span class="sbp-name">{{ selectedBook?.title }}</span>
                        <span class="sbp-meta">{{ selectedBook?.editora?.nome_editora || 'Sem editora' }}</span>
                    </div>
                </div>
                <div class="book-context-chips">
                    <UiChip :label="selectedBook?.has_minimum_content ? 'Conteúdo completo' : 'Conteúdo em falta'"
                        :variant="selectedBook?.has_minimum_content ? 'filled' : 'outline'" size="sm" />
                </div>
            </UiCard>

            <div class="workspace" data-tour="generator-workspace">
                <div class="main-column">
                    <UiCard class="workspace-panel">
                        <div class="panel-header">
                            <div class="step-indicator">1</div>
                            <div class="header-text">
                                <h2>Seleciona os Módulos</h2>
                                <p class="meta">Marca até {{ MAX_SELECTED_MODULES }} módulos que precisam de novos
                                    exercícios. São necessários {{ APPROVAL_THRESHOLD }} exercícios aprovados por
                                    módulo.</p>
                            </div>
                        </div>
                        <div class="panel-body">
                            <ModuleGrid :modules="filteredModules" :selected-module-ids="selectedModuleIds"
                                :active-module-id="selectedModuleId" @toggle="toggleModuleSelection"
                                @active="selectedModuleId = $event" />
                        </div>
                    </UiCard>

                    <section v-if="approvedSummaries.length" class="approved-section">
                        <div class="workspace-section-header">
                            <h2>Exercícios Aprovados</h2>
                            <p class="meta">Lista de exercícios já aprovados em cada módulo selecionado.</p>
                        </div>
                        <div class="approved-grid">
                            <UiCard v-for="summary in approvedSummaries" :key="summary.moduleItem.modules_id"
                                class="approved-module-card" :class="{ 'is-approved': summary.isApproved }">
                                <div class="card-summary" :role="summary.approvedCount > 0 ? 'button' : undefined"
                                    :tabindex="summary.approvedCount > 0 ? '0' : undefined"
                                    @click="summary.approvedCount > 0 && toggleModuleExpanded(summary.moduleItem.modules_id)">
                                    <div class="module-info">
                                        <h4>{{ summary.moduleItem.module_title || 'Módulo' }}</h4>
                                        <UiChip :label="summary.isApproved ? 'Aprovado' : 'Por aprovar'"
                                            :variant="summary.isApproved ? 'filled' : 'outline'" />
                                        <UiChip
                                            :label="summary.approvedCount >= MAX_MODULE_EXERCISES ? 'Limite atingido' : `${summary.approvedCount}/${MAX_MODULE_EXERCISES} exercícios`"
                                            :variant="summary.approvedCount >= MAX_MODULE_EXERCISES ? 'filled' : 'outline'"
                                            size="sm" />
                                    </div>
                                    <div class="module-progress">
                                        <ChevronDownIcon v-if="summary.approvedCount > 0" class="accordion-icon"
                                            :class="{ 'is-rotated': expandedModules[summary.moduleItem.modules_id] }"
                                            aria-hidden="true" />
                                        <div v-else class="accordion-icon-placeholder"></div>
                                    </div>
                                </div>
                                <div class="accordion-wrapper"
                                    :class="{ 'is-open': expandedModules[summary.moduleItem.modules_id] }">
                                    <div class="accordion-content">
                                        <div class="approved-list-container">
                                            <ApprovedExercisesList v-if="summary.approved.length"
                                                :exercises="summary.approved" :type-labels="typeLabels"
                                                :max-count="MAX_MODULE_EXERCISES" :min-required="APPROVAL_THRESHOLD"
                                                @remove="handleRemoveApproved" />
                                        </div>
                                    </div>
                                </div>
                            </UiCard>
                        </div>
                    </section>

                    <div v-if="groupedSections.length" class="generated-section">
                        <div class="workspace-section-header">
                            <div class="section-header-flex">
                                <div>
                                    <h2>Exercícios Gerados pela IA</h2>
                                    <p class="meta">Revê, edita (se necessário) e aprova as melhores questões geradas.
                                    </p>
                                </div>
                                <UiButton variant="outline" size="sm" @click="handleClearExercises">
                                    <template #icon-left>
                                        <TrashIcon style="width: 15px; height: 15px; flex-shrink: 0;"
                                            aria-hidden="true" />
                                    </template>
                                    Limpar exercícios
                                </UiButton>
                            </div>
                        </div>
                        <GeneratedExercisesList :sections="groupedSections" :type-labels="typeLabels"
                            :approving-map="approvingMap" @approve="handleApprove" @reject="handleReject" />
                    </div>

                    <UiCard v-if="rawFlowiseResponse" class="raw-panel">
                        <div class="raw-panel-header">
                            <h3>Resposta Raw Flowise</h3>
                            <button class="copy-btn" @click="copyToClipboard(rawFlowiseResponse, 'response')">
                                <ClipboardDocumentCheckIcon v-if="copiedResponse" class="copy-icon"
                                    aria-hidden="true" />
                                <ClipboardDocumentIcon v-else class="copy-icon" aria-hidden="true" />
                                {{ copiedResponse ? 'Copiado!' : 'Copiar' }}
                            </button>
                        </div>
                        <pre class="raw-output">{{ rawFlowiseResponse }}</pre>
                    </UiCard>

                    <UiCard v-if="rawFlowiseRequest" class="raw-panel">
                        <div class="raw-panel-header">
                            <h3>Pedido Raw Flowise (Enviado)</h3>
                            <button class="copy-btn" @click="copyToClipboard(rawFlowiseRequest, 'request')">
                                <ClipboardDocumentCheckIcon v-if="copiedRequest" class="copy-icon" aria-hidden="true" />
                                <ClipboardDocumentIcon v-else class="copy-icon" aria-hidden="true" />
                                {{ copiedRequest ? 'Copiado!' : 'Copiar' }}
                            </button>
                        </div>
                        <pre class="raw-output">{{ rawFlowiseRequest }}</pre>
                    </UiCard>
                </div>

                <div class="sidebar-column">
                    <GeneratorConfigPanel :max-per-module="maxPerModule" :count-per-module="countPerModule"
                        :total-questions="totalQuestions" :is-over-max-total="isOverMaxTotal"
                        :selected-module-ids-length="selectedModuleIds.length" :has-selected-book="!!selectedBookId"
                        :is-generating="isGenerating" :max-total-questions="MAX_TOTAL_QUESTIONS"
                        @update:count-per-module="countPerModule = Math.max(1, Number($event) || 1)"
                        @generate="handleGenerate" />
                </div>
            </div>
        </template>

        <!-- ── Modais ──────────────────────────────────────────────────────── -->
        <UiModal v-if="authStore.isAdmin" :visible="showApprovalModal" :close-on-overlay="true"
            @close="showApprovalModal = false">
            <div class="approval-modal-card">
                <div class="approval-modal-header">
                    <ExclamationTriangleIcon class="modal-warning-icon" aria-hidden="true" />
                    <h3>Publicar livro</h3>
                </div>
                <div class="approval-modal-body">
                    <p>Ao confirmar, <strong>{{ selectedBook?.title }}</strong> ficará imediatamente visível para todos
                        os
                        utilizadores na plataforma.</p>
                    <p class="modal-note">Esta ação pode ser revertida manualmente no Directus.</p>
                </div>
                <div class="approval-modal-actions">
                    <UiButton variant="outline" size="sm" @click="showApprovalModal = false">Cancelar</UiButton>
                    <UiButton variant="primary" size="sm" :loading="isApprovingBook" :disabled="isApprovingBook"
                        @click="handleConfirmPublish">Confirmar publicação</UiButton>
                </div>
            </div>
        </UiModal>

        <UiModal :visible="showRegenerateModal" :close-on-overlay="true" @close="showRegenerateModal = false">
            <div class="approval-modal-card">
                <div class="approval-modal-header">
                    <ExclamationTriangleIcon class="modal-warning-icon" aria-hidden="true" />
                    <h3>Gerar novos exercícios</h3>
                </div>
                <div class="approval-modal-body">
                    <p>Já existem exercícios gerados. Ao continuar, os <strong>exercícios anteriores serão
                            apagados</strong> e
                        substituídos pelos novos.</p>
                    <p class="modal-note">Os exercícios já aprovados não são afetados.</p>
                </div>
                <div class="approval-modal-actions">
                    <UiButton variant="outline" size="sm" @click="showRegenerateModal = false">Cancelar</UiButton>
                    <UiButton variant="primary" size="sm" @click="confirmRegenerate">Gerar na mesma</UiButton>
                </div>
            </div>
        </UiModal>

        <UiModal :visible="showClearExercisesModal" :close-on-overlay="true" @close="showClearExercisesModal = false">
            <div class="approval-modal-card">
                <div class="approval-modal-header">
                    <ExclamationTriangleIcon class="modal-warning-icon" aria-hidden="true" />
                    <h3>Limpar exercícios</h3>
                </div>
                <div class="approval-modal-body">
                    <p>Tens a certeza que queres remover todos os exercícios gerados? Esta ação não pode ser revertida.
                    </p>
                    <p class="modal-note">Os exercícios já aprovados não são afetados.</p>
                </div>
                <div class="approval-modal-actions">
                    <UiButton variant="outline" size="sm" @click="showClearExercisesModal = false">Cancelar</UiButton>
                    <UiButton variant="danger" size="sm" :style="{ '--btn-shadow': '#fca5a5' }"
                        @click="confirmClearExercises">
                        Limpar exercícios</UiButton>
                </div>
            </div>
        </UiModal>

        <UiModal :visible="showDiscardModal" :close-on-overlay="true" @close="cancelDiscard">
            <div class="approval-modal-card">
                <div class="approval-modal-header">
                    <ExclamationTriangleIcon class="modal-warning-icon" aria-hidden="true" />
                    <h3>Exercícios não guardados</h3>
                </div>
                <div class="approval-modal-body">
                    <p>Tens exercícios gerados que ainda não foram aprovados. Se continuares, <strong>os exercícios
                            serão
                            perdidos</strong>.</p>
                    <p class="modal-note">Os exercícios já aprovados não são afetados.</p>
                </div>
                <div class="approval-modal-actions">
                    <UiButton variant="outline" size="sm" @click="cancelDiscard">Cancelar</UiButton>
                    <UiButton variant="primary" size="sm" @click="confirmDiscard">Continuar</UiButton>
                </div>
            </div>
        </UiModal>

        <GeneratorLoadingOverlay :is-generating="isGenerating" :progress-label="progressLabel"
            :progress="generationProgress" />
    </div>
</template>

<style scoped>
.manage-books-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-500);
    color: var(--color-mirage-900);
}

/* ── Hero (secção 1) ── */
.hero {
    display: flex;
    align-items: center;
    gap: var(--space-600);
    padding: var(--space-600);
    border-radius: var(--radius-400);
    background: var(--color-wild-100);
    color: var(--color-mirage-900);
    border: 2px solid var(--color-mirage-900);
    box-shadow: 6px 6px 0 var(--color-shadow);
}

.hero-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-300);
    max-width: 800px;
}

.hero-title {
    font-size: 36px;
    margin: 0;
    line-height: 1.1;
    color: var(--color-mirage-900);
    font-family: var(--font-display);
}

.hero-subtitle {
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
    color: var(--color-mirage-600);
}

.loading-banner {
    padding: var(--space-300) var(--space-400);
    border-radius: var(--radius-200);
    border: 2px solid var(--color-mirage-900);
    font-weight: 600;
    box-shadow: 3px 3px 0 var(--color-shadow);
    background: var(--color-wild-200);
}

/* ── Lista de livros (secção 1) ── */
.books-list-card {
    display: flex;
    flex-direction: column;
}

.panel-header {
    display: flex;
    align-items: center;
    gap: var(--space-300);
    padding-bottom: var(--space-300);
    border-bottom: 2px dashed var(--color-mirage-200);
    margin-bottom: var(--space-400);
}

.header-text {
    flex: 1;
    min-width: 0;
}

.header-text h2 {
    margin: 0;
    font-size: 22px;
}

.header-text .meta {
    margin: 4px 0 0;
    color: var(--color-mirage-500);
    font-size: 14px;
}

.step-indicator {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: var(--color-deep-600);
    color: var(--color-wild-100);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 18px;
    border: 2px solid var(--color-mirage-900);
    box-shadow: 2px 2px 0 var(--color-shadow);
    flex-shrink: 0;
}

.book-list-filters {
    display: flex;
    gap: var(--space-300);
    margin-bottom: var(--space-300);
    flex-wrap: wrap;
    align-items: flex-start;
}

.filter-search {
    flex: 1;
    min-width: 180px;
}

.book-grid-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-400);
}

.book-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-300);
}

.book-card {
    display: flex;
    gap: var(--space-300);
    align-items: center;
    padding: var(--space-300);
    background: var(--color-wild-100);
    border: 2px solid var(--color-mirage-800);
    border-radius: 14px;
    box-shadow: 4px 4px 0 var(--color-shadow);
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.book-card:hover {
    transform: translateY(-2px);
    box-shadow: 4px 6px 0 var(--color-shadow);
    background: var(--color-wild-200);
}

.book-card:active {
    transform: translate(4px, 4px);
    box-shadow: 0 0 0 var(--color-shadow);
    background: var(--color-deep-100);
    border-color: var(--color-deep-600);
}

.book-card-cover {
    width: 52px;
    height: 72px;
    flex-shrink: 0;
    border-radius: 3px 6px 6px 3px;
    overflow: hidden;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-300);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: -4px 0 8px rgba(0, 0, 0, 0.12) inset, 2px 2px 6px rgba(0, 0, 0, 0.15);
    align-self: center;
}

.book-card-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.book-card-cover-placeholder {
    font-size: 20px;
    font-weight: 800;
    color: var(--color-mirage-600);
}

.book-card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-100);
}

.book-card-title {
    font-size: 13px;
    font-weight: 800;
    color: var(--color-mirage-900);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.book-card-publisher {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-mirage-500);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.book-card-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-100);
    margin-top: var(--space-100);
}

.book-card-chips :deep(.ui-chip) {
    font-size: 10px;
    padding: 1px var(--space-200);
    box-shadow: 2px 2px 0 var(--color-shadow);
}

.book-cards-empty {
    grid-column: 1 / -1;
    padding: var(--space-500);
    text-align: center;
    color: var(--color-mirage-400);
    font-size: 14px;
    margin: 0;
}

.book-grid-legend {
    display: flex;
    flex-direction: column;
    gap: var(--space-200);
    padding: var(--space-300) var(--space-400);
    border-radius: 12px;
    border: 2px solid var(--color-mirage-900);
    background: var(--color-wild-200);
    box-shadow: 3px 3px 0 var(--color-shadow);
}

.bgl-title {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-mirage-500);
}

.bgl-row {
    display: flex;
    align-items: center;
    gap: var(--space-200);
    flex-wrap: wrap;
}

.bgl-sep {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-mirage-400);
}

.bgl-desc {
    font-size: 12px;
    color: var(--color-mirage-600);
}

/* ── Navegação de volta (secções 2 e 3) ── */
.detail-nav,
.generator-nav {
    display: flex;
    align-items: center;
    gap: var(--space-400);
}

/* ── Detalhe do livro (secção 2) ── */
.detail-hero-wrapper {
    padding: 0 var(--space-400);
}

.detail-hero-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-600);
    padding: var(--space-600);
    background: var(--color-wild-100);
    border: 2px solid var(--color-mirage-900);
    border-radius: var(--radius-400);
    box-shadow: 4px 4px 0 var(--color-shadow);
}

.detail-hero-content {
    display: flex;
    gap: var(--space-600);
    align-items: flex-start;
}

.dh-cover {
    flex-shrink: 0;
    padding-top: var(--space-200);
}

.dh-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-500);
}

.dh-title-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-100);
}

.dh-title {
    margin: 0;
    font-size: 36px;
    font-weight: 900;
    font-family: var(--font-display);
    color: var(--color-mirage-900);
    line-height: 1.15;
}

.dh-publisher {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-mirage-600);
}

.dh-tags {
    display: flex;
    gap: var(--space-200);
    flex-wrap: wrap;
    padding-top: var(--space-200);
}

/* ── Informações extras (lista dl) ── */
.dh-info-list {
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    border-top: 2px solid var(--color-mirage-100);
    padding-top: var(--space-300);
}

.dh-info-row {
    display: flex;
    align-items: baseline;
    gap: var(--space-400);
    padding: var(--space-200) 0;
    border-bottom: 1px solid var(--color-mirage-100);
}

.dh-info-row:last-child {
    border-bottom: none;
}

.dh-info-row dt {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-mirage-400);
    min-width: 130px;
    flex-shrink: 0;
}

.dh-info-row dd {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-mirage-900);
}

.dh-site-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-100);
    color: var(--color-deep-600);
    font-weight: 700;
    font-size: 14px;
    text-decoration: none;
    transition: color 0.15s ease;
}

.dh-site-link:hover {
    color: var(--color-deep-800);
    text-decoration: underline;
}

.dh-site-link-icon {
    width: 13px;
    height: 13px;
    stroke-width: 2.5;
    flex-shrink: 0;
}

.dh-actions {
    display: flex;
    gap: var(--space-300);
    align-items: center;
    flex-wrap: wrap;
    padding-top: var(--space-200);
}

.dh-alerts {
    display: flex;
    flex-direction: column;
    gap: var(--space-300);
    padding-top: var(--space-200);
}

.dh-alert-card {
    padding: var(--space-300);
    display: flex;
    align-items: flex-start;
    gap: var(--space-300);
    font-size: 14px;
    font-weight: 700;
    color: var(--color-mirage-800);
    background: var(--color-amber-100);
    border-radius: var(--radius-200);
    border-left: 4px solid var(--color-amber-600);
}

.dh-alert-icon {
    width: 20px;
    height: 20px;
    color: var(--color-amber-600);
    flex-shrink: 0;
    margin-top: 2px;
}

.dh-description {
    display: flex;
    flex-direction: column;
    gap: var(--space-300);
    padding-top: var(--space-500);
    border-top: 2px solid var(--color-mirage-200);
}

.dh-desc-header {
    display: flex;
    align-items: center;
    gap: var(--space-200);
}

.dh-desc-title {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    font-family: var(--font-display);
    color: var(--color-mirage-900);
}

.dh-desc-text {
    margin: 0;
    font-size: 15px;
    line-height: 1.7;
    color: var(--color-mirage-700);
    padding: var(--space-300) var(--space-400);
    background: var(--color-wild-200);
    border-radius: var(--radius-200);
    border-left: 4px solid var(--color-teal-400);
}

/* Grid layout */
.detail-body-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-500);
    align-items: stretch;
    padding: 0 var(--space-400);
}

.detail-modules-card,
.codes-management-card {
    height: 100%;
    box-sizing: border-box;
}

/* ── Módulos ── */
.detail-modules-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-400);
}

.dm-header-title {
    display: flex;
    align-items: center;
    gap: var(--space-200);
}

.dm-header-title h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
}

.dm-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.dm-row {
    display: grid;
    grid-template-columns: 28px 1fr auto auto;
    align-items: start;
    gap: var(--space-300);
    padding: var(--space-300) 0;
    border-bottom: 1px solid var(--color-mirage-100);
}

.dm-row:last-child {
    border-bottom: none;
}

.dm-num {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-mirage-400);
    font-variant-numeric: tabular-nums;
    text-align: right;
    flex-shrink: 0;
    padding-top: 2px;
}

.dm-row.is-approved .dm-num {
    color: var(--color-teal-600);
}

.dm-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.dm-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-mirage-900);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dm-desc {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-mirage-500);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
}

.dm-desc--empty {
    color: var(--color-mirage-300);
    font-style: italic;
}

.dm-count {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-mirage-400);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    padding-top: 2px;
}

.dm-empty {
    margin: var(--space-400) 0 0;
    font-size: 13px;
    color: var(--color-mirage-400);
    text-align: center;
}

.detail-empty-msg {
    margin: 0;
    font-size: 13px;
    color: var(--color-mirage-400);
    text-align: center;
    padding: var(--space-400) 0;
}

/* ── Estatísticas ── */
/* Codes */
.codes-management-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-400);
    padding: var(--space-400);
    background: var(--color-wild-100);
    border: 2px solid var(--color-mirage-900);
    border-radius: var(--radius-400);
    box-shadow: 4px 4px 0 var(--color-shadow);
}

.codes-card-header {
    display: flex;
    align-items: center;
    gap: var(--space-300);
    padding-bottom: var(--space-300);
    border-bottom: 2px dashed var(--color-mirage-200);
    margin-bottom: var(--space-300);
    min-width: 0;
}

.codes-card-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    color: var(--color-mirage-900);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.codes-header-icon {
    width: 24px;
    height: 24px;
    color: var(--color-teal-600);
    stroke-width: 2.25;
    flex-shrink: 0;
}

.codes-low-warning {
    display: flex;
    align-items: flex-start;
    gap: var(--space-200);
    padding: var(--space-300);
    border-radius: var(--radius-200);
    background: var(--color-amber-100);
    color: var(--color-mirage-900);
    font-size: 13px;
    word-break: break-word;
}

.codes-low-icon {
    width: 18px;
    height: 18px;
    color: var(--color-amber-600);
    flex-shrink: 0;
}

.codes-progress-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-200);
}

.codes-progress-bar {
    height: 10px;
    background: var(--color-mirage-200);
    border-radius: 999px;
    overflow: hidden;
}

.codes-progress-fill {
    height: 100%;
    background: var(--color-amber-500);
    transition: width 0.3s ease;
}

.codes-progress-label {
    font-size: 12px;
    font-weight: 700;
    text-align: right;
    color: var(--color-mirage-600);
}

/* Códigos (secção 2) */
.codes-loading {
    display: flex;
    align-items: center;
    gap: var(--space-200);
    font-size: 13px;
    color: var(--color-mirage-500);
}

.codes-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--color-wild-400);
    border-top-color: var(--color-deep-500);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.codes-stat-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-200);
    font-size: 14px;
    min-width: 0;
}

.codes-stat-label {
    font-weight: 700;
    color: var(--color-mirage-500);
    flex-shrink: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.codes-stat-value {
    font-weight: 800;
    color: var(--color-mirage-800);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
}

.codes-stat-value--low {
    color: var(--color-amber-600);
}

.dc-alert-card {
    padding: var(--space-300);
    display: flex;
    align-items: flex-start;
    gap: var(--space-200);
    font-size: 13px;
    font-weight: 700;
    color: var(--color-mirage-800);
    margin-top: var(--space-200);
}

.dc-alert-icon {
    width: 20px;
    height: 20px;
    color: var(--color-amber-600);
    flex-shrink: 0;
    margin-top: -2px;
}

.dc-divider {
    height: 2px;
    background: dashed var(--color-mirage-200);
    margin: var(--space-200) 0;
}

.dc-generate-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-200);
}

.dc-label {
    font-size: 13px;
    font-weight: 800;
    color: var(--color-mirage-900);
}

.dc-input {
    width: 100%;
    padding: var(--space-300);
    border-radius: var(--radius-200);
    border: 2px solid var(--color-mirage-800);
    font-weight: 800;
    font-size: 16px;
    color: var(--color-mirage-900);
    outline: none;
    transition: border-color 0.2s ease;
}

.dc-input:focus {
    border-color: var(--color-deep-600);
}

.dc-input:disabled {
    background: var(--color-wild-200);
    color: var(--color-mirage-500);
    cursor: not-allowed;
}

.dc-progress {
    display: flex;
    flex-direction: column;
    gap: var(--space-200);
}

.dc-progress-bar {
    height: 10px;
    background: var(--color-mirage-200);
    border-radius: 999px;
    overflow: hidden;
}

.dc-progress-fill {
    height: 100%;
    background: var(--color-deep-600);
    transition: width 0.3s ease;
}

.dc-progress-label {
    font-size: 12px;
    font-weight: 700;
    text-align: right;
    color: var(--color-mirage-600);
}

.dc-btn {
    width: 100%;
    justify-content: center;
}

/* Utilities */
.w-full {
    width: 100%;
}

.mt-2 {
    margin-top: var(--space-200);
}

.justify-center {
    justify-content: center;
}

/* ── Gerador (secção 3) ── */
.book-context-card {
    display: flex;
    align-items: center;
    gap: var(--space-400);
    flex-wrap: wrap;
}

.book-context-chips {
    display: flex;
    gap: var(--space-200);
    flex-wrap: wrap;
    margin-left: auto;
}

.sbp-inline {
    display: flex;
    align-items: center;
    gap: var(--space-300);
    min-width: 0;
}

.sbp-cover {
    width: 40px;
    height: 56px;
    flex-shrink: 0;
    border-radius: 3px 5px 5px 3px;
    overflow: hidden;
    border: 2px solid var(--color-mirage-800);
    background: var(--color-wild-300);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: -3px 0 6px rgba(0, 0, 0, 0.12) inset, 2px 2px 6px rgba(0, 0, 0, 0.15);
}

.sbp-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.sbp-cover-placeholder {
    font-size: 14px;
    font-weight: 800;
    color: var(--color-mirage-600);
}

.sbp-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.sbp-name {
    font-size: 16px;
    font-weight: 800;
    color: var(--color-mirage-900);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sbp-meta {
    font-size: 12px;
    color: var(--color-mirage-500);
    font-weight: 600;
}

.workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: var(--space-500);
    align-items: start;
}

.sidebar-column {
    display: flex;
    flex-direction: column;
    gap: var(--space-500);
}

.main-column {
    display: flex;
    flex-direction: column;
    gap: var(--space-500);
}

.workspace-panel {
    display: flex;
    flex-direction: column;
}

.workspace-section-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-100);
    margin-bottom: var(--space-400);
    margin-top: var(--space-200);
}

.workspace-section-header h2 {
    margin: 0;
    font-size: 22px;
    color: var(--color-mirage-900);
}

.workspace-section-header .meta {
    margin: 0;
    color: var(--color-mirage-600);
    font-size: 14px;
}

.section-header-flex {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-400);
}

.approved-grid {
    display: grid;
    gap: var(--space-500);
}

.approved-module-card {
    padding: 0 !important;
    overflow: hidden;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.approved-module-card.is-approved {
    border-color: var(--color-teal-500);
}

.card-summary {
    padding: var(--space-400);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-400);
    background: var(--color-wild-100);
    transition: background 0.2s ease;
}

.card-summary[role="button"] {
    cursor: pointer;
}

.card-summary[role="button"]:hover {
    background: var(--color-wild-200);
}

.approved-module-card.is-approved .card-summary {
    background: #f0faf4;
}

.approved-module-card.is-approved .card-summary[role="button"]:hover {
    background: #e6f5eb;
}

.module-info {
    display: flex;
    align-items: center;
    gap: var(--space-300);
}

.module-info h4 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--color-mirage-900);
}

.module-progress {
    display: flex;
    align-items: center;
    gap: var(--space-300);
    flex: 1;
    max-width: 250px;
    justify-content: flex-end;
}

.accordion-icon {
    width: 20px;
    height: 20px;
    color: var(--color-mirage-500);
    flex-shrink: 0;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.accordion-icon-placeholder {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
}

.accordion-icon.is-rotated {
    transform: rotate(180deg);
}

.accordion-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--color-wild-100);
}

.accordion-wrapper.is-open {
    grid-template-rows: 1fr;
}

.accordion-content {
    overflow: hidden;
    min-height: 0;
}

.approved-list-container {
    padding: var(--space-400);
    border-top: 1px solid var(--color-mirage-200);
}

/* Raw panels */
.raw-panel {
    background: var(--color-mirage-900);
    color: var(--color-wild-100);
}

.raw-panel h3 {
    margin: 0 0 var(--space-300);
    color: var(--color-wild-100);
}

.raw-output {
    margin: 0;
    font-family: monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 400px;
    overflow: auto;
    color: var(--color-teal-200);
}

.raw-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-300);
}

.raw-panel-header h3 {
    margin: 0;
    color: var(--color-wild-100);
}

.copy-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 8px;
    border: 2px solid var(--color-teal-400);
    background: transparent;
    color: var(--color-teal-300);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
}

.copy-btn:hover {
    background: var(--color-teal-400);
    color: var(--color-mirage-900);
}

.copy-icon {
    width: 16px;
    height: 16px;
    stroke-width: 2;
    flex-shrink: 0;
}

/* ── Modais ── */
.approval-modal-card {
    background: var(--color-wild-100);
    border: 2px solid var(--color-mirage-900);
    border-radius: var(--radius-400);
    box-shadow: 6px 6px 0 var(--color-shadow);
    padding: var(--space-600);
    max-width: 480px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-500);
}

.approval-modal-header {
    display: flex;
    align-items: center;
    gap: var(--space-300);
}

.approval-modal-header h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    color: var(--color-mirage-900);
}

.modal-warning-icon {
    width: 32px;
    height: 32px;
    color: var(--color-amber-500);
    flex-shrink: 0;
}

.approval-modal-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-200);
}

.approval-modal-body p {
    margin: 0;
    font-size: 15px;
    color: var(--color-mirage-700);
    line-height: 1.5;
}

.modal-note {
    font-size: 13px !important;
    color: var(--color-mirage-400) !important;
}

.approval-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-300);
}

/* ── Responsividade ── */
@media (max-width: 1024px) {
    .workspace {
        grid-template-columns: 1fr;
    }

    .card-summary {
        flex-direction: column;
        align-items: flex-start;
    }

    .module-progress {
        width: 100%;
        max-width: none;
    }

    .detail-body-grid {
        grid-template-columns: 1fr;
    }

    .detail-hero-content {
        flex-direction: column;
    }
}

@media (max-width: 768px) {
    .detail-hero-wrapper {
        padding: 0 var(--space-200);
    }

    .detail-hero-card {
        padding: var(--space-400);
        gap: var(--space-400);
    }

    .detail-hero-content {
        flex-direction: column;
        gap: var(--space-400);
    }

    .dh-title {
        font-size: 28px;
    }

    .dh-metadata {
        grid-template-columns: 1fr;
    }

    .dh-actions {
        flex-direction: column;
    }

    .dh-actions>* {
        width: 100%;
    }

    .book-cards-grid {
        grid-template-columns: 1fr;
    }

    .detail-body-grid {
        padding: 0 var(--space-200);
        grid-template-columns: 1fr;
    }
}

@media (max-width: 45em) {
    .hero {
        flex-direction: column;
        align-items: flex-start;
    }

    .detail-hero-wrapper {
        padding: 0 var(--space-150);
    }
}
</style>
