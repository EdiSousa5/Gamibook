<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications'
import UiChip from '@/components/ui/UiChip.vue'
import UiButton from '@/components/ui/UiButton.vue'
import BookBadge from '@/components/ui/BookBadge.vue'
import BookMockup from '@/components/ui/BookMockup.vue'
import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'
import {
  BookOpenIcon,
  CheckIcon,
  ClockIcon,
  InformationCircleIcon,
  LockClosedIcon,
  SparklesIcon,
  TrophyIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  EyeIcon,
} from '@heroicons/vue/24/outline'
import {
  fetchBook,
  fetchModulesByBook,
} from '../services/books'
import {
  fetchApprovedExerciseCountsByModule,
  fetchUserExercisesByModule,
} from '../services/exercises'
import { fetchUserBook, tierForPct, TIER_ORDER, updateUserBookBadge } from '../services/badges'
import type { BadgeTierOrDefault } from '../services/badges'
import { fetchLatestFinalQuizAttempt, getCooldownUntil } from '../services/finalQuiz'
import { getAssetUrl, getStoredUserId } from '../services/client'
import { useToast } from '@/composables/useToast'
import BookModeModal from '@/components/ui/BookModeModal.vue'
import type { SessionMode } from '@/composables/useModuleSession'
import type { Book, Module, UserBook } from '@/types'

const route = useRoute()
const router = useRouter()
const bookId = computed(() => Number(route.params.id || 1))

const book = ref<Book | null>(null)
const modules = ref<Module[]>([])
const approvedModules = ref<Module[]>([])
const moduleStats = ref<
  Record<number, { total: number; answered: number; correct: number; wrong: number; remaining: number }>
>({})
const userBook = ref<UserBook | null>(null)
const error = ref('')
const isLoading = ref(false)
const badgeInfoOpen = ref(false)
const modeModalOpen = ref(false)
const selectedModuleId = ref<number | null>(null)

const quizCooldownUntil = ref<Date | null>(null)
const quizSectionRef = ref<HTMLElement | null>(null)
const notifStore = useNotificationsStore()
const quizRevealPhase = ref<'idle' | 'reveal' | 'unlocked'>('idle')

const quizCardClass = computed(() => {
  if (quizCompleted.value) return 'quiz-card--done'
  if (quizInCooldown.value) return 'quiz-card--cooldown'
  if (quizRevealPhase.value === 'reveal') return 'quiz-card--reveal'
  if (quizRevealPhase.value === 'unlocked') return 'quiz-card--unlocked'
  return 'quiz-card--locked'
})

const quizInCooldown = computed(
  () => quizCooldownUntil.value !== null && quizCooldownUntil.value.getTime() > Date.now(),
)

const quizCooldownLabel = computed(() => {
  if (!quizCooldownUntil.value) return ''
  const diff = quizCooldownUntil.value.getTime() - Date.now()
  if (diff <= 0) return 'já podes tentar'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return h > 0 ? `em ${h}h ${m}m` : `em ${m}m`
})

const currentBadge = computed<BookBadgeTier | null>(() => {
  const b = userBook.value?.current_badge
  if (!b || b === 'default') return null
  return b as BookBadgeTier
})
const currentTier = computed<BadgeTierOrDefault>(() => {
  const b = userBook.value?.current_badge
  if (b) return b as BadgeTierOrDefault
  return tierForPct(overallPercent.value)
})
const quizCompleted = computed(() => userBook.value?.current_badge === 'galaxy')

const moduleSummary = computed(() => {
  const values = Object.values(moduleStats.value)
  const total = values.reduce((sum, v) => sum + v.total, 0)
  const answered = values.reduce((sum, v) => sum + v.answered, 0)
  const correct = values.reduce((sum, v) => sum + v.correct, 0)
  const wrong = values.reduce((sum, v) => sum + v.wrong, 0)
  return { total, answered, correct, wrong, remaining: Math.max(0, total - answered) }
})

const isMainChapter = (m: Module) => {
  if (m.order_number == null) return true
  const n = Number(m.order_number)
  return Number.isFinite(n) && Number.isInteger(n)
}

const completionPercent = (id: number) => {
  const s = moduleStats.value[id]
  if (!s || s.total === 0) return 0
  return Math.round((s.correct / s.total) * 100)
}

const overallPercent = computed(() => {
  const { total, correct } = moduleSummary.value
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
})

const quizUnlocked = computed(() => overallPercent.value >= 100 && !quizCompleted.value)

const badgeSteps = [
  { id: 'default', label: 'Sem badge', threshold: 0, tier: 'default' },
  { id: 'bronze', label: 'Bronze', threshold: 25, tier: 'bronze' },
  { id: 'silver', label: 'Prata', threshold: 50, tier: 'silver' },
  { id: 'gold', label: 'Ouro', threshold: 75, tier: 'gold' },
  { id: 'diamond', label: 'Diamante', threshold: 100, tier: 'diamond' },
  { id: 'galaxy', label: 'Galaxy', threshold: 100, tier: 'galaxy', extra: true },
] as const

const currentTierRank = computed(() => TIER_ORDER.indexOf(currentTier.value))

const isBadgeAchieved = (tier: BadgeTierOrDefault) =>
  TIER_ORDER.indexOf(tier) <= currentTierRank.value


