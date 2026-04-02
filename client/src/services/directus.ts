import { createDirectus, createItem, readItem, readItems, rest, updateItem } from '@directus/sdk'

export type Book = {
  book_id: number
  title?: string
  cover_img?: string | null
  description?: string | null
  ISBN?: string | null
  publish_date?: string | null
  publisher?: string
  date_created?: string | null
  date_updated?: string | null
}

export type User = {
  id?: string
  first_name?: string
  last_name?: string
  name?: string
  email?: string
  avatar?: string | null
  avatar_img?: string | null
  points?: number
  level?: number
  password?: string
  date_created?: string | null
}

export type Module = {
  modules_id: number
  id_book?: number | null
  order_number?: number | null
  module_title?: string | null
  minimum_exercises?: number | null
  additional_description?: string | null
}

export type Exercise = {
  exercise_id?: number
  id_module?: number | null
  status?: 'draft' | 'approved' | 'unapproved'
  type?: 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'
  difficulty?: 'easy' | 'medium' | 'hard'
  content?: Record<string, any>
  points?: number | null
  date_created?: string | null
}

export type ApprovedExerciseCounts = {
  easy: number
  medium: number
  hard: number
}

const directusUrl = import.meta.env.VITE_DIRECTUS_URL ?? ''
const normalizedDirectusUrl = directusUrl.replace(/\/$/, '')
const ACCESS_TOKEN_KEY = 'gb_access_token'
const USER_ID_KEY = 'gb_user_id'
const USER_FIELDS = ['id', 'first_name', 'last_name', 'email', 'avatar', 'points', 'level']

if (!directusUrl) {
  console.warn('VITE_DIRECTUS_URL is not set. Directus requests will fail.')
}

export const directus = createDirectus(normalizedDirectusUrl).with(rest())

export const getStoredUserId = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_ID_KEY)
}

export const setStoredUserId = (id: string | null) => {
  if (typeof window === 'undefined') return
  if (id) {
    localStorage.setItem(USER_ID_KEY, id)
  } else {
    localStorage.removeItem(USER_ID_KEY)
  }
}

export const clearAccessToken = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export const getAssetUrl = (assetId?: string | null) => {
  if (!assetId) return ''
  if (!normalizedDirectusUrl) return ''
  return `${normalizedDirectusUrl}/assets/${assetId}`
}

const getAccessToken = () => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

const setAccessToken = (token: string | null) => {
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  }
}

const authFetch = async (path: string, options: RequestInit = {}) => {
  if (!normalizedDirectusUrl) {
    throw new Error('VITE_DIRECTUS_URL is not set. Directus requests will fail.')
  }

  const token = getAccessToken()
  if (!token) {
    throw new Error('Missing access token. Please login first.')
  }

  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)

  return fetch(`${normalizedDirectusUrl}${path}`, {
    ...options,
    headers,
  })
}

export const fetchBooks = () =>
  directus.request(
    readItems('books' as any, {
      sort: ['-date_created'],
    }),
  ) as Promise<Book[]>

export const fetchBook = (id: number | string) =>
  directus.request(readItem('books' as any, id)) as Promise<Book>

export const fetchModulesByBook = (bookId: number) =>
  directus.request(
    readItems('modules' as any, {
      filter: {
        id_book: { _eq: bookId },
      },
      sort: ['order_number'],
    }),
  ) as Promise<Module[]>

export const fetchModules = () =>
  directus.request(
    readItems('modules' as any, {
      sort: ['id_book', 'order_number'],
    }),
  ) as Promise<Module[]>

export const fetchModule = (moduleId: number | string) =>
  directus.request(readItem('modules' as any, moduleId)) as Promise<Module>

