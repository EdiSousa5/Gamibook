<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'
import UiSwitch from '@/components/ui/UiSwitch.vue'
import UiSlider from '@/components/ui/UiSlider.vue'
import UiStatCard from '@/components/ui/UiStatCard.vue'
import QuestionCard from '@/components/ui/QuestionCard.vue'
import ExerciseOption from '@/components/ui/ExerciseOption.vue'
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  ForwardIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  ListBulletIcon,
  InformationCircleIcon,
} from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { fetchBook, fetchModulesByBook } from '@/services/books'
import {
  fetchExercisesByModule,
  fetchUserExercisesByModule,
  fetchApprovedExerciseCountsByModule,
} from '@/services/exercises'
import {
  buildOptions,
  isOptionCorrect,
  getQuestionText,
  shuffleArray,
} from '@/utils/exerciseUtils'
import type { Book, Module } from '@/types/book'
import type { Exercise } from '@/types'

const route = useRoute()
const auth = useAuthStore()
const bookId = computed(() => Number(route.params.bookId))

type Phase = 'config' | 'runner' | 'summary'
const phase = ref<Phase>('config')

type ExerciseItem = {
  exercise: Exercise
  moduleTitle: string
  moduleId: number
}

const book = ref<Book | null>(null)
const modules = ref<Module[]>([])
const allExercisesByModule = ref<Map<number, ExerciseItem[]>>(new Map())
const loadingConfig = ref(true)
const loadingExercises = ref(false)
const configError = ref('')

const typeFilter = ref<'all' | 'multiple-choice' | 'true-false'>('all')

const orderMode = ref<'random' | 'module' | 'manual'>('random')

const timerSeconds = ref(0)
const repeatWrong = ref(false)
const showCorrectAnswer = ref(true)

const showManualModal = ref(false)
const showInfoModal = ref(false)

// ---- localStorage session persistence ----
const LS_KEY = computed(() => `gb_study_${bookId.value}`)
const hasSavedSession = ref(false)

type SavedSession = {
  typeFilter: 'all' | 'multiple-choice' | 'true-false'
  orderMode: 'random' | 'module' | 'manual'
  timerSeconds: number
  repeatWrong: boolean
  showCorrectAnswer: boolean
  selectedIds: number[]
}

const checkSavedSession = () => {
  hasSavedSession.value = !!localStorage.getItem(LS_KEY.value)
}

const saveSession = () => {
  const data: SavedSession = {
    typeFilter: typeFilter.value,
    orderMode: orderMode.value,
    timerSeconds: timerSeconds.value,
    repeatWrong: repeatWrong.value,
    showCorrectAnswer: showCorrectAnswer.value,
    selectedIds: orderedSelectedIds.value,
  }
  localStorage.setItem(LS_KEY.value, JSON.stringify(data))
  hasSavedSession.value = true
}

const loadLastSession = () => {
  const raw = localStorage.getItem(LS_KEY.value)
  if (!raw) return
  try {
    const data = JSON.parse(raw) as SavedSession
    typeFilter.value = data.typeFilter ?? 'all'
    orderMode.value = data.orderMode ?? 'random'
    timerSeconds.value = data.timerSeconds ?? 0
    repeatWrong.value = data.repeatWrong ?? false
    showCorrectAnswer.value = data.showCorrectAnswer ?? true
    const validIds = new Set(filteredItems.value.map((i) => Number(i.exercise.exercise_id)).filter((n) => Number.isFinite(n)))
    orderedSelectedIds.value = (data.selectedIds ?? []).filter((id) => validIds.has(id))
  } catch { /* ignore */ }
}

const resetToDefaults = () => {
  typeFilter.value = 'all'
  orderMode.value = 'random'
  timerSeconds.value = 0
  repeatWrong.value = false
  showCorrectAnswer.value = true
  orderedSelectedIds.value = []
}

const filteredItemsByModule = computed<Map<number, ExerciseItem[]>>(() => {
  const result = new Map<number, ExerciseItem[]>()
  for (const mod of modules.value) {
    const items = allExercisesByModule.value.get(mod.modules_id) ?? []
    let filtered = items
    if (typeFilter.value !== 'all') filtered = filtered.filter((i) => i.exercise.type === typeFilter.value)
    if (filtered.length > 0) result.set(mod.modules_id, filtered)
  }
  return result
})

const filteredItems = computed<ExerciseItem[]>(() => {
  const items: ExerciseItem[] = []
  for (const mod of modules.value) items.push(...(filteredItemsByModule.value.get(mod.modules_id) ?? []))
  return items
})

const hasAnyExercises = computed(() => {
  for (const items of allExercisesByModule.value.values()) if (items.length > 0) return true
  return false
})

const orderedSelectedIds = ref<number[]>([])

watch(filteredItems, (newItems) => {
  const validIds = new Set(newItems.map((i) => Number(i.exercise.exercise_id)).filter((n) => Number.isFinite(n)))
  orderedSelectedIds.value = orderedSelectedIds.value.filter((id) => validIds.has(id))
})

const isSelected = (id: number) => orderedSelectedIds.value.includes(id)

const toggleExercise = (id: number) => {
  if (isSelected(id)) orderedSelectedIds.value = orderedSelectedIds.value.filter((x) => x !== id)
  else orderedSelectedIds.value = [...orderedSelectedIds.value, id]
}

const selectAllExercises = () => {
  const allIds = filteredItems.value.map((i) => Number(i.exercise.exercise_id)).filter((n) => Number.isFinite(n))
  const current = new Set(orderedSelectedIds.value)
  orderedSelectedIds.value = [...orderedSelectedIds.value, ...allIds.filter((id) => !current.has(id))]
}

const clearExercises = () => { orderedSelectedIds.value = [] }

const expandedModules = ref<Set<number>>(new Set())
const toggleModuleExpand = (modId: number) => {
  const s = new Set(expandedModules.value)
  s.has(modId) ? s.delete(modId) : s.add(modId)
  expandedModules.value = s
}
const isModuleExpanded = (modId: number) => expandedModules.value.has(modId)

const moduleExerciseIds = (modId: number) =>
  (filteredItemsByModule.value.get(modId) ?? [])
    .map((i) => Number(i.exercise.exercise_id))
    .filter((n) => Number.isFinite(n))

const countSelectedInModule = (modId: number) => {
  const ids = new Set(moduleExerciseIds(modId))
  return orderedSelectedIds.value.filter((id) => ids.has(id)).length
}
const countTotalInModule = (modId: number) => filteredItemsByModule.value.get(modId)?.length ?? 0

const isModuleFullySelected = (modId: number) => {
  const ids = moduleExerciseIds(modId)
  return ids.length > 0 && ids.every((id) => orderedSelectedIds.value.includes(id))
}
const isModulePartiallySelected = (modId: number) => {
  const ids = moduleExerciseIds(modId)
  if (!ids.length) return false
  const sel = ids.filter((id) => orderedSelectedIds.value.includes(id))
  return sel.length > 0 && sel.length < ids.length
}
const toggleModuleSelection = (modId: number) => {
  const ids = moduleExerciseIds(modId)
  if (isModuleFullySelected(modId)) {
    orderedSelectedIds.value = orderedSelectedIds.value.filter((id) => !ids.includes(id))
  } else {
    const current = new Set(orderedSelectedIds.value)
    orderedSelectedIds.value = [...orderedSelectedIds.value, ...ids.filter((id) => !current.has(id))]
  }
}

const dragFromIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const manualOrderItems = computed<ExerciseItem[]>(() =>
  orderedSelectedIds.value
    .map((id) => filteredItems.value.find((i) => Number(i.exercise.exercise_id) === id))
    .filter((i): i is ExerciseItem => i != null),
)

const onDragStart = (e: DragEvent, index: number) => {
  dragFromIndex.value = index
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
const onDragEnter = (index: number) => {
  if (dragFromIndex.value !== null && dragFromIndex.value !== index) dragOverIndex.value = index
}
const onDrop = (e: DragEvent, toIndex: number) => {
  e.preventDefault()
  if (dragFromIndex.value === null || dragFromIndex.value === toIndex) return
  const arr = [...orderedSelectedIds.value]
  const [item] = arr.splice(dragFromIndex.value, 1)
  arr.splice(toIndex, 0, item!)
  orderedSelectedIds.value = arr
  dragFromIndex.value = null
  dragOverIndex.value = null
}
const onDragEnd = () => { dragFromIndex.value = null; dragOverIndex.value = null }
const removeFromOrder = (id: number) => { orderedSelectedIds.value = orderedSelectedIds.value.filter((x) => x !== id) }

const canStart = computed(() => orderedSelectedIds.value.length > 0)

const visibleModules = computed(() =>
  modules.value.filter((m) => (filteredItemsByModule.value.get(m.modules_id)?.length ?? 0) > 0),
)

;(async () => {
  try {
    const [bookData, mods] = await Promise.all([fetchBook(bookId.value), fetchModulesByBook(bookId.value)])
    book.value = bookData

    const mainMods = mods.filter((m) => {
      if (m.status === 'unapproved') return false
      if (m.order_number == null) return true
      const n = Number(m.order_number)
      return Number.isFinite(n) && Number.isInteger(n)
    })
    modules.value = mainMods
    expandedModules.value = new Set(mainMods.map((m) => m.modules_id))

    const userId = auth.user?.id
    if (userId) {
      loadingExercises.value = true
      const results = await Promise.all(
        mainMods.map(async (m) => {
          const [, correctItems, modExercises] = await Promise.all([
            fetchApprovedExerciseCountsByModule(m.modules_id),
            fetchUserExercisesByModule(userId, m.modules_id, true),
            fetchExercisesByModule(m.modules_id),
          ])
          const correctIds = new Set(correctItems.map((ue) => Number(ue.exercise_id)).filter((n) => Number.isFinite(n)))
          const items: ExerciseItem[] = modExercises
            .filter((ex) => ex.exercise_id != null && correctIds.has(Number(ex.exercise_id)))
            .map((ex) => ({
              exercise: ex,
              moduleTitle: m.module_title || `Módulo ${m.modules_id}`,
              moduleId: m.modules_id,
            }))
          return [m.modules_id, items] as const
        }),
      )
      allExercisesByModule.value = new Map(results)
      loadingExercises.value = false
      checkSavedSession()
    }
  } catch {
    configError.value = 'Erro ao carregar os dados do livro.'
  } finally {
    loadingConfig.value = false
  }
})()

type SessionResult = {
  exercise: Exercise
  questionText: string
  selectedOption: string | null
  correctOption: string
  isCorrect: boolean
  wasSkipped: boolean
}

const sessionQueue = ref<Exercise[]>([])
const initialQueueLength = ref(0)
const shuffledOpts = ref<Record<number, string[]>>({})
const currentIndex = ref(0)
const selectedOption = ref<string | null>(null)
const attemptedOptions = ref<string[]>([])
const attemptsUsed = ref(0)
const isAnswered = ref(false)
const timeLeft = ref(-1)
const repeatedSet = ref(new Set<number>())
const sessionResults = ref<SessionResult[]>([])

let timerHandle: ReturnType<typeof setInterval> | null = null

const currentExercise = computed(() => sessionQueue.value[currentIndex.value] ?? null)
const currentOptions = computed(() => {
  const id = currentExercise.value?.exercise_id
  return id != null ? (shuffledOpts.value[Number(id)] ?? []) : []
})
const currentQuestionText = computed(() => currentExercise.value ? getQuestionText(currentExercise.value) : '')

const isTrueFalse = computed(() => currentExercise.value?.type === 'true-false')
const maxAttempts = computed(() => (isTrueFalse.value ? 1 : 2))
const attemptsLeft = computed(() => maxAttempts.value - attemptsUsed.value)

const CIRCUMFERENCE = 2 * Math.PI * 36
const timerDash = computed(() => {
  if (timerSeconds.value === 0) return `${CIRCUMFERENCE} ${CIRCUMFERENCE}`
  return `${Math.max(0, (timeLeft.value / timerSeconds.value) * CIRCUMFERENCE)} ${CIRCUMFERENCE}`
})

const progress = computed(() =>
  initialQueueLength.value > 0 ? (currentIndex.value / initialQueueLength.value) * 100 : 0,
)

const countCorrect = computed(() => sessionResults.value.filter((r) => r.isCorrect).length)
const countWrong = computed(() => sessionResults.value.filter((r) => !r.isCorrect && !r.wasSkipped).length)
const countSkipped = computed(() => sessionResults.value.filter((r) => r.wasSkipped).length)

const stopTimer = () => {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null }
}

const startTimer = () => {
  if (timerSeconds.value === 0) { timeLeft.value = -1; return }
  timeLeft.value = timerSeconds.value
  timerHandle = setInterval(() => {
    timeLeft.value -= 1
    if (timeLeft.value <= 0) { stopTimer(); if (!isAnswered.value) handleSkip() }
  }, 1000)
}

const getCorrectOption = (ex: Exercise) => buildOptions(ex).find((opt) => isOptionCorrect(ex, opt)) ?? ''

const startSession = () => {
  saveSession()
  let selectedExercises: Exercise[]
  if (orderMode.value === 'module') {
    const selectedSet = new Set(orderedSelectedIds.value)
    selectedExercises = filteredItems.value.filter((i) => selectedSet.has(Number(i.exercise.exercise_id))).map((i) => i.exercise)
  } else if (orderMode.value === 'random') {
    const base = orderedSelectedIds.value.map((id) => filteredItems.value.find((i) => Number(i.exercise.exercise_id) === id)).filter((i): i is ExerciseItem => i != null).map((i) => i.exercise)
    selectedExercises = shuffleArray(base)
  } else {
    selectedExercises = orderedSelectedIds.value.map((id) => filteredItems.value.find((i) => Number(i.exercise.exercise_id) === id)).filter((i): i is ExerciseItem => i != null).map((i) => i.exercise)
  }

  shuffledOpts.value = Object.fromEntries(
    selectedExercises
      .filter((ex) => ex.exercise_id != null)
      .map((ex) => [Number(ex.exercise_id), ex.type === 'true-false' ? buildOptions(ex) : shuffleArray(buildOptions(ex))]),
  )

  sessionQueue.value = selectedExercises
  initialQueueLength.value = selectedExercises.length
  currentIndex.value = 0
  sessionResults.value = []
  repeatedSet.value = new Set()
  resetQuestion()
  phase.value = 'runner'
  startTimer()
}