const nextBadge = computed(() => {
  const pct = overallPercent.value
  if (moduleSummary.value.total === 0) return null
  if (pct < 25) return { tier: 'bronze', label: 'Bronze', threshold: 25 }
  if (pct < 50) return { tier: 'silver', label: 'Prata', threshold: 50 }
  if (pct < 75) return { tier: 'gold', label: 'Ouro', threshold: 75 }
  if (pct < 100) return { tier: 'diamond', label: 'Diamante', threshold: 100 }
  return { tier: 'galaxy', label: 'Galaxy', threshold: 100 }
})

const nextBadgeRemaining = computed(() => {
  const next = nextBadge.value
  if (!next || next.tier === 'galaxy') return 0
  const total = moduleSummary.value.total
  const required = Math.ceil((next.threshold / 100) * total)
  return Math.max(0, required - moduleSummary.value.correct)
})

const moduleStatus = (id: number): 'done' | 'progress' | 'fresh' => {
  const s = moduleStats.value[id]
  if (!s || s.total === 0) return 'fresh'
  if (s.correct >= s.total && s.total > 0) return 'done'
  if (s.answered > 0) return 'progress'
  return 'fresh'
}

const ctaLabel = (id: number) => {
  const status = moduleStatus(id)
  if (status === 'done') return 'Ver'
  if (status === 'progress') return 'Continuar'
  return 'Iniciar'
}

const formatOrder = (n: number | null | undefined) =>
  n == null ? '—' : String(n).padStart(2, '0')

const selectedModuleStats = computed(() =>
  selectedModuleId.value ? moduleStats.value[selectedModuleId.value] ?? null : null,
)


const openModeModal = (moduleId: number) => {
  const status = moduleStatus(moduleId)
  if (status === 'fresh') {
    router.push(`/book/${bookId.value}/module/${moduleId}?mode=normal`)
    return
  }
  selectedModuleId.value = moduleId
  modeModalOpen.value = true
}

const closeModeModal = () => {
  modeModalOpen.value = false
}

const startSelectedModule = (mode: SessionMode) => {
  if (!selectedModuleId.value) return
  const target = `/book/${bookId.value}/module/${selectedModuleId.value}?mode=${mode}`
  modeModalOpen.value = false
  router.push(target)
}

watch(isLoading, async (loading) => {
  if (loading) return
  if (!quizUnlocked.value) {
    quizRevealPhase.value = 'idle'
    return
  }
  const seenKey = `galaxy-unlock-seen-${bookId.value}`
  if (localStorage.getItem(seenKey)) {
    quizRevealPhase.value = 'unlocked'
    return
  }
  const userId = getStoredUserId()
  if (userId) {
    notifStore.add({
      user: userId,
      title: 'Quiz Final desbloqueado!',
      message: 'Completaste 100% dos exercícios. Faz o quiz final para ganhar o badge Galaxy.',
      type: 'quiz_ready',
    })
  }

  await nextTick()
  quizSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  await new Promise(r => setTimeout(r, 850))
  quizRevealPhase.value = 'reveal'
  await new Promise(r => setTimeout(r, 900))
  quizRevealPhase.value = 'unlocked'
  localStorage.setItem(seenKey, '1')
})

