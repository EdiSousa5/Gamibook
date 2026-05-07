import type { BookBadgeTier } from '@/components/ui/BookBadge.vue'
import type { Exercise, UserBook } from '@/types'
import { fetchModulesByBook } from './books'
import {
  fetchApprovedExerciseCountsByModule,
  fetchUserExerciseCountsByModule,
  fetchExercisesByModule,
} from './exercises'
import { authFetch } from './client'
import { shuffleArray } from '@/utils/exerciseUtils'

export type BadgeTierOrDefault = BookBadgeTier | 'default'

export const TIER_ORDER: BadgeTierOrDefault[] = [
  'default',
  'bronze',
  'silver',
  'gold',
  'diamond',
  'galaxy',
]

const isMainChapter = (m: { order_number?: number | null }) => {
  if (m.order_number == null) return true
  const n = Number(m.order_number)
  return Number.isFinite(n) && Number.isInteger(n)
}

export const fetchUserBook = async (userId: string, bookId: number): Promise<UserBook | null> => {
  const params = new URLSearchParams({
    fields: 'user_book_id,user_id,book_id,current_badge,final_quiz_unlocked',
    limit: '1',
  })
  params.set('filter[user_id][_eq]', userId)
  params.set('filter[book_id][_eq]', String(bookId))

  const response = await authFetch(`/items/user_books?${params.toString()}`)
  if (!response.ok) return null

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as UserBook[]
  return items[0] ?? null
}

export const tierForPct = (pct: number): BadgeTierOrDefault => {
  if (pct >= 100) return 'diamond'
  if (pct >= 75) return 'gold'
  if (pct >= 50) return 'silver'
  if (pct >= 25) return 'bronze'
  return 'default'
}

export const updateUserBookBadge = async (
  userBookId: number,
  badge: BadgeTierOrDefault,
  unlockQuiz = false,
): Promise<UserBook> => {
  const body: Record<string, unknown> = { current_badge: badge }
  if (unlockQuiz) body.final_quiz_unlocked = true

  const response = await authFetch(`/items/user_books/${userBookId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Update user book failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as UserBook
}

export const checkAndUpdateBadge = async (
  userId: string,
  bookId: number,
): Promise<BadgeTierOrDefault> => {
  try {
    const userBook = await fetchUserBook(userId, bookId)
    if (!userBook?.user_book_id) return 'default'

    const currentTier = (userBook.current_badge ?? 'default') as BadgeTierOrDefault
    if (currentTier === 'galaxy') return 'galaxy'

    const modules = await fetchModulesByBook(bookId)
    const approvedModules = modules.filter((m) => m.status !== 'unapproved' && isMainChapter(m))
    if (!approvedModules.length) return currentTier

    const stats = await Promise.all(
      approvedModules.map(async (m) => ({
        total: await fetchApprovedExerciseCountsByModule(m.modules_id),
        done: await fetchUserExerciseCountsByModule(userId, m.modules_id, true),
      })),
    )

    const totalExercises = stats.reduce((s, v) => s + v.total, 0)
    const doneExercises = stats.reduce((s, v) => s + v.done, 0)
    if (totalExercises === 0) return currentTier

    const pct = (doneExercises / totalExercises) * 100
    const newTier = tierForPct(pct)

    const currentRank = TIER_ORDER.indexOf(currentTier)
    const newRank = TIER_ORDER.indexOf(newTier)

    // No advancement — return current stored tier
    if (newRank <= currentRank) return currentTier

    const unlockQuiz = pct >= 100
    await updateUserBookBadge(userBook.user_book_id, newTier, unlockQuiz)
    return newTier
  } catch (err) {
    console.error('[Badge] checkAndUpdateBadge failed', err)
    return 'default'
  }
}

export const fetchExercisesForBook = async (bookId: number): Promise<Map<number, Exercise[]>> => {
  const modules = await fetchModulesByBook(bookId)
  const approvedModules = modules.filter((m) => m.status !== 'unapproved' && isMainChapter(m))

  const pairs = await Promise.all(
    approvedModules.map(async (m) => {
      const exercises = await fetchExercisesByModule(m.modules_id)
      const filtered = exercises.filter((e) => e.type !== 'fill-blanks' && e.type !== 'ordering')
      return [m.modules_id, filtered] as const
    }),
  )

  return new Map(pairs.filter(([, exs]) => exs.length > 0))
}

export const selectFinalQuizQuestions = (
  exercisesByModule: Map<number, Exercise[]>,
  count = 10,
): Exercise[] => {
  if (!exercisesByModule.size) return []

  const selected: Exercise[] = []
  const usedIds = new Set<number>()

  for (const exercises of exercisesByModule.values()) {
    if (!exercises.length) continue
    const ex = exercises[Math.floor(Math.random() * exercises.length)]
    if (!ex) continue
    selected.push(ex)
    if (ex.exercise_id != null) usedIds.add(ex.exercise_id)
  }

  const remaining: Exercise[] = []
  for (const exercises of exercisesByModule.values()) {
    for (const ex of exercises) {
      if (ex.exercise_id != null && !usedIds.has(ex.exercise_id)) {
        remaining.push(ex)
      }
    }
  }

  const shuffled = shuffleArray(remaining)
  for (const ex of shuffled) {
    if (selected.length >= count) break
    selected.push(ex)
  }

  return shuffleArray(selected)
}