const resetQuestion = () => {
  stopTimer()
  selectedOption.value = null
  attemptedOptions.value = []
  attemptsUsed.value = 0
  isAnswered.value = false
  timeLeft.value = -1
}

const handleSelect = (option: string) => {
  if (isAnswered.value) return
  if (attemptedOptions.value.includes(option)) return
  selectedOption.value = option
  const ex = currentExercise.value
  if (!ex) return
  const correct = isOptionCorrect(ex, option)

  if (correct) {
    stopTimer()
    isAnswered.value = true
    sessionResults.value.push({ exercise: ex, questionText: getQuestionText(ex), selectedOption: option, correctOption: getCorrectOption(ex), isCorrect: true, wasSkipped: false })
  } else {
    attemptsUsed.value += 1
    attemptedOptions.value = [...attemptedOptions.value, option]
    if (attemptsUsed.value >= maxAttempts.value) {
      stopTimer()
      isAnswered.value = true
      if (repeatWrong.value && ex.exercise_id != null) {
        const id = Number(ex.exercise_id)
        if (!repeatedSet.value.has(id)) { repeatedSet.value.add(id); sessionQueue.value = [...sessionQueue.value, ex] }
      }
      sessionResults.value.push({ exercise: ex, questionText: getQuestionText(ex), selectedOption: option, correctOption: getCorrectOption(ex), isCorrect: false, wasSkipped: false })
    }
  }
}

const handleSkip = () => {
  if (isAnswered.value) return
  stopTimer()
  const ex = currentExercise.value
  if (!ex) return
  isAnswered.value = true
  sessionResults.value.push({ exercise: ex, questionText: getQuestionText(ex), selectedOption: null, correctOption: getCorrectOption(ex), isCorrect: false, wasSkipped: true })
}

const goNext = () => {
  if (currentIndex.value + 1 >= sessionQueue.value.length) { phase.value = 'summary'; return }
  currentIndex.value += 1
  resetQuestion()
  startTimer()
}

const restartConfig = () => {
  sessionQueue.value = []
  sessionResults.value = []
  phase.value = 'config'
}

const typeLabel = (ex: Exercise) => (ex.type === 'true-false' ? 'Verdadeiro/Falso' : 'Múltipla Escolha')

const exerciseModuleTitleMap = computed<Map<number, string>>(() => {
  const map = new Map<number, string>()
  for (const [modId, items] of allExercisesByModule.value) {
    const mod = modules.value.find((m) => m.modules_id === modId)
    const title = mod?.module_title || `Módulo ${modId}`
    for (const item of items) {
      const id = Number(item.exercise.exercise_id)
      if (Number.isFinite(id)) map.set(id, title)
    }
  }
  return map
})

const currentModuleTitle = computed(() => {
  const id = currentExercise.value?.exercise_id
  if (id == null) return null
  return exerciseModuleTitleMap.value.get(Number(id)) ?? null
})

onUnmounted(stopTimer)
</script>