watch(
  bookId,
  async (id) => {
    error.value = ''
    isLoading.value = true
    try {
      const userId = getStoredUserId()
      const [bookData, moduleList, userBookData, latestAttempt] = await Promise.all([
        fetchBook(id),
        fetchModulesByBook(id),
        userId ? fetchUserBook(userId, id) : Promise.resolve(null),
        userId ? fetchLatestFinalQuizAttempt(userId, id) : Promise.resolve(null),
      ])
      book.value = bookData
      userBook.value = userBookData
      quizCooldownUntil.value = latestAttempt ? getCooldownUntil(latestAttempt) : null
      approvedModules.value = moduleList
        .filter(isMainChapter)
        .filter((m) => m.status !== 'unapproved')
      modules.value = approvedModules.value

      if (userId && approvedModules.value.length) {
        const entries = await Promise.all(
          approvedModules.value.map(async (m) => {
            const [total, allAttempted, correctItems] = await Promise.all([
              fetchApprovedExerciseCountsByModule(m.modules_id),
              fetchUserExercisesByModule(userId, m.modules_id),
              fetchUserExercisesByModule(userId, m.modules_id, true),
            ])
            const answered = allAttempted.length
            const correct = correctItems.length
            const wrong = Math.max(0, answered - correct)
            return [
              m.modules_id,
              { total, answered, correct, wrong, remaining: Math.max(0, total - answered) },
            ] as const
          }),
        )
        moduleStats.value = Object.fromEntries(entries)

        // Mecanismo de segurança e sincronização de badge
        if (userBookData?.user_book_id) {
          const currentPct = overallPercent.value
          let expectedTier = tierForPct(currentPct)
          const currentBadge = userBookData.current_badge || 'default'

          if (currentBadge === 'galaxy' && currentPct >= 100) expectedTier = 'galaxy'

          if (currentBadge !== expectedTier) {
            const oldRank = TIER_ORDER.indexOf(currentBadge as BadgeTierOrDefault)
            const newRank = TIER_ORDER.indexOf(expectedTier as BadgeTierOrDefault)

            await updateUserBookBadge(userBookData.user_book_id, expectedTier)
            userBook.value!.current_badge = expectedTier

            const toast = useToast()
            if (newRank < oldRank) {
              toast.error(`Atenção: O teu progresso foi recalculado e desceste para o badge ${expectedTier}.`)
            } else if (newRank > oldRank) {
              toast.success(`Progresso sincronizado! Subiste para o badge ${expectedTier}.`)
            }
          }
        }
      } else {
        moduleStats.value = {}
      }
    } catch {
      error.value = 'Não foi possível carregar o livro.'
      book.value = null
      modules.value = []
      approvedModules.value = []
      moduleStats.value = {}
      userBook.value = null
    } finally {
      isLoading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <section class="book-page">

    <!-- HERO -->
    <header class="book-hero">
      <div class="book-hero__info">
        <UiChip label="Biblioteca" variant="outline" />
        <h1 class="book-title">{{ book?.title || 'A carregar...' }}</h1>
        <p class="book-publisher">{{ book?.editora?.nome_editora || 'Sem editora' }}</p>
        <p v-if="book?.description" class="book-desc">{{ book.description }}</p>
      </div>
      <div class="book-hero__cover">
        <BookMockup :cover-url="book?.cover_img ? getAssetUrl(book.cover_img) : null" :title="book?.title ?? 'Livro'"
          size="lg" :badge="currentBadge ?? undefined" />
      </div>
    </header>

    <!-- BADGES -->
    <section v-if="approvedModules.length && !isLoading" class="badge-roadmap">
      <div class="roadmap-header">
        <div class="roadmap-header__text">
          <h2>Badges</h2>
          <p class="roadmap-sub">
            <template v-if="nextBadge && nextBadge.tier !== 'galaxy'">
              Faltam {{ nextBadgeRemaining }} exercicio{{ nextBadgeRemaining === 1 ? '' : 's' }} para o badge {{
                nextBadge.label }}.
            </template>
            <template v-else-if="nextBadge && nextBadge.tier === 'galaxy'">
              <span v-if="quizCompleted">Quiz final concluido. Badge Galaxy conquistado.</span>
              <span v-else-if="quizUnlocked">Quiz final desbloqueado. Faz o quiz para ganhar o badge Galaxy.</span>
              <span v-else>Conclui 100% dos exercicios para desbloquear o quiz final.</span>
            </template>
            <template v-else>
              Sem exercicios para calcular progresso.
            </template>
          </p>
        </div>
        <div class="roadmap-meta">
          <div class="roadmap-meta__numbers">
            <span class="roadmap-pct">{{ overallPercent }}%</span>
            <span class="roadmap-count">{{ moduleSummary.correct }}/{{ moduleSummary.total }} certas</span>
          </div>
          <button type="button" class="roadmap-info" aria-label="Informacoes sobre os badges"
            @click="badgeInfoOpen = true">
            <InformationCircleIcon class="info-icon" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="roadmap-bar-outer">
        <div class="roadmap-milestones">
          <div v-for="step in badgeSteps.filter(s => s.tier !== 'galaxy')" :key="step.id" class="roadmap-milestone"
            :class="{ achieved: isBadgeAchieved(step.tier) }" :style="{
              left: step.threshold === 0 ? '0%' : step.threshold === 100 ? '100%' : `${step.threshold}%`,
              transform: step.threshold === 0 ? 'translateX(0)' : step.threshold === 100 ? 'translateX(-100%)' : 'translateX(-50%)',
            }">
            <div class="roadmap-milestone__badge">
              <div v-if="step.tier === 'default'" class="badge-default" aria-hidden="true">—</div>
              <BookBadge v-else :tier="step.tier as BookBadgeTier" :size="isBadgeAchieved(step.tier) ? 'sm' : 'xs'" />
            </div>
            <span class="roadmap-milestone__label">{{ step.label }}</span>
            <span class="roadmap-milestone__pct">{{ step.threshold === 0 ? 'Inicio' : `${step.threshold}%` }}</span>
          </div>
        </div>

        <div class="roadmap-track-wrap">
          <div class="roadmap-track">
            <div class="roadmap-track__fill" :style="{ width: `${Math.min(overallPercent, 100)}%` }" />
          </div>
          <div class="roadmap-track__marker" :style="{ left: `${Math.min(overallPercent, 100)}%` }" />
        </div>
      </div>

      <div class="galaxy-unlock" :class="{
        'galaxy-unlock--done': quizCompleted,
        'galaxy-unlock--ready': quizUnlocked,
      }">
        <div class="galaxy-unlock__badge">
          <BookBadge tier="galaxy" :size="isBadgeAchieved('galaxy') ? 'sm' : 'xs'" />
        </div>
        <div class="galaxy-unlock__body">
          <span class="galaxy-unlock__name">Galaxy</span>
          <span class="galaxy-unlock__desc">
            <template v-if="quizCompleted">Conquistado! Badge maximo atingido.</template>
            <template v-else-if="quizUnlocked">Faz o quiz final para conquistar este badge.</template>
            <template v-else>Completa 100% dos exercicios para desbloquear o quiz final.</template>
          </span>
        </div>
        <div class="galaxy-unlock__state">
          <CheckIcon v-if="quizCompleted" class="galaxy-state-icon galaxy-state-icon--done" />
          <SparklesIcon v-else-if="quizUnlocked" class="galaxy-state-icon galaxy-state-icon--ready" />
          <LockClosedIcon v-else class="galaxy-state-icon" />
        </div>
      </div>
    </section>

    <!-- MODULES -->
    <section class="modules-section">
      <div class="modules-header">
        <h2>Módulos</h2>
        <span v-if="approvedModules.length && !isLoading" class="modules-pill">
          {{ approvedModules.length }}
        </span>
      </div>

      <p v-if="isLoading" class="state-msg">A carregar módulos...</p>
      <p v-else-if="error" class="state-msg error">{{ error }}</p>

      <div v-else-if="approvedModules.length" class="module-list">
        <article v-for="moduleItem in approvedModules" :key="moduleItem.modules_id" class="module-card"
          :class="`module-card--${moduleStatus(moduleItem.modules_id)}`">
          <!-- Order badge -->
          <div class="order-badge" :class="`order-badge--${moduleStatus(moduleItem.modules_id)}`" aria-hidden="true">
            <CheckIcon v-if="moduleStatus(moduleItem.modules_id) === 'done'" class="badge-check" />
            <span v-else class="badge-num">{{ formatOrder(moduleItem.order_number) }}</span>
          </div>

          <!-- Content -->
          <div class="module-body">
            <div class="module-body__title-row">
              <h3 class="module-title">{{ moduleItem.module_title || 'Sem título' }}</h3>
              <UiChip v-if="moduleStatus(moduleItem.modules_id) === 'done'" label="Completo" variant="filled" />
              <UiChip v-else-if="moduleStatus(moduleItem.modules_id) === 'progress'" label="Em progresso"
                variant="soft" />
            </div>
            <div class="module-progress">
              <div class="prog-track">
                <div class="prog-fill" :style="{ width: `${completionPercent(moduleItem.modules_id)}%` }" />
              </div>
              <span class="prog-label">
                {{ moduleStats[moduleItem.modules_id]?.correct ?? 0 }}&thinsp;/&thinsp;{{
                  moduleStats[moduleItem.modules_id]?.total ?? 0 }} exercícios
                <span class="prog-pct">&nbsp;·&nbsp;{{ completionPercent(moduleItem.modules_id) }}%</span>
              </span>
            </div>

            <div v-if="moduleStatus(moduleItem.modules_id) !== 'done'" class="module-stats">
              <div class="module-stat">
                <span>Total</span>
                <strong>{{ moduleStats[moduleItem.modules_id]?.total ?? 0 }}</strong>
              </div>
              <div class="module-stat">
                <span>Certas</span>
                <strong>{{ moduleStats[moduleItem.modules_id]?.correct ?? 0 }}</strong>
              </div>
              <div class="module-stat">
                <span>Erradas</span>
                <strong>{{ moduleStats[moduleItem.modules_id]?.wrong ?? 0 }}</strong>
              </div>
              <div class="module-stat">
                <span>Por fazer</span>
                <strong>{{ moduleStats[moduleItem.modules_id]?.remaining ?? 0 }}</strong>
              </div>
            </div>
          </div>

          <!-- Action -->
          <div v-if="moduleStatus(moduleItem.modules_id) !== 'done'" class="module-action">
            <UiButton variant="primary" size="sm" @click="openModeModal(moduleItem.modules_id)">
              {{ ctaLabel(moduleItem.modules_id) }}
            </UiButton>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon-wrap">
          <BookOpenIcon class="empty-icon" aria-hidden="true" />
        </div>
        <h3>Sem módulos disponíveis</h3>
        <p>Este livro ainda não tem módulos aprovados.</p>
      </div>
    </section>

    <BookModeModal
      :visible="modeModalOpen"
      :stats="selectedModuleStats"
      @close="closeModeModal"
      @start="startSelectedModule"
    />

    <Teleport to="body">
      <Transition name="overlay-fade">
        <div v-if="badgeInfoOpen" class="badge-modal-overlay" role="dialog" aria-modal="true"
          aria-label="Informacoes sobre badges" @click.self="badgeInfoOpen = false">
          <div class="badge-modal">
            <header class="badge-modal__header">
              <div>
                <p class="badge-modal__eyebrow">Progresso do livro</p>
                <h3>Badges e objetivos</h3>
              </div>
            </header>
            <p class="badge-modal__lead">
              Os badges representam a percentagem de exercicios respondidos corretamente. O Diamante so
              aparece quando chegares aos 100%. O Galaxy exige 100% + quiz final.
            </p>
            <div class="badge-modal__list">
              <div class="badge-modal__item">
                <div class="badge-modal__badge badge-default">—</div>
                <div class="badge-modal__text">
                  <strong>Sem badge</strong>
                  <span>0% ou nenhum exercicio concluido.</span>
                </div>
              </div>
              <div class="badge-modal__item">
                <div class="badge-modal__badge">
                  <BookBadge tier="bronze" size="xs" />
                </div>
                <div class="badge-modal__text">
                  <strong>Bronze</strong>
                  <span>25% de exercicios certos.</span>
                </div>
              </div>
              <div class="badge-modal__item">
                <div class="badge-modal__badge">
                  <BookBadge tier="silver" size="xs" />
                </div>
                <div class="badge-modal__text">
                  <strong>Prata</strong>
                  <span>50% de exercicios certos.</span>
                </div>
              </div>
              <div class="badge-modal__item">
                <div class="badge-modal__badge">
                  <BookBadge tier="gold" size="xs" />
                </div>
                <div class="badge-modal__text">
                  <strong>Ouro</strong>
                  <span>75% de exercicios certos.</span>
                </div>
              </div>
              <div class="badge-modal__item">
                <div class="badge-modal__badge">
                  <BookBadge tier="diamond" size="xs" />
                </div>
                <div class="badge-modal__text">
                  <strong>Diamante</strong>
                  <span>100% de exercicios certos.</span>
                </div>
              </div>
              <div class="badge-modal__item">
                <div class="badge-modal__badge">
                  <BookBadge tier="galaxy" size="xs" />
                </div>
                <div class="badge-modal__text">
                  <strong>Galaxy</strong>
                  <span>100% + quiz final com 75% de sucesso.</span>
                </div>
              </div>
            </div>
            <div class="badge-modal__footer">
              <UiButton variant="primary" @click="badgeInfoOpen = false">Fechar</UiButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODO LIVRE -->
    <section v-if="approvedModules.length && !isLoading" class="free-section">
      <div class="modules-header">
        <h2>Modo Livre</h2>
      </div>

      <article class="free-card">
        <div class="free-card__icon" aria-hidden="true">
          <AdjustmentsHorizontalIcon class="free-icon" />
        </div>

        <div class="free-card__body">
          <h3 class="free-card__title">Pratica ao teu ritmo</h3>
          <p class="free-card__desc">
            Escolhe módulos, filtra exercícios por tipo, define um timer, baralhamento e muito mais.
            Sem pontos, sem penalizações.
          </p>
          <div class="free-card__tags">
            <span class="free-tag">
              <AdjustmentsHorizontalIcon class="free-tag__icon" aria-hidden="true" />
              Configurável
            </span>
            <span class="free-tag">
              <ClockIcon class="free-tag__icon" aria-hidden="true" />
              Timer opcional
            </span>
            <span class="free-tag">
              <ArrowPathIcon class="free-tag__icon" aria-hidden="true" />
              Repetir erradas
            </span>
            <span class="free-tag">
              <EyeIcon class="free-tag__icon" aria-hidden="true" />
              Ver respostas
            </span>
          </div>
        </div>

        <div class="free-card__action">
          <RouterLink :to="`/book/${bookId}/study`">
            <UiButton variant="primary" size="sm">Iniciar</UiButton>
          </RouterLink>
        </div>
      </article>
    </section>

    <!-- FINAL QUIZ -->
    <section v-if="userBook && !isLoading" ref="quizSectionRef" class="quiz-section">
      <div class="modules-header">
        <h2>Quiz Final</h2>
      </div>

      <article class="quiz-card" :class="quizCardClass">
        <div class="quiz-card__icon">
          <template v-if="quizRevealPhase === 'reveal' || quizRevealPhase === 'unlocked' || quizInCooldown">
            <span class="qi-nebula" aria-hidden="true" />
            <span class="qi-star" style="--sx: 20%; --sy: 25%; --sd: 0s"   aria-hidden="true" />
            <span class="qi-star" style="--sx: 65%; --sy: 18%; --sd: 1.3s" aria-hidden="true" />
            <span class="qi-star" style="--sx: 75%; --sy: 65%; --sd: 0.7s" aria-hidden="true" />
            <span class="qi-star" style="--sx: 28%; --sy: 72%; --sd: 2s"   aria-hidden="true" />
            <span class="qi-star" style="--sx: 52%; --sy: 14%; --sd: 0.4s" aria-hidden="true" />
          </template>
          <Transition name="icon-swap" mode="out-in">
            <TrophyIcon v-if="quizCompleted" key="trophy" class="quiz-icon" aria-hidden="true" />
            <ClockIcon v-else-if="quizInCooldown" key="clock" class="quiz-icon" aria-hidden="true" />
            <SparklesIcon v-else-if="quizRevealPhase === 'reveal' || quizRevealPhase === 'unlocked'" key="sparkles" class="quiz-icon" aria-hidden="true" />
            <LockClosedIcon v-else key="lock" class="quiz-icon" aria-hidden="true" />
          </Transition>
        </div>

        <div class="quiz-card__body">
          <div class="quiz-card__title-row">
            <h3 class="quiz-card__title">
              {{ quizCompleted ? 'Quiz Completo' : quizInCooldown ? 'Quiz em Pausa' : quizUnlocked ? 'Quiz Disponível' :
              'Quiz Bloqueado' }}
            </h3>
            <BookBadge v-if="quizCompleted" tier="galaxy" size="xs" />
            <UiChip v-else-if="quizInCooldown" label="Em espera" variant="outline" />
            <UiChip v-else-if="quizUnlocked" label="Desbloqueado" variant="filled" />
            <UiChip v-else label="Bloqueado" variant="outline" />
          </div>
          <p class="quiz-card__desc">
            <template v-if="quizCompleted">
              Conquistaste o badge Galaxy. O quiz foi concluído com sucesso.
            </template>
            <template v-else-if="quizInCooldown">
              Falhaste o quiz. Podes tentar novamente {{ quizCooldownLabel }}.
            </template>
            <template v-else-if="quizUnlocked">
              Completa 10 perguntas aleatórias de todos os módulos. Precisas de 8 em 10 respostas certas para ganhar o
              badge Galaxy.
            </template>
            <template v-else>
              Conclui 100% dos exercícios do livro para desbloquear o quiz final e ganhar o badge Galaxy.
            </template>
          </p>
        </div>

        <div v-if="quizUnlocked && !quizInCooldown" class="quiz-card__action">
          <RouterLink :to="`/book/${bookId}/final-quiz`">
            <UiButton variant="primary" size="sm">Iniciar Quiz</UiButton>
          </RouterLink>
        </div>
      </article>
    </section>

  </section>
</template>

<style scoped>
.book-page {
  display: grid;
  gap: var(--space-500);
}

/* ── HERO ───────────────────────────────────────── */
.book-hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-500);
  align-items: center;
  padding: var(--space-500);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 20px;
  box-shadow: 6px 6px 0 var(--color-shadow);
}