export const fetchExercisesByModule = async (moduleId: number) => {
  const params = new URLSearchParams({
    fields: 'exercise_id,type,id_module,content,difficulty,points,status,date_created',
    sort: '-date_created',
  })
  params.set('filter[id_module][_eq]', String(moduleId))
  params.set('filter[status][_eq]', 'approved')

  const response = await authFetch(`/items/exercises?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch exercises failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as Exercise[]
}

export const fetchUsers = (limit?: number) => fetchUsersWithAuth(limit)

export const fetchUserById = (id: number | string) => fetchUserByIdWithAuth(id)

export const findUserByCredentials = (email: string, password: string) =>
  directus.request(
    readItems('directus_users' as any, {
      filter: {
        email: { _eq: email },
        password: { _eq: password },
      },
      limit: 1,
    }),
  ) as Promise<User[]>

export const loginUser = async (email: string, password: string) => {
  if (!normalizedDirectusUrl) {
    throw new Error('VITE_DIRECTUS_URL is not set. Cannot login user.')
  }

  const response = await fetch(`${normalizedDirectusUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Login failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  const accessToken = data?.data?.access_token
  setAccessToken(accessToken || null)

  const user = await fetchCurrentUser()
  if (user?.id) {
    setStoredUserId(String(user.id))
  }
  return user
}

export const registerUser = (payload: Partial<User>) => registerDirectusUser(payload)

export const updateUser = async (id: number | string, payload: Partial<User>) => {
  const token = getAccessToken()
  if (!token) {
    return directus.request(updateItem('directus_users' as any, id, payload)) as Promise<User>
  }

  const response = await authFetch(`/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Update failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as User
}

export const fetchApprovedExerciseCountsByModule = async (moduleId: number) => {
  const params = new URLSearchParams({
    fields: 'difficulty',
    limit: '-1',
  })
  params.set('filter[id_module][_eq]', String(moduleId))
  params.set('filter[status][_eq]', 'approved')

  const response = await authFetch(`/items/exercises?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch exercises failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  const items = (data?.data ?? []) as Array<{ difficulty?: string }>
  return items.reduce<ApprovedExerciseCounts>(
    (acc, item) => {
      if (item.difficulty === 'easy') acc.easy += 1
      if (item.difficulty === 'medium') acc.medium += 1
      if (item.difficulty === 'hard') acc.hard += 1
      return acc
    },
    { easy: 0, medium: 0, hard: 0 },
  )
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
    fields: 'exercise_id,type,id_module,content,difficulty,points,status,date_created',
    sort: '-date_created',
  })
  params.set('filter[id_module][_eq]', String(moduleId))
  params.set('filter[status][_eq]', 'approved')

  const response = await authFetch(`/items/exercises?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch exercises failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as Exercise[]
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

const registerDirectusUser = async (payload: Partial<User>) => {
  if (!normalizedDirectusUrl) {
    throw new Error('VITE_DIRECTUS_URL is not set. Cannot register user.')
  }

  const registerPayload = buildRegisterPayload(payload)

  const response = await fetch(`${normalizedDirectusUrl}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerPayload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Register failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as User
}

const fetchCurrentUser = async () => {
  const params = new URLSearchParams({ fields: USER_FIELDS.join(',') })
  const response = await authFetch(`/users/me?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch user failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as User
}

const fetchUserByIdWithAuth = async (id: number | string) => {
  const token = getAccessToken()
  if (!token) {
    return directus.request(readItem('directus_users' as any, id)) as Promise<User>
  }

  const params = new URLSearchParams({ fields: USER_FIELDS.join(',') })
  const response = await authFetch(`/users/${id}?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch user failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as User
}

const fetchUsersWithAuth = async (limit?: number) => {
  const token = getAccessToken()
  if (!token) {
    return directus.request(
      readItems('directus_users' as any, {
        sort: ['-points'],
        limit,
      }),
    ) as Promise<User[]>
  }

  const params = new URLSearchParams({
    fields: USER_FIELDS.join(','),
  })
  if (limit) {
    params.set('limit', String(limit))
  }
  params.set('sort', '-points')

  const response = await authFetch(`/users?${params.toString()}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch users failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as User[]
}

export const uploadUserAvatar = async (userId: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await authFetch('/files', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Upload failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  const fileId = data?.data?.id
  if (!fileId) {
    throw new Error('Upload failed: missing file id.')
  }

  await updateUser(userId, { avatar: fileId })
  return fileId as string
}

const buildRegisterPayload = (payload: Partial<User>) => {
  const name = (payload.name || '').trim()
  const [first_name, ...rest] = name.split(' ').filter(Boolean)
  const last_name = rest.join(' ') || undefined

  return {
    email: payload.email,
    password: payload.password,
    first_name: payload.first_name || first_name || undefined,
    last_name: payload.last_name || last_name || undefined,
  }
}

export const getUserDisplayName = (user?: User | null) => {
  if (!user) return 'Utilizador'
  if (user.name) return user.name
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  if (fullName) return fullName
  return user.email || 'Utilizador'
}

export const getUserAvatarId = (user?: User | null) => user?.avatar ?? user?.avatar_img ?? null
