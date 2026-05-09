import type { FinalQuizAttempt, FinalQuizAttemptContent } from '@/types'
import { authFetch } from './client'

export const fetchFinalQuizAttempts = async (
  userId: string,
  bookId: number,
): Promise<FinalQuizAttempt[]> => {
  const params = new URLSearchParams({
    fields: 'final_quiz_attempts_id,date_created,score,status,content',
    sort: '-date_created',
    limit: '-1',
  })
  params.set('filter[user_id][_eq]', userId)
  params.set('filter[book_id][_eq]', String(bookId))

  const response = await authFetch(`/items/final_quiz_attempts?${params.toString()}`)
  if (!response.ok) return []

  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as FinalQuizAttempt[]
}

export const fetchLatestFinalQuizAttempt = async (
  userId: string,
  bookId: number,
): Promise<FinalQuizAttempt | null> => {
  const params = new URLSearchParams({
    fields: 'final_quiz_attempts_id,date_created,score,status',
    sort: '-date_created',
    limit: '1',
  })
  params.set('filter[user_id][_eq]', userId)
  params.set('filter[book_id][_eq]', String(bookId))

  const response = await authFetch(`/items/final_quiz_attempts?${params.toString()}`)
  if (!response.ok) return null

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as FinalQuizAttempt[]
  return items[0] ?? null
}

export const createFinalQuizAttempt = async (payload: {
  user_id: string
  book_id: number
  score: number
  status: 'pass' | 'fail'
  content: FinalQuizAttemptContent
}): Promise<FinalQuizAttempt> => {
  const response = await authFetch('/items/final_quiz_attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Create final quiz attempt failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as FinalQuizAttempt
}

export const COOLDOWN_MS = 24 * 60 * 60 * 1000

export const getCooldownUntil = (attempt: FinalQuizAttempt): Date | null => {
  if (attempt.status !== 'fail' || !attempt.date_created) return null
  const attemptTime = new Date(attempt.date_created).getTime()
  if (isNaN(attemptTime)) return null
  const untilMs = attemptTime + COOLDOWN_MS
  return untilMs > Date.now() ? new Date(untilMs) : null
}