.book-hero__info {
  display: grid;
  gap: var(--space-200);
  align-content: start;
}

.book-title {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  color: var(--color-mirage-800);
  line-height: 1.15;
}

.book-publisher {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
}

.book-desc {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-600);
  line-height: 1.6;
  max-width: 500px;
}

.book-hero__cover {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
}

/* ── BADGE ROADMAP ──────────────────────────────── */
.badge-roadmap {
  display: grid;
  gap: var(--space-300);
  padding: var(--space-400);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 20px;
  box-shadow: 6px 6px 0 var(--color-shadow);
}

.roadmap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-300);
  flex-wrap: wrap;
}

.roadmap-header__text {
  display: grid;
  gap: var(--space-100);
}

.roadmap-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.roadmap-sub {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-600);
  max-width: 520px;
}

.roadmap-meta {
  display: flex;
  align-items: center;
  gap: var(--space-200);
}

.roadmap-meta__numbers {
  display: grid;
  justify-items: end;
  text-align: right;
}

.roadmap-pct {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-deep-700);
}

.roadmap-count {
  font-size: 12px;
  color: var(--color-mirage-500);
  font-weight: 600;
}

.roadmap-info {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 3px 3px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.roadmap-info:hover {
  transform: translateY(-1px);
}

.info-icon {
  width: 20px;
  height: 20px;
  color: var(--color-mirage-700);
}

.roadmap-bar-outer {
  display: grid;
  gap: 10px;
}

.roadmap-milestones {
  position: relative;
  height: 80px;
}

.roadmap-milestone {
  position: absolute;
  top: 0;
  display: grid;
  justify-items: center;
  gap: 3px;
  opacity: 0.5;
}

.roadmap-milestone.achieved {
  opacity: 1;
}

.roadmap-milestone__badge {
  height: 42px;
  display: grid;
  place-items: center;
}

.badge-default {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px dashed var(--color-mirage-500);
  color: var(--color-mirage-600);
  display: grid;
  place-items: center;
  font-weight: 700;
}

.roadmap-milestone.achieved .badge-default {
  width: 34px;
  height: 34px;
}

.roadmap-milestone__label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-mirage-700);
  white-space: nowrap;
}