<template>
  <section class="study-view">

    <!-- ═══════════ CONFIG ═══════════ -->
    <div v-if="phase === 'config'" class="config-page">

      <header class="page-header">
        <div>
          <h1>Modo Livre</h1>
          <p class="page-header__sub">
            Sessão de estudo personalizada para <strong>{{ book?.title ?? '…' }}</strong>.
            Sem pontos, sem pressão.
          </p>
        </div>
        <button type="button" class="info-btn" @click="showInfoModal = true" aria-label="Como funciona o Modo Livre">
          <InformationCircleIcon class="info-btn__icon" aria-hidden="true" />
        </button>
      </header>

      <p v-if="loadingConfig" class="state-msg">A carregar…</p>
      <p v-else-if="configError" class="state-msg state-msg--error">{{ configError }}</p>

      <div v-else-if="!hasAnyExercises && !loadingExercises" class="empty-card">
        <p class="empty-card__title">Sem exercícios para rever</p>
        <p class="empty-card__sub">Completa alguns exercícios nos módulos para os poderes rever aqui.</p>
        <RouterLink :to="`/book/${bookId}`">
          <UiButton variant="outline" size="sm">Voltar ao livro</UiButton>
        </RouterLink>
      </div>

      <div v-else class="config-layout">

        <!-- ── Left: exercise list ── -->
        <div class="config-main">
          <div class="list-header">
            <div class="list-header__left">
              <span class="list-count">{{ orderedSelectedIds.length }}</span>
              <span class="list-count__label">selecionado{{ orderedSelectedIds.length === 1 ? '' : 's' }}</span>
            </div>
            <div class="list-header__actions">
              <button type="button" class="nb-btn nb-btn--sm" @click="selectAllExercises">Todos</button>
              <button type="button" class="nb-btn nb-btn--sm" @click="clearExercises">Nenhum</button>
            </div>
          </div>

          <div class="list-body">
            <p v-if="loadingExercises" class="state-msg">A carregar exercícios…</p>

            <template v-else-if="visibleModules.length > 0">
              <div v-for="mod in visibleModules" :key="mod.modules_id" class="module-block">
                <div class="module-block__header" @click="toggleModuleExpand(mod.modules_id)">
                  <button
                    type="button"
                    class="module-check"
                    :class="{
                      'module-check--full': isModuleFullySelected(mod.modules_id),
                      'module-check--partial': isModulePartiallySelected(mod.modules_id),
                    }"
                    @click.stop="toggleModuleSelection(mod.modules_id)"
                  >
                    <svg v-if="isModuleFullySelected(mod.modules_id)" class="check-svg" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.8 7L9 1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span v-else-if="isModulePartiallySelected(mod.modules_id)" class="partial-dash" />
                  </button>
                  <span class="module-block__name">{{ mod.module_title || `Módulo ${mod.modules_id}` }}</span>
                  <span class="module-count-badge" :class="{ 'module-count-badge--has-sel': countSelectedInModule(mod.modules_id) > 0 }">
                    <span class="module-count-badge__sel">{{ countSelectedInModule(mod.modules_id) }}</span>
                    <span class="module-count-badge__sep">/</span>
                    <span>{{ countTotalInModule(mod.modules_id) }}</span>
                  </span>
                  <ChevronDownIcon
                    class="expand-icon"
                    :class="{ 'expand-icon--open': isModuleExpanded(mod.modules_id) }"
                    aria-hidden="true"
                  />
                </div>

                <div v-show="isModuleExpanded(mod.modules_id)" class="module-block__list">
                  <label
                    v-for="item in filteredItemsByModule.get(mod.modules_id) ?? []"
                    :key="Number(item.exercise.exercise_id)"
                    class="ex-row"
                    :class="{ 'ex-row--selected': isSelected(Number(item.exercise.exercise_id)) }"
                  >
                    <UiCheckbox
                      :model-value="isSelected(Number(item.exercise.exercise_id))"
                      @update="toggleExercise(Number(item.exercise.exercise_id))"
                    />
                    <span class="ex-row__text">{{ getQuestionText(item.exercise) }}</span>
                  </label>
                </div>
              </div>
            </template>

            <p v-else class="state-msg state-msg--empty">Nenhum exercício com os filtros aplicados.</p>
          </div>
        </div>

        <!-- ── Right: sticky sidebar ── -->
        <aside class="config-sidebar">

          <!-- Filtros -->
          <div class="sidebar-section">
            <h3 class="sidebar-section__title">Filtros</h3>
            <div class="sidebar-field">
              <label class="sidebar-label">Tipo</label>
              <div class="filter-pills">
                <button v-for="opt in [
                  { label: 'Todos', value: 'all' },
                  { label: 'Múltipla escolha', value: 'multiple-choice' },
                  { label: 'Verdadeiro/Falso', value: 'true-false' },
                ]" :key="opt.value" type="button" class="nb-btn nb-btn--pill"
                  :class="{ 'nb-btn--active': typeFilter === opt.value }"
                  @click="typeFilter = opt.value as typeof typeFilter">
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="sidebar-divider" />

          <!-- Ordenação -->
          <div class="sidebar-section">
            <h3 class="sidebar-section__title">Ordenação</h3>
            <div class="order-options">
              <button v-for="opt in [
                { label: 'Aleatória', value: 'random' },
                { label: 'Por módulo', value: 'module' },
                { label: 'Manual', value: 'manual' },
              ]" :key="opt.value" type="button" class="nb-btn nb-btn--order"
                :class="{ 'nb-btn--active': orderMode === opt.value }"
                @click="orderMode = opt.value as typeof orderMode">
                {{ opt.label }}
              </button>
            </div>

            <!-- Open modal when manual mode is active -->
            <button
              v-if="orderMode === 'manual'"
              type="button"
              class="nb-btn nb-btn--order-open"
              @click="showManualModal = true"
            >
              <ListBulletIcon class="nb-btn-icon" aria-hidden="true" />
              Definir ordem
              <span v-if="manualOrderItems.length > 0" class="order-count-badge">{{ manualOrderItems.length }}</span>
            </button>
          </div>

          <div class="sidebar-divider" />

          <!-- Definições -->
          <div class="sidebar-section">
            <h3 class="sidebar-section__title">Definições</h3>
            <div class="sidebar-field">
              <label class="sidebar-label">
                Temporizador
                <span class="sidebar-label__val">{{ timerSeconds === 0 ? 'Desligado' : `${timerSeconds}s` }}</span>
              </label>
              <UiSlider :model-value="timerSeconds" :min="0" :max="60" :step="5" @update="timerSeconds = $event" />
            </div>
            <div class="toggle-row">
              <div class="toggle-row__text">
                <span>Repetir erradas</span>
                <span class="toggle-row__desc">Adiciona ao fim da fila</span>
              </div>
              <UiSwitch :model-value="repeatWrong" size="sm" @update="repeatWrong = $event" />
            </div>
            <div class="toggle-row">
              <div class="toggle-row__text">
                <span>Mostrar resposta</span>
                <span class="toggle-row__desc">Após errar</span>
              </div>
              <UiSwitch :model-value="showCorrectAnswer" size="sm" @update="showCorrectAnswer = $event" />
            </div>
          </div>

          <div class="sidebar-divider" />

          <!-- Sessão anterior -->
          <div class="sidebar-section sidebar-section--prev">
            <div class="prev-session-row">
              <button
                type="button"
                class="nb-btn nb-btn--prev"
                :disabled="!hasSavedSession"
                @click="loadLastSession"
              >
                <ArrowPathIcon class="nb-btn-icon" aria-hidden="true" />
                Copiar última sessão
              </button>
              <button
                type="button"
                class="nb-btn nb-btn--reset"
                @click="resetToDefaults"
              >
                <XMarkIcon class="nb-btn-icon" aria-hidden="true" />
                Redefinir
              </button>
            </div>
          </div>

          <div class="sidebar-divider" />

          <!-- CTA -->
          <div class="sidebar-cta">
            <div class="cta-count">
              <span class="cta-count__num">{{ orderedSelectedIds.length }}</span>
              <span class="cta-count__label">exercício{{ orderedSelectedIds.length === 1 ? '' : 's' }}</span>
            </div>
            <UiButton variant="primary" size="lg" :disabled="!canStart" @click="startSession" class="cta-btn">
              Estudar agora
            </UiButton>
          </div>

        </aside>
      </div>

      <!-- ── Info modal ── -->
      <UiModal :visible="showInfoModal" :close-on-overlay="true" @close="showInfoModal = false">
        <div class="modal-panel info-modal">
          <div class="modal-header">
            <h2 class="modal-title">Como funciona o Modo Livre</h2>
            <p class="modal-sub">Uma sessão de estudo personalizada, sem pontos nem pressão.</p>
          </div>
          <div class="modal-body">
            <ul class="info-list">
              <li class="info-item">
                <span class="info-item__title">Só exercícios que acertaste</span>
                <span class="info-item__desc">Apenas aparecem aqui os exercícios que respondeste corretamente nos módulos do livro.</span>
              </li>
              <li class="info-item">
                <span class="info-item__title">Seleciona o que queres praticar</span>
                <span class="info-item__desc">Escolhe exercícios individualmente ou seleciona módulos inteiros de uma vez. Usa os botões "Todos" e "Nenhum" para selecção rápida.</span>
              </li>
              <li class="info-item">
                <span class="info-item__title">Filtra por tipo</span>
                <span class="info-item__desc">Podes limitar a sessão a exercícios de Escolha Múltipla ou de Verdadeiro/Falso.</span>
              </li>
              <li class="info-item">
                <span class="info-item__title">Define a ordem</span>
                <span class="info-item__desc">Aleatória mistura tudo. Por módulo respeita a estrutura do livro. Manual permite-te arrastar e definir a ordem exata.</span>
              </li>
              <li class="info-item">
                <span class="info-item__title">Temporizador opcional</span>
                <span class="info-item__desc">Podes definir um limite de tempo por pergunta entre 5 e 60 segundos, ou desligar completamente.</span>
              </li>
              <li class="info-item">
                <span class="info-item__title">Repetir erradas</span>
                <span class="info-item__desc">Quando ativo, as perguntas que errares durante a sessão são adicionadas ao fim da fila para praticares mais.</span>
              </li>
            </ul>
          </div>
          <div class="modal-footer">
            <span />
            <div class="modal-footer__actions">
              <UiButton variant="primary" size="sm" @click="showInfoModal = false">Entendido</UiButton>
            </div>
          </div>
        </div>
      </UiModal>

      <!-- ── Manual order modal ── -->
      <UiModal :visible="showManualModal" :close-on-overlay="true" @close="showManualModal = false">
        <div class="modal-panel">
          <div class="modal-header">
            <h2 class="modal-title">Ordem Manual</h2>
            <p class="modal-sub">Arrasta os exercícios para definir a ordem da sessão.</p>
          </div>

          <div class="modal-body">
            <p v-if="manualOrderItems.length === 0" class="drag-empty">
              Seleciona exercícios na lista principal para os poderes reordenar aqui.
            </p>
            <TransitionGroup v-else name="drag-list" tag="div" class="drag-list-wrap">
              <div
                v-for="(item, index) in manualOrderItems"
                :key="Number(item.exercise.exercise_id)"
                class="drag-slot"
              >
                <div
                  v-if="dragFromIndex !== null && dragOverIndex === index && dragFromIndex !== index"
                  class="drop-line"
                  @dragenter.prevent
                  @dragover.prevent
                  @drop.prevent="onDrop($event, index)"
                />
                <div
                  class="drag-item"
                  :class="{ 'drag-item--dragging': dragFromIndex === index }"
                  draggable="true"
                  @dragstart="onDragStart($event, index)"
                  @dragenter="onDragEnter(index)"
                  @dragover.prevent
                  @drop="onDrop($event, index)"
                  @dragend="onDragEnd"
                >
                  <Bars3Icon class="drag-handle" aria-hidden="true" />
                  <span class="drag-item__pos">{{ index + 1 }}</span>
                  <span class="drag-item__text">{{ getQuestionText(item.exercise) }}</span>
                  <button type="button" class="drag-remove" @click.stop="removeFromOrder(Number(item.exercise.exercise_id))" aria-label="Remover">
                    <XMarkIcon class="drag-remove__icon" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </TransitionGroup>
          </div>

          <div class="modal-footer">
            <span class="modal-footer__count">{{ manualOrderItems.length }} exercício{{ manualOrderItems.length === 1 ? '' : 's' }}</span>
            <div class="modal-footer__actions">
              <UiButton variant="outline" size="sm" @click="showManualModal = false">Fechar</UiButton>
              <UiButton variant="primary" size="sm" @click="showManualModal = false">Confirmar ordem</UiButton>
            </div>
          </div>
        </div>
      </UiModal>

    </div>

    <!-- ═══════════ RUNNER ═══════════ -->
    <div v-else-if="phase === 'runner'" class="runner-page">

      <div class="runner-section">
        <div class="runner-top">
          <div class="runner-progress">
            <div class="runner-progress__fill" :style="{ width: `${progress}%` }" />
          </div>
          <div class="runner-stats">
            <UiStatCard label="Certas" :value="countCorrect">
              <template #icon><CheckCircleIcon class="stat-icon stat-icon--ok" /></template>
            </UiStatCard>
            <UiStatCard label="Erradas" :value="countWrong">
              <template #icon><XCircleIcon class="stat-icon stat-icon--err" /></template>
            </UiStatCard>
            <UiStatCard label="Saltadas" :value="countSkipped">
              <template #icon><ForwardIcon class="stat-icon" /></template>
            </UiStatCard>
            <UiStatCard label="Pergunta" :value="currentIndex + 1">
              <template #value>{{ currentIndex + 1 }}<span class="stat-sep"> / {{ initialQueueLength }}</span></template>
            </UiStatCard>
          </div>
        </div>

        <QuestionCard :question-text="currentQuestionText" :time-left="timerSeconds > 0 ? timeLeft : -1" :timer-dash="timerDash">
        <template #label>
          <div class="runner-label">
            <span>Pergunta <span class="q-num">{{ String(currentIndex + 1).padStart(2, '0') }}</span></span>
            <span v-if="currentModuleTitle" class="module-label-tag">{{ currentModuleTitle }}</span>
          </div>
        </template>
        <template #actions>
          <div v-if="attemptsUsed > 0 && !isAnswered" class="attempts-pill">
            {{ attemptsLeft }} tentativa{{ attemptsLeft === 1 ? '' : 's' }} restante{{ attemptsLeft === 1 ? '' : 's' }}
          </div>
        </template>
      </QuestionCard>
      </div>

      <div class="options-grid">
        <ExerciseOption
          v-for="(opt, i) in currentOptions" :key="opt" :value="opt" :index="i"
          :selected="selectedOption === opt"
          :attempted="attemptedOptions.includes(opt)"
          :correct="isAnswered && showCorrectAnswer && currentExercise != null ? isOptionCorrect(currentExercise, opt) : false"
          :wrong="(selectedOption === opt || attemptedOptions.includes(opt)) && currentExercise != null && !isOptionCorrect(currentExercise, opt)"
          :locked="isAnswered || attemptedOptions.includes(opt)"
          @select="handleSelect"
        />
      </div>

      <div class="runner-footer">
        <template v-if="!isAnswered">
          <UiButton variant="outline" @click="handleSkip">
            <ForwardIcon class="action-icon" aria-hidden="true" /> Saltar
          </UiButton>
        </template>
        <template v-else>
          <UiButton variant="primary" @click="goNext">
            {{ currentIndex + 1 < sessionQueue.length ? 'Próxima' : 'Ver resultado' }}
            <template #icon-right><ArrowRightIcon class="action-icon" aria-hidden="true" /></template>
          </UiButton>
        </template>
      </div>
    </div>

    <!-- ═══════════ SUMMARY ═══════════ -->
    <div v-else class="summary-page">

      <div class="summary-hero">
        <div class="summary-score">
          <span class="summary-score__eyebrow">Resultado</span>
          <div class="summary-score__numbers">
            <span class="summary-score__correct">{{ countCorrect }}</span>
            <span class="summary-score__sep">/</span>
            <span class="summary-score__total">{{ sessionResults.length }}</span>
          </div>
          <span class="summary-score__pct">
            {{ sessionResults.length > 0 ? Math.round((countCorrect / sessionResults.length) * 100) : 0 }}% de acerto
          </span>
        </div>
        <div class="summary-hero__meta">
          <h2>Sessão concluída!</h2>
          <p>Sem pontos, sem pressão. Só aprendizagem.</p>
          <div class="summary-chips">
            <div class="chip chip--ok"><span class="chip__val">{{ countCorrect }}</span><span class="chip__lbl">Certas</span></div>
            <div class="chip" :class="countWrong > 0 ? 'chip--err' : 'chip--neutral'"><span class="chip__val">{{ countWrong }}</span><span class="chip__lbl">Erradas</span></div>
            <div class="chip chip--neutral"><span class="chip__val">{{ countSkipped }}</span><span class="chip__lbl">Saltadas</span></div>
          </div>
        </div>
      </div>

      <div class="summary-detail">
        <h3 class="summary-detail__title">Detalhe por exercício</h3>
        <ul class="summary-list">
          <li
            v-for="(result, idx) in sessionResults" :key="idx"
            class="summary-item"
            :class="{
              'summary-item--ok': result.isCorrect,
              'summary-item--err': !result.isCorrect && !result.wasSkipped,
              'summary-item--skip': result.wasSkipped,
            }"
          >
            <div class="summary-item__icon">
              <CheckCircleIcon v-if="result.isCorrect" class="sicon sicon--ok" />
              <XCircleIcon v-else-if="!result.wasSkipped" class="sicon sicon--err" />
              <ForwardIcon v-else class="sicon sicon--skip" />
            </div>
            <div class="summary-item__body">
              <p class="summary-item__q">
                <span class="summary-item__num">#{{ idx + 1 }}</span>
                {{ result.questionText }}
              </p>
              <div v-if="!result.wasSkipped" class="summary-answers">
                <div class="answer-tag" :class="result.isCorrect ? 'answer-tag--ok' : 'answer-tag--err'">
                  <span class="answer-tag__label">{{ result.isCorrect ? 'Certa:' : 'Respondeste:' }}</span>
                  {{ result.selectedOption }}
                </div>
                <div v-if="!result.isCorrect" class="answer-tag answer-tag--ok">
                  <span class="answer-tag__label">Correta:</span>
                  {{ result.correctOption }}
                </div>
              </div>
              <span v-else class="summary-item__skip-label">Pergunta saltada</span>
            </div>
          </li>
        </ul>
      </div>

      <div class="summary-actions">
        <UiButton variant="primary" @click="restartConfig">
          <ArrowPathIcon class="btn-icon" aria-hidden="true" /> Nova sessão
        </UiButton>
        <RouterLink :to="`/book/${bookId}`">
          <UiButton variant="outline">Voltar ao livro</UiButton>
        </RouterLink>
      </div>
    </div>

  </section>
