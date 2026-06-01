import type {
  Exercise,
  ExerciseExample,
  UserDailyExercise,
  UserExercise,
} from '@/types'
import { authFetch } from './client'

export const fetchAllUsersPoints = async (startDate?: string): Promise<Map<string, number>> => {
  const params = new URLSearchParams({ limit: '-1' })
  params.set('aggregate[sum]', 'points')
  params.set('groupBy[]', 'user_id')
  if (startDate) params.set('filter[date_created][_gte]', startDate)

  const response = await authFetch(`/items/user_points_history?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch all users points failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as Array<{
    sum: { points?: string | number | null }
    user_id?: string | null
  }>

  const map = new Map<string, number>()
  for (const item of items) {
    if (!item.user_id) continue
    map.set(item.user_id, Number(item.sum?.points ?? 0))
  }
  return map
}


export const fetchUserPointsFromHistory = async (userId: string, startDate?: string) => {
  const params = new URLSearchParams({
    fields: 'points',
    limit: '-1',
  })
  params.set('filter[user_id][_eq]', String(userId))
  if (startDate) params.set('filter[date_created][_gte]', startDate)

  const response = await authFetch(`/items/user_points_history?${params.toString()}`)

  if (!response.ok) {
    if (response.status === 403) {
      return 0
    }
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch user points history failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as Array<{ points?: number | null }>
  return items.reduce((sum, item) => sum + Number(item.points ?? 0), 0)
}

export const createUserPointsHistory = async (payload: {
  user_id: string
  points: number
  source: 'exercise' | 'daily'
  reference_id: number
}) => {
  const response = await authFetch('/items/user_points_history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Create user points history failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return data?.data ?? data
}

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

export const fetchUserExercisesByModule = async (
  userId: string,
  moduleId: number,
  onlyCorrect = false,
) => {
  const params = new URLSearchParams({
    fields: 'id_user_exercises,exercise_id,is_correct,attempts,time_spent',
    limit: '-1',
  })
  params.set('filter[user_id][_eq]', String(userId))
  params.set('filter[module_id][_eq]', String(moduleId))
  if (onlyCorrect) params.set('filter[is_correct][_eq]', 'true')

  const response = await authFetch(`/items/user_exercises?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch user exercises failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as UserExercise[]
}

export const fetchUserExerciseCountsByModule = async (
  userId: string,
  moduleId: number,
  onlyCorrect = false,
) => {
  const items = await fetchUserExercisesByModule(userId, moduleId, onlyCorrect)
  return items.length
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
    fields: 'id_user_daily_exercise,user_id,is_correct,exercise_id.exercise_id,exercise_id.content,exercise_id.type,date_created',
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

export const fetchUsedDailyExerciseIds = async (userId: string): Promise<number[]> => {
  const params = new URLSearchParams({
    fields: 'exercise_id',
    limit: '-1',
  })
  params.set('filter[user_id][_eq]', userId)

  const response = await authFetch(`/items/user_daily_exercise?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch used daily exercise IDs failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as Array<{ exercise_id?: number | null }>
  return items.map((item) => item.exercise_id).filter((id): id is number => id != null)
}

export const fetchUserAttemptedExerciseIds = async (
  userId: string,
  moduleIds: number[],
): Promise<number[]> => {
  if (!moduleIds.length) return []

  const params = new URLSearchParams({
    fields: 'exercise_id',
    limit: '-1',
  })
  params.set('filter[user_id][_eq]', userId)
  params.set('filter[module_id][_in]', moduleIds.join(','))

  const response = await authFetch(`/items/user_exercises?${params.toString()}`)

  if (!response.ok) return []

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as Array<{ exercise_id?: number | null }>
  const ids = items.map((i) => i.exercise_id).filter((id): id is number => id != null)
  return [...new Set(ids)]
}

export const fetchExercisesByIds = async (ids: number[]): Promise<Exercise[]> => {
  if (!ids.length) return []

  const params = new URLSearchParams({
    fields: 'exercise_id,type,id_module,content',
    limit: '-1',
  })
  params.set('filter[exercise_id][_in]', ids.join(','))

  const response = await authFetch(`/items/exercises?${params.toString()}`)

  if (!response.ok) return []

  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as Exercise[]
}

export const fetchLatestUserExercise = async (userId: string) => {
  const params = new URLSearchParams({
    fields: 'module_id,date',
    sort: '-date',
    limit: '1',
  })
  params.set('filter[user_id][_eq]', userId)

  const response = await authFetch(`/items/user_exercises?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch latest user exercise failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as UserExercise[]
  return items[0] ?? null
}