.roadmap-milestone__pct {
  font-size: 10px;
  color: var(--color-mirage-500);
  white-space: nowrap;
}

.roadmap-track-wrap {
  position: relative;
}

.roadmap-track {
  height: 12px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-300);
  box-shadow: 2px 2px 0 var(--color-shadow);
  overflow: hidden;
}

.roadmap-track__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-400));
  transition: width 0.8s ease;
}

.roadmap-track__marker {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 3px var(--color-deep-500);
  z-index: 1;
}

.galaxy-unlock {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 3px 3px 0 var(--color-shadow);
  opacity: 0.55;
}

.galaxy-unlock--ready {
  opacity: 1;
  background: var(--color-deep-100);
}

.galaxy-unlock--done {
  opacity: 1;
  background: var(--color-deep-200, #b8e8e4);
}

.galaxy-unlock__badge {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
}

.galaxy-unlock__body {
  flex: 1;
  display: grid;
  gap: 2px;
}

.galaxy-unlock__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.galaxy-unlock__desc {
  font-size: 12px;
  color: var(--color-mirage-600);
}

.galaxy-unlock__state {
  flex-shrink: 0;
}

.galaxy-state-icon {
  width: 20px;
  height: 20px;
  color: var(--color-mirage-400);
}

.galaxy-state-icon--done {
  color: var(--color-deep-600);
}

.galaxy-state-icon--ready {
  color: var(--color-deep-500);
}

/* ── MODULES SECTION ────────────────────────────── */
.modules-section {
  display: grid;
  gap: var(--space-400);
}

.modules-header {
  display: flex;
  align-items: center;
  gap: var(--space-200);
}

.modules-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}