</template>

<style scoped>
.study-view {
  max-width: 1080px;
  margin: 0 auto;
}

.btn-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
  flex-shrink: 0;
}

.state-msg {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-mirage-500);
  padding: var(--space-400) 0;
}
.state-msg--error { color: var(--color-error-strong); }
.state-msg--empty { text-align: center; }

/* ── Page header ───────────────────────────────── */
.config-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-500);
}

.page-header {
  padding: var(--space-400) var(--space-500);
  border-radius: var(--radius-400);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-300);
}

.info-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.info-btn:hover {
  transform: translateY(-2px);
  box-shadow: 2px 4px 0 var(--color-shadow);
  background: var(--color-wild-300);
}

.info-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 var(--color-shadow);
}

.info-btn__icon {
  width: 20px;
  height: 20px;
  stroke-width: 1.8;
  color: var(--color-mirage-600);
}

.page-header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 900;
  color: var(--color-mirage-900);
}

.page-header__sub {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--color-mirage-500);
  line-height: 1.5;
}

.page-header__sub strong {
  color: var(--color-mirage-800);
}

/* ── Empty state ───────────────────────────────── */
.empty-card {
  display: grid;
  gap: var(--space-200);
  justify-items: center;
  text-align: center;
  padding: var(--space-700) var(--space-400);
  border-radius: var(--radius-400);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
}
.empty-card__title { margin: 0; font-size: 18px; font-weight: 800; color: var(--color-mirage-800); }
.empty-card__sub { margin: 0; font-size: 13px; color: var(--color-mirage-500); max-width: 320px; }

