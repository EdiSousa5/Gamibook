import type { DailyExercise, Exercise, ExerciseExample, UserDailyExercise, UserExercise } from '@/types'
import { authFetch } from './client'

export const fetchExercisesByModule = async (moduleId: number) => {
  const params = new URLSearchParams({
    fields: 'exercise_id,type,id_module,content,date_created',
    sort: '-date_created',
  })
  params.set('filter[id_module][_eq]', String(moduleId))

  const response = await authFetch(`/items/exercises?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch exercises failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as Exercise[]
}

export const fetchUserExerciseCountsByModule = async (
  userId: string,
  moduleId: number,
  onlyCorrect = false,
) => {
  const params = new URLSearchParams({
    fields: 'id_user_exercises',
    limit: '-1',
  })
  params.set('filter[user_id][_eq]', String(userId))
  params.set('filter[module_id][_eq]', String(moduleId))
  if (onlyCorrect) {
    params.set('filter[is_correct][_eq]', 'true')
  }

  const response = await authFetch(`/items/user_exercises?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch user exercises failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as UserExercise[]
  return items.length
}

export const fetchUserExercisesByModule = async (userId: string, moduleId: number) => {
  const params = new URLSearchParams({
    fields: 'id_user_exercises,exercise_id,is_correct,attempts,points_earned,time_spent',
    limit: '-1',
  })
  params.set('filter[user_id][_eq]', String(userId))
  params.set('filter[module_id][_eq]', String(moduleId))

  const response = await authFetch(`/items/user_exercises?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch user exercises failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as UserExercise[]
}

export const createUserExercise = async (payload: Partial<UserExercise>) => {
  const response = await authFetch('/items/user_exercises', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Create user exercise failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as UserExercise
}

export const updateUserExercise = async (recordId: number, payload: Partial<UserExercise>) => {
  const response = await authFetch(`/items/user_exercises/${recordId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Update user exercise failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as UserExercise
}

export const fetchExerciseExamplesByModule = async (moduleId: number, limit = 12) => {
  const params = new URLSearchParams({
    fields: 'type,content',
    sort: '-date_created',
    limit: String(limit),
  })
  params.set('filter[id_module][_eq]', String(moduleId))

  const response = await authFetch(`/items/exercises?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch examples failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as ExerciseExample[]
}

export const fetchApprovedExerciseCountsByModule = async (moduleId: number) => {
  const params = new URLSearchParams({
    fields: 'exercise_id',
    limit: '-1',
  })
  params.set('filter[id_module][_eq]', String(moduleId))

  const response = await authFetch(`/items/exercises?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch exercises failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as Array<{ exercise_id?: number }>
  return items.length
}

export const createExercise = async (payload: Partial<Exercise>) => {
  const response = await authFetch('/items/exercises', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Create exercise failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as Exercise
}

export const fetchApprovedExercisesByModule = async (moduleId: number) => {
  const params = new URLSearchParams({
    fields: 'exercise_id,type,id_module,content,date_created',
    sort: '-date_created',
  })
  params.set('filter[id_module][_eq]', String(moduleId))

  const response = await authFetch(`/items/exercises?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch exercises failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as Exercise[]
}

export const fetchDailyExercisesByBook = async (bookId: number) => {
  const params = new URLSearchParams({
    fields: 'daily_exercise_id,type,book_id,content,date_created',
    sort: '-date_created',
  })
  params.set('filter[book_id][_eq]', String(bookId))

  const response = await authFetch(`/items/daily_exercise?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch daily exercises failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as DailyExercise[]

  return items.map((exercise: any) => ({
    ...exercise,
    exercise_id: exercise.daily_exercise_id,
  })) as DailyExercise[]
}

export const createDailyExercise = async (payload: Partial<DailyExercise>) => {
  const response = await authFetch('/items/daily_exercise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Create daily exercise failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as DailyExercise
}

export const deleteDailyExercise = async (exerciseId: number) => {
  const response = await authFetch(`/items/daily_exercise/${exerciseId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Delete daily exercise failed: ${response.status} ${text}`.trim())
  }
}

export const deleteExercise = async (exerciseId: number) => {
  const response = await authFetch(`/items/exercises/${exerciseId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Delete exercise failed: ${response.status} ${text}`.trim())
  }
}

export const fetchLatestUserDailyExercise = async (userId: string) => {
  const params = new URLSearchParams({
    fields: 'id_user_daily_exercise,user_id,daily_exercise_id.daily_exercise_id,daily_exercise_id.content,daily_exercise_id.type,date_created',
    sort: '-date_created',
    limit: '1',
  })
  params.set('filter[user_id][_eq]', userId)

  const response = await authFetch(`/items/user_daily_exercise?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch user daily exercise failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as UserDailyExercise[]
  return items[0] ?? null
}

export const createUserDailyExercise = async (payload: Partial<UserDailyExercise>) => {
  const response = await authFetch('/items/user_daily_exercise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Create user daily exercise failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as UserDailyExercise
}

export const fetchAnsweredDailyExerciseIds = async (userId: string): Promise<number[]> => {
  const params = new URLSearchParams({
    fields: 'daily_exercise_id',
    limit: '-1',
  })
  params.set('filter[user_id][_eq]', userId)

  const response = await authFetch(`/items/user_daily_exercise?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch answered daily exercises failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as Array<{ daily_exercise_id: number | null }>
  return items.map((item) => item.daily_exercise_id).filter((id): id is number => id !== null)
}

export const fetchDailyExercisesForBooks = async (bookIds: number[]) => {
  if (!bookIds.length) return [] as DailyExercise[]

  const params = new URLSearchParams({
    fields: 'daily_exercise_id,type,book_id,content,date_created',
    limit: '-1',
  })
  params.set('filter[book_id][_in]', bookIds.join(','))

  const response = await authFetch(`/items/daily_exercise?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch daily exercises for books failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as DailyExercise[]
}