.modules-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--color-wild-200);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 2px 2px 0 var(--color-shadow);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-mirage-600);
}

/* ── MODULE LIST ────────────────────────────────── */
.module-list {
  display: grid;
  gap: var(--space-300);
}

.module-card {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: var(--space-400);
  align-items: center;
  padding: var(--space-400);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 18px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.module-card:hover {
  transform: translateY(-3px);
  box-shadow: 6px 8px 0 var(--color-shadow);
}

.module-card--done {
  background: var(--color-deep-100);
  grid-template-columns: 80px 1fr;
}

/* Order badge */
.order-badge {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  place-items: center;
}

.order-badge--fresh {
  background: var(--color-deep-600);
}

.order-badge--progress {
  background: var(--color-deep-600);
}

.order-badge--done {
  background: var(--color-deep-500);
}

.badge-num {
  font-size: 28px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.badge-check {
  width: 36px;
  height: 36px;
  color: #fff;
  stroke-width: 2.5;
}

/* Module body */
.module-body {
  display: grid;
  gap: var(--space-200);
  min-width: 0;
}

.module-body__title-row {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  flex-wrap: wrap;
}

.module-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

/* Progress inside card */
.module-progress {
  display: grid;
  gap: 6px;
}

.module-stats {
  margin-top: var(--space-200);
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-200);
}

.module-stat {
  padding: 8px 10px;
  border-radius: 10px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
  display: grid;
  gap: 2px;
  text-align: center;
}

.module-stat span {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-mirage-500);
  font-weight: 700;
}