/* ── Config layout: 2 columns ──────────────────── */
.config-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: var(--space-400);
  align-items: start;
}

/* ── Left: exercise list ───────────────────────── */
.config-main {
  border-radius: var(--radius-400);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-400) var(--space-500);
  background: var(--color-wild-200);
  border-bottom: 2px solid var(--color-mirage-800);
}

.list-header__left {
  display: flex;
  align-items: baseline;
  gap: var(--space-150);
}

.list-count {
  font-size: 22px;
  font-weight: 900;
  color: var(--color-deep-700);
  line-height: 1;
}

.list-count__label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-500);
}

.list-header__actions {
  display: flex;
  gap: var(--space-150);
}

/* ── Neo-brutalist small buttons ───────────────── */
.nb-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-150);
  border: 2px solid var(--color-mirage-800);
  border-radius: 10px;
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-700);
  cursor: pointer;
  user-select: none;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.nb-btn:hover {
  transform: translateY(-2px);
  box-shadow: 3px 5px 0 var(--color-shadow);
}

.nb-btn:active {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 var(--color-shadow);
}

.nb-btn--sm {
  padding: 5px 12px;
}

/* Pill filter buttons */
.nb-btn--pill {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
}

.nb-btn--active {
  background: var(--color-deep-600);
  color: var(--color-brand-white);
  border-color: var(--color-deep-700);
  box-shadow: 2px 2px 0 var(--color-deep-500);
}

.nb-btn--active:hover {
  transform: translateY(-2px);
  box-shadow: 2px 4px 0 var(--color-deep-500);
}

.nb-btn--active:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 var(--color-deep-500);
}

/* Order selection buttons */
.nb-btn--order {
  padding: 9px 14px;
  width: 100%;
  justify-content: center;
  font-size: 13px;
}

/* Open modal button */
.nb-btn--order-open {
  padding: 9px 14px;
  width: 100%;
  justify-content: flex-start;
  background: var(--color-deep-100);
  border-color: var(--color-deep-600);
  color: var(--color-deep-800);
  box-shadow: 3px 3px 0 var(--color-deep-400);
}

.nb-btn--order-open:hover {
  background: var(--color-deep-200);
  box-shadow: 3px 5px 0 var(--color-deep-400);
}

.nb-btn--order-open:active {
  transform: translate(3px, 3px);
  box-shadow: 0 0 0 var(--color-deep-400);
}

.nb-btn-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  flex-shrink: 0;
}


.order-count-badge {
  margin-left: auto;
  background: var(--color-deep-600);
  color: var(--color-brand-white);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border: 1.5px solid var(--color-mirage-900);
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-150);
}

/* ── Previous session buttons ─────────────────── */
.sidebar-section--prev { padding-top: 0; }

.prev-session-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
}

.nb-btn--prev {
  justify-content: center;
  font-size: 12px;
  padding: 7px 10px;
  background: var(--color-deep-100);
  border-color: var(--color-deep-600);
  color: var(--color-deep-800);
  box-shadow: 2px 2px 0 var(--color-deep-400);
}

.nb-btn--prev:hover:not(:disabled) {
  background: var(--color-deep-200);
}

.nb-btn--prev:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.nb-btn--reset {
  justify-content: center;
  font-size: 12px;
  padding: 7px 10px;
  background: var(--color-wild-200);
  border-color: var(--color-mirage-600);
  color: var(--color-mirage-700);
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.nb-btn--reset:hover {
  background: var(--color-wild-300);
}

.list-body {
  padding: var(--space-400);
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
}

/* ── Module blocks ─────────────────────────────── */
.module-block {
  border-radius: var(--radius-200);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
  overflow: hidden;
}

.module-block__header {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  padding: var(--space-300) var(--space-400);
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}

.module-block__header:hover {
  background: var(--color-wild-200);
}

.module-check {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: 5px;
  border: 2px solid var(--color-mirage-600);
  background: var(--color-wild-100);
  box-shadow: 1px 1px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.1s, border-color 0.1s;
}

.module-check:not(.module-check--full):not(.module-check--partial):hover {
  background: var(--color-wild-300);
}

.module-check--full {
  background: var(--color-deep-600);
  border-color: var(--color-mirage-900);
  color: var(--color-brand-white);
}

.module-check--full:hover {
  background: var(--color-deep-600);
  filter: brightness(1.1);
}

.module-check--partial {
  background: var(--color-deep-100);
  border-color: var(--color-deep-600);
}

.module-check--partial:hover {
  background: var(--color-deep-200);
}

.check-svg { width: 10px; height: 8px; }
.partial-dash { width: 8px; height: 2px; border-radius: 999px; background: var(--color-deep-700); }

.module-block__name {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-800);
  min-width: 0;
}

