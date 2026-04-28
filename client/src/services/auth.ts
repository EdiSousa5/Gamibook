import type { User } from '@/types'
import {
  authFetch,
  normalizedDirectusUrl,
  setAccessToken,
  setStoredUserId,
} from './client'

const USER_FIELDS = [
  'id',
  'first_name',
  'last_name',
  'email',
  'avatar',
  'points',
  'level',
  'role',
  'role.id',
  'role.name',
  'exercises_daily_streak',
]

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
  const params = new URLSearchParams({ fields: USER_FIELDS.join(','), sort: '-points' })
  if (limit) params.set('limit', String(limit))

  const response = await authFetch(`/users?${params.toString()}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch users failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as User[]
}

export const fetchUsers = (limit?: number) => fetchUsersWithAuth(limit)

export const fetchUserById = (id: number | string) => fetchUserByIdWithAuth(id)

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

export const getUserDisplayName = (user?: User | null) => {
  if (!user) return 'Utilizador'
  if (user.name) return user.name
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  if (fullName) return fullName
  return user.email || 'Utilizador'
}

export const getUserAvatarId = (user?: User | null) => user?.avatar ?? user?.avatar_img ?? null

const ADMIN_ROLES = ['admin', 'admin absoluto', 'editora', 'autor']

export const isAdminUser = (user?: User | null) => {
  const role = user?.role
  const roleName =
    typeof role === 'string' ? role : typeof role === 'object' && role ? role.name : null
  if (!roleName) return false
  return ADMIN_ROLES.includes(roleName.trim().toLowerCase())
}