.module-stat strong {
  font-size: 16px;
  color: var(--color-mirage-800);
}

.prog-track {
  height: 10px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
  overflow: hidden;
}

.prog-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-deep-700), var(--color-deep-500));
  transition: width 0.6s ease;
}

.prog-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-mirage-500);
}

.prog-pct {
  color: var(--color-deep-600);
  font-weight: 700;
}

/* Action column */
.module-action {
  display: grid;
  place-items: center;
}

/* Empty state */
.empty-state {
  display: grid;
  place-items: center;
  gap: var(--space-300);
  padding: var(--space-600) var(--space-400);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 16px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  text-align: center;
}

.empty-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-wild-200);
  border: 2px solid var(--color-mirage-800);
  box-shadow: 3px 3px 0 var(--color-shadow);
  display: grid;
  place-items: center;
}

.empty-icon {
  width: 28px;
  height: 28px;
  color: var(--color-mirage-500);
}

.empty-state h3 {
  margin: 0;
  font-size: 18px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-500);
}

.state-msg {
  font-weight: 600;
  color: var(--color-mirage-600);
}

.state-msg.error {
  color: var(--color-pumpkin-700);
}

/* ── QUIZ SECTION ───────────────────────────────── */
.quiz-section {
  display: grid;
  gap: var(--space-400);
}

.quiz-card {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: var(--space-400);
  align-items: center;
  padding: var(--space-400);
  border: 2px solid var(--color-mirage-800);
  border-radius: 18px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  background: var(--color-wild-100);
}

.quiz-card--locked {
  opacity: 0.65;
}

.quiz-card--done {
  background: var(--color-deep-100);
}

.quiz-card--cooldown {
  background: var(--color-wild-100);
}

/* ── Reveal: one-time entrance ── */
.quiz-card--reveal {
  animation: quiz-reveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* ── Icon box ── */
.quiz-card__icon {
  position: relative;
  overflow: hidden;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  background: var(--color-mirage-800);
}

.quiz-card--done .quiz-card__icon {
  background: var(--color-deep-500);
}

.quiz-card--reveal .quiz-card__icon,
.quiz-card--unlocked .quiz-card__icon {
  background: #0d0020;
  box-shadow: 4px 4px 0 #0a001a;
}

.quiz-card--cooldown .quiz-card__icon {
  background: #0d0020;
  box-shadow: 4px 4px 0 #0a001a;
  opacity: 0.55;
}

/* ── Galaxy nebula (same as badge) ── */
.qi-nebula {
  position: absolute;
  inset: -50%;
  border-radius: 50%;
  z-index: 1;
  background: conic-gradient(
    from 0deg,
    transparent              0deg,
    rgba(139, 92,  246, 0.60)  55deg,
    transparent             115deg,
    rgba(192, 132, 252, 0.35) 175deg,
    transparent             235deg,
    rgba(109,  40, 217, 0.55) 305deg,
    transparent             360deg
  );
  animation: galaxy-spin 9s linear infinite;
}

.qi-star {
  position: absolute;
  left: var(--sx);
  top:  var(--sy);
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #fff;
  z-index: 2;
  animation: star-twinkle 2.6s ease-in-out infinite;
  animation-delay: var(--sd);
}

.quiz-card--reveal .quiz-icon,
.quiz-card--unlocked .quiz-icon,
.quiz-card--cooldown .quiz-icon {
  position: relative;
  z-index: 3;
  color: #ddb4fe;
}

@keyframes quiz-reveal {
  0%   { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes galaxy-spin {
  to { transform: rotate(360deg); }
}

@keyframes star-twinkle {
  0%, 100% { opacity: 0.85; transform: scale(1);   }
  50%       { opacity: 0.10; transform: scale(0.3); }
}

.quiz-icon {
  width: 36px;
  height: 36px;
  color: #fff;
}

/* ── Icon swap transition ── */
.icon-swap-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.icon-swap-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.icon-swap-enter-from { opacity: 0; transform: scale(0.65) rotate(-20deg); }
.icon-swap-leave-to  { opacity: 0; transform: scale(1.3) rotate(15deg); }

.quiz-card__body {
  display: grid;
  gap: var(--space-200);
  min-width: 0;
}

.quiz-card__title-row {
  display: flex;
  align-items: center;
  gap: var(--space-200);
  flex-wrap: wrap;
}

.quiz-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-mirage-800);
}

.quiz-card__desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
  line-height: 1.5;
}