.module-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 2px 9px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
  font-size: 11px;
  font-weight: 800;
  color: var(--color-mirage-700);
  flex-shrink: 0;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.module-count-badge--has-sel {
  background: var(--color-deep-100);
  border-color: var(--color-deep-600);
}

.module-count-badge__sel { color: var(--color-deep-600); }
.module-count-badge__sep { color: var(--color-mirage-400); font-weight: 600; margin: 0 1px; }

.expand-icon {
  width: 14px;
  height: 14px;
  stroke-width: 2.5;
  color: var(--color-mirage-400);
  flex-shrink: 0;
  transform: rotate(-90deg);
  transition: transform 0.18s ease;
}
.expand-icon--open { transform: rotate(0deg); }

.module-block__list {
  border-top: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  padding: var(--space-150);
  display: grid;
  gap: var(--space-050);
}

/* ── Exercise rows ─────────────────────────────── */
.ex-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-200);
  padding: var(--space-200) var(--space-200);
  border-radius: var(--radius-200);
  border: 2px solid transparent;
  cursor: pointer;
  transition: background 0.1s, border-color 0.1s;
}

.ex-row:hover {
  background: var(--color-wild-100);
}

.ex-row--selected {
  background: var(--color-deep-50, #f0faf9);
  border-color: var(--color-deep-400);
  box-shadow: 1px 1px 0 var(--color-deep-200);
}

.ex-row__text {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-mirage-500);
  line-height: 1.45;
  min-width: 0;
  word-break: break-word;
}

.ex-row--selected .ex-row__text {
  color: var(--color-mirage-900);
  font-weight: 700;
}

.ex-row :deep(.ui-checkbox) {
  margin-top: 1px;
  flex-shrink: 0;
}

/* ── Right sidebar ─────────────────────────────── */
.config-sidebar {
  position: sticky;
  top: var(--space-400);
  border-radius: var(--radius-400);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidebar-section {
  padding: var(--space-400) var(--space-500);
  display: flex;
  flex-direction: column;
  gap: var(--space-300);
}

.sidebar-divider {
  height: 2px;
  background: var(--color-wild-400);
}

.sidebar-section__title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--color-mirage-500);
}

.sidebar-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.sidebar-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-700);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-label__val {
  font-weight: 600;
  color: var(--color-deep-600);
}

/* Order options container */
.order-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drag-empty {
  font-size: 13px;
  color: var(--color-mirage-400);
  font-style: italic;
  margin: 0;
  padding: var(--space-500) var(--space-300);
  text-align: center;
  line-height: 1.5;
}

.drag-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 3px 3px 0 var(--color-shadow);
  cursor: grab;
  user-select: none;
  transition: opacity 0.12s, transform 0.12s, box-shadow 0.12s, border-color 0.12s, background 0.12s;
}

.drag-item:hover {
  transform: translateY(-1px);
  box-shadow: 3px 4px 0 var(--color-shadow);
}

.drag-item:active { cursor: grabbing; }
.drag-item--dragging { opacity: 0.3; transform: scale(0.98); }
.drop-line {
  height: 4px;
  border-radius: 999px;
  background: var(--color-deep-500);
  border: 1.5px solid var(--color-deep-700);
  box-shadow: 0 0 0 3px var(--color-deep-200);
  margin: 2px 0;
  pointer-events: none;
}

.drag-handle {
  width: 18px;
  height: 18px;
  stroke-width: 2;
  color: var(--color-mirage-300);
  flex-shrink: 0;
}

.drag-item__pos {
  font-size: 11px;
  font-weight: 800;
  color: var(--color-brand-white);
  background: var(--color-deep-500);
  border: 1.5px solid var(--color-mirage-900);
  border-radius: var(--radius-100);
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.drag-item__text {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-mirage-800);
  line-height: 1.4;
  min-width: 0;
  white-space: normal;
  word-break: break-word;
}

/* ── Manual order modal ────────────────────────── */
.modal-panel {
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-900);
  border-radius: 20px;
  box-shadow: 8px 8px 0 var(--color-shadow);
  width: min(640px, 100%);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  overflow: hidden;
  animation: modal-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modal-in {
  from { transform: scale(0.93) translateY(12px); opacity: 0; }
  to   { transform: scale(1) translateY(0); opacity: 1; }
}

.modal-header {
  display: grid;
  gap: var(--space-100);
  padding: var(--space-500) var(--space-600) var(--space-400);
  border-bottom: 2px solid var(--color-wild-400);
  background: var(--color-wild-200);
}

.modal-title {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: var(--color-mirage-900);
}

.modal-sub {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-400) var(--space-500);
}

.drag-list-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
  position: relative;
}

.drag-slot {
  display: flex;
  flex-direction: column;
}

.drag-list-move {
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.drag-list-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
  position: absolute;
  width: 100%;
}

.drag-list-leave-to {
  opacity: 0;
  transform: scale(0.95) translateX(12px);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-400);
  padding: var(--space-400) var(--space-600);
  border-top: 2px solid var(--color-wild-400);
  background: var(--color-wild-200);
}

.modal-footer__count {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-500);
}

.modal-footer__actions {
  display: flex;
  gap: var(--space-200);
  align-items: center;
}

.drag-remove {
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: var(--radius-100);
  border: 2px solid var(--color-mirage-500);
  background: var(--color-wild-200);
  box-shadow: 1px 1px 0 var(--color-shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, border-color 0.12s, transform 0.12s, box-shadow 0.12s;
}

.drag-remove:hover {
  background: var(--color-error-muted);
  border-color: var(--color-red-500);
  transform: translateY(-1px);
  box-shadow: 2px 3px 0 var(--color-shadow);
}

.drag-remove:active {
  transform: translate(2px, 2px);
  box-shadow: 0 0 0 var(--color-shadow);
}

.drag-remove__icon {
  width: 11px;
  height: 11px;
  stroke-width: 2.5;
  color: var(--color-mirage-500);
}

.drag-remove:hover .drag-remove__icon { color: var(--color-error-strong); }

/* Toggle rows */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-200);
  padding: var(--space-200) var(--space-300);
  border-radius: var(--radius-200);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
}

.toggle-row__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.toggle-row__text span:first-child {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.toggle-row__desc {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-mirage-400);
}