.quiz-card__action {
  display: grid;
  place-items: center;
}

/* ── BADGE MODAL ────────────────────────────────── */
.badge-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(20, 26, 33, 0.55);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: clamp(16px, 4vw, 32px);
}

.badge-modal {
  width: min(620px, 100%);
  background: var(--color-wild-100);
  border: 2px solid var(--color-mirage-800);
  border-radius: 20px;
  box-shadow: 6px 6px 0 var(--color-shadow);
  padding: 28px;
  display: grid;
  gap: var(--space-300);
}

.badge-modal__header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-200);
  align-items: flex-start;
}

.badge-modal__eyebrow {
  margin: 0 0 4px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--color-deep-600);
  font-weight: 800;
}

.badge-modal__header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.badge-modal__close {
  flex-shrink: 0;
}

.badge-modal__lead {
  margin: 0;
  font-size: 14px;
  color: var(--color-mirage-600);
  line-height: 1.6;
}

.badge-modal__list {
  display: grid;
  gap: var(--space-200);
}

.badge-modal__item {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: var(--space-200);
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  border: 2px solid var(--color-mirage-800);
  background: var(--color-wild-200);
  box-shadow: 2px 2px 0 var(--color-shadow);
}

.badge-modal__badge {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
}

.badge-modal__badge .badge-default {
  width: 32px;
  height: 32px;
}

.badge-modal__close .close-icon {
  width: 16px;
  height: 16px;
}

.badge-modal__text {
  display: grid;
  gap: 2px;
}

.badge-modal__text strong {
  font-size: 14px;
  color: var(--color-mirage-800);
}

.badge-modal__text span {
  font-size: 12px;
  color: var(--color-mirage-600);
}

.badge-modal__footer {
  display: flex;
  justify-content: flex-end;
}

/* ── MODO LIVRE SECTION ─────────────────────────── */
.free-section {
  display: grid;
  gap: var(--space-400);
}

.free-card {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: var(--space-400);
  align-items: center;
  padding: var(--space-400);
  border: 2px solid var(--color-mirage-800);
  border-radius: 18px;
  box-shadow: 4px 4px 0 var(--color-shadow);
  background: var(--color-wild-100);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.free-card:hover {
  transform: translateY(-2px);
  box-shadow: 6px 7px 0 var(--color-shadow);
}

.free-card__icon {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 14px;
  border: 2px solid var(--color-mirage-800);
  box-shadow: 4px 4px 0 var(--color-shadow);
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--color-deep-200), var(--color-deep-100));
}

.free-icon {
  width: 38px;
  height: 38px;
  color: var(--color-deep-700);
  stroke-width: 1.5;
}

.free-card__body {
  display: grid;
  gap: var(--space-200);
  min-width: 0;
}

.free-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-mirage-800);
}

.free-card__desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-mirage-500);
  line-height: 1.5;
  max-width: 520px;
}

.free-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.free-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 2px solid var(--color-mirage-300);
  background: var(--color-wild-200);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-mirage-600);
}

.free-tag__icon {
  width: 11px;
  height: 11px;
  stroke-width: 2;
  flex-shrink: 0;
}

.free-card__action {
  display: grid;
  place-items: center;
}

/* ── RESPONSIVE ─────────────────────────────────── */
@media (max-width: 900px) {
  .book-hero {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .book-hero__cover {
    display: none;
  }

  .destaque-wrapper {
    padding: 0 var(--space-300);
  }

  .roadmap-milestones {
    height: 90px;
  }

  .free-card,
  .quiz-card {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .free-card__action,
  .quiz-card__action {
    width: 100%;
  }

  .free-card__action :deep(.ui-button),
  .quiz-card__action :deep(.ui-button) {
    width: 100%;
  }

  .free-card__tags {
    justify-content: center;
  }

  .badge-modal {
    padding: 22px;
  }
}

@media (max-width: 640px) {
  .book-page {
    gap: var(--space-400);
  }

  .book-hero,
  .badge-roadmap,
  .modules-section,
  .free-section,
  .quiz-section {
    gap: var(--space-300);
  }

  .roadmap-header,
  .modules-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .module-card {
    grid-template-columns: 64px 1fr;
    grid-template-rows: auto auto;
  }

  .order-badge {
    width: 64px;
    height: 64px;
  }

  .badge-num {
    font-size: 22px;
  }

  .module-action {
    grid-column: 1 / -1;
    place-items: start;
  }

  .roadmap-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .roadmap-meta {
    width: 100%;
    justify-content: space-between;
  }

  .roadmap-milestones {
    height: 84px;
  }

  .module-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .badge-modal {
    padding: 18px;
  }

  .badge-modal__list {
    gap: var(--space-150);
  }
}
</style>