/* CTA */
.sidebar-cta {
  padding: var(--space-400) var(--space-500);
  background: var(--color-wild-200);
  display: flex;
  flex-direction: column;
  gap: var(--space-200);
}

.cta-count {
  display: flex;
  align-items: baseline;
  gap: var(--space-150);
}

.cta-count__num {
  font-size: 28px;
  font-weight: 900;
  color: var(--color-deep-700);
  line-height: 1;
}

.cta-count__label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-500);
}

.cta-btn {
  width: 100%;
}

/* ── Runner ────────────────────────────────────── */
.runner-page {
  display: grid;
  gap: var(--space-400);
}

.runner-section {
  display: grid;
  gap: var(--space-200);
}

.runner-top {
  display: grid;
  gap: var(--space-400);
}

.runner-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-300);
}

.stat-icon {
  width: 18px;
  height: 18px;
  stroke-width: 1.8;
  color: var(--color-mirage-400);
}
.stat-icon--ok { color: var(--color-deep-600); }
.stat-icon--err { color: var(--color-error-strong); }
.stat-sep { font-size: 13px; color: var(--color-mirage-400); font-weight: 600; }

.runner-progress {
  height: 10px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  overflow: hidden;
}

.runner-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-400));
  border-radius: inherit;
  transition: width 0.4s ease;
}

.q-num { color: var(--color-teal-600); }

.runner-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.module-label-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-mirage-500);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.runner-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-top: var(--space-200);
}

.attempts-pill {
  padding: var(--space-100) var(--space-300);
  border-radius: 999px;
  border: 2px solid var(--color-pumpkin-700, #a34d00);
  background: var(--color-pumpkin-100, #fff0e0);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-pumpkin-700, #a34d00);
}

.action-icon {
  width: 13px;
  height: 13px;
  stroke-width: 2.5;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-400);
}

/* ── Summary ───────────────────────────────────── */
.summary-page {
  display: grid;
  gap: var(--space-500);
}

.summary-hero {
  display: flex;
  align-items: center;
  gap: var(--space-500);
  padding: var(--space-600) var(--space-700);
  border-radius: var(--radius-400);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-deep-100);
  box-shadow: 6px 6px 0 rgba(46, 127, 123, 0.3);
  flex-wrap: wrap;
}

.summary-score {
  display: grid;
  gap: var(--space-100);
  text-align: center;
  flex-shrink: 0;
}

.summary-score__eyebrow {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-mirage-500);
}

.summary-score__numbers {
  display: flex;
  align-items: baseline;
  gap: var(--space-100);
  justify-content: center;
}

.summary-score__correct { font-size: 56px; font-weight: 900; color: var(--color-mirage-900); line-height: 1; }
.summary-score__sep { font-size: 32px; color: var(--color-mirage-400); }
.summary-score__total { font-size: 32px; font-weight: 600; color: var(--color-mirage-500); }

.summary-score__pct {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-deep-700);
}

.summary-hero__meta {
  flex: 1;
  display: grid;
  gap: var(--space-200);
}

.summary-hero__meta h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: var(--color-mirage-900);
}

.summary-hero__meta p {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
}

.summary-chips {
  display: flex;
  gap: var(--space-200);
  flex-wrap: wrap;
}

.chip {
  padding: var(--space-200) var(--space-400);
  border-radius: var(--radius-200);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 56px;
}

.chip--ok { background: var(--color-deep-200); }
.chip--err { background: var(--color-error-muted); border-color: var(--color-red-500); }
.chip--neutral { background: var(--color-wild-200); }

.chip__val { font-size: 20px; font-weight: 900; color: var(--color-mirage-800); line-height: 1; }
.chip--err .chip__val { color: var(--color-error-strong); }
.chip__lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--color-mirage-500); }

.summary-detail {
  border-radius: var(--radius-400);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-100);
  box-shadow: 4px 4px 0 var(--color-shadow);
  padding: var(--space-400);
  display: grid;
  gap: var(--space-300);
}

.summary-detail__title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--color-mirage-700);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.summary-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: var(--space-150);
}

.summary-item {
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: var(--space-200);
  align-items: start;
  padding: var(--space-300) var(--space-400);
  border-radius: var(--radius-200);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.summary-item--ok { background: var(--color-deep-100); }
.summary-item--err { background: var(--color-error-muted); border-color: var(--color-red-400); }
.summary-item--skip { background: var(--color-wild-300); }

.summary-item__icon { padding-top: 1px; }

.sicon { width: 18px; height: 18px; stroke-width: 1.8; }
.sicon--ok { color: var(--color-deep-600); }
.sicon--err { color: var(--color-error-strong); }
.sicon--skip { color: var(--color-mirage-400); }

.summary-item__body { display: grid; gap: var(--space-150); min-width: 0; }

.summary-item__q {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-mirage-800);
  line-height: 1.4;
}

.summary-item__num {
  font-weight: 800;
  color: var(--color-mirage-400);
  margin-right: 4px;
}

.summary-answers { display: grid; gap: var(--space-050); }

.answer-tag {
  display: flex;
  align-items: baseline;
  gap: var(--space-100);
  padding: var(--space-100) var(--space-200);
  border-radius: var(--radius-100);
  font-size: 12px;
  font-weight: 600;
}

.answer-tag--ok { background: var(--color-deep-200); color: var(--color-deep-800); }
.answer-tag--err { background: var(--color-error-muted); color: var(--color-error-strong); }

.answer-tag__label {
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.summary-item__skip-label { font-size: 11px; color: var(--color-mirage-400); font-style: italic; }

.summary-actions {
  display: flex;
  gap: var(--space-300);
  flex-wrap: wrap;
}

/* ── Info modal ────────────────────────────────── */
.info-modal .modal-body {
  padding: var(--space-400) var(--space-500);
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: var(--space-200);
}

.info-item {
  display: grid;
  gap: var(--space-050);
  padding: var(--space-400);
  border-radius: var(--radius-200);
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.info-item__title {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.info-item__desc {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-mirage-500);
  line-height: 1.5;
}

/* ── Responsive ────────────────────────────────── */
@media (max-width: 780px) {
  .config-layout {
    grid-template-columns: 1fr;
  }

  .config-sidebar {
    position: static;
  }

  .runner-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-200);
  }

  .summary-hero {
    flex-direction: column;
    padding: var(--space-400);
  }
}

@media (max-width: 560px) {
  .options-grid {
    grid-template-columns: 1fr;
    gap: var(--space-300);
  }

  .runner-page {
    gap: var(--space-200);
  }

  .runner-section {
    gap: var(--space-100);
  }

  .runner-top {
    gap: var(--space-200);
  }

  .runner-stats {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-150);
  }

  .runner-stats :deep(.stat-card) {
    padding: 7px 8px;
    gap: 5px;
    border-radius: 10px;
    box-shadow: 3px 3px 0 var(--color-shadow);
  }

  .runner-stats :deep(.stat-card__label) {
    font-size: 7px;
    letter-spacing: 0.4px;
  }

  .runner-stats :deep(.stat-card__value) {
    font-size: 13px;
  }
}
</style>
