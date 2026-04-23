import { createDirectus, createItem, readItem, readItems, rest, updateItem } from '@directus/sdk'

export type Book = {
  book_id: number
  title?: string
  cover_img?: string | null
  description?: string | null
  ISBN?: string | null
  publish_date?: string | null
  publisher?: string
  editora_id?: number | null
  editora?: { id?: number; nome_editora?: string } | null
  is_approved?: boolean | null
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
  role?: { id?: string; name?: string } | string | null
  password?: string
  date_created?: string | null
}

export type Module = {
  modules_id: number
  id_book?: number | null
  order_number?: number | null
  module_title?: string | null
  minimum_exercises?: boolean | number | null
  additional_description?: string | null
  status?: 'draft' | 'approved' | 'unapproved'
}

export type Exercise = {
  exercise_id?: number
  id_module?: number | null
  status?: 'draft' | 'approved' | 'unapproved'
  type?: 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'
  content?: Record<string, any>
  points?: number | null
  date_created?: string | null
}

export type ExerciseExample = Pick<Exercise, 'type' | 'status' | 'content'> & {
  question_text?: string
}

export type UserExercise = {
  id_user_exercises?: number
  user_id?: string | User
  exercise_id?: number | Exercise
  module_id?: number | Module
  is_correct?: boolean | null
  attempts?: number | null
  points_earned?: number | null
  time_spent?: number | null
  date?: string | null
  date_updated?: string | null
}

export type UserBook = {
  id?: number
  user_id?: string | User
  book_id?: Book
}

const directusUrl = import.meta.env.VITE_DIRECTUS_URL ?? ''
const normalizedDirectusUrl = directusUrl.replace(/\/$/, '')
const ACCESS_TOKEN_KEY = 'gb_access_token'
const USER_ID_KEY = 'gb_user_id'
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
]

const BOOK_FIELDS = [
  'book_id',
  'title',
  'cover_img',
  'description',
  'ISBN',
  'publish_date',
  'publisher',
  'editora_id.*',
  'is_approved',
  'date_created',
  'date_updated',
]

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

const attachEditorasToBooks = async (books: Book[]) => {
  if (!books || books.length === 0) return books;

  // Se o Directus já expandiu a relação (editora_id é um objeto), normalizamos para a propriedade 'editora'
  books.forEach(book => {
    if (typeof book.editora_id === 'object' && book.editora_id !== null) {
      book.editora = book.editora_id;
    }
  });

  // Verifica se há livros que tenham a editora_id como número (relação não expandida)
  const needsFetching = books.some(b => typeof b.editora_id === 'number');
  if (!needsFetching) return books;

  try {
    let editoras: any[] = [];
    try {
      const response = await authFetch('/items/editoras');
      const data = await response.json().catch(() => null);
      editoras = data?.data || [];
    } catch {
      editoras = await directus.request(readItems('editoras' as any)) as any[];
    }

    books.forEach(book => {
      if (typeof book.editora_id === 'number') {
        const ed = editoras.find((e: any) => e.id === book.editora_id || e.editora_id === book.editora_id);
        if (ed) {
          book.editora = ed;
        }
      }
    });
  } catch (err) {
    console.error('Erro ao carregar editoras:', err);
  }
  return books;
}

export const fetchBooks = async () => {
  const books = await directus.request(
    readItems('books' as any, {
      fields: BOOK_FIELDS,
      sort: ['-date_created'],
    }),
  ) as Book[];
  return attachEditorasToBooks(books);
}

export const fetchApprovedBooks = async () => {
  const books = await directus.request(
    readItems('books' as any, {
      filter: { is_approved: { _eq: true } },
      fields: BOOK_FIELDS,
      sort: ['-date_created'],
    }),
  ) as Book[];
  return attachEditorasToBooks(books);
}

export const fetchBook = async (id: number | string) => {
  const book = await directus.request(readItem('books' as any, id, { fields: BOOK_FIELDS })) as Book;
  await attachEditorasToBooks([book]);
  return book;
}

export const fetchModulesByBook = (bookId: number) =>
  directus.request(
    readItems('modules' as any, {
      filter: {
        id_book: { _eq: bookId },
      },
      sort: ['order_number'],
    }),
  ) as Promise<Module[]>

export const fetchApprovedModulesByBook = (bookId: number) =>
  directus.request(
    readItems('modules' as any, {
      filter: {
        id_book: { _eq: bookId },
        minimum_exercises: { _eq: true },
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
    fields: 'exercise_id,type,id_module,content,status,date_created',
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
    fields: 'type,status,content',
    sort: '-date_created',
    limit: String(limit),
  })
  params.set('filter[id_module][_eq]', String(moduleId))
  params.set('filter[status][_in]', 'approved,unapproved')

  const response = await authFetch(`/items/exercises?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch examples failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as ExerciseExample[]
}

export const fetchUserBooks = async (userId: string) => {
  const params = new URLSearchParams({
    fields:
      'user_book_id,book_id.*,book_id.editora_id.*',
    sort: '-user_book_id',
  })
  params.set('filter[user_id][_eq]', userId)

  const response = await authFetch(`/items/user_books?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch user books failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  const userBooks = (data?.data ?? []) as UserBook[]

  const booksToAttach = userBooks.map(ub => ub.book_id).filter(b => !!b) as Book[]
  await attachEditorasToBooks(booksToAttach)

  return userBooks
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
    fields: 'exercise_id',
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
    fields: 'exercise_id,type,id_module,content,status,date_created',
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

export const updateModuleApproval = async (moduleId: number, isApproved: boolean) => {
  const response = await authFetch(`/items/modules/${moduleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minimum_exercises: isApproved }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Update module failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as Module
}

export const updateBookApproval = async (bookId: number, isApproved: boolean) => {
  const response = await authFetch(`/items/books/${bookId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_approved: isApproved }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Update book failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as Book
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

export const isAdminUser = (user?: User | null) => {
  const role = user?.role
  const roleName =
    typeof role === 'string' ? role : typeof role === 'object' && role ? role.name : null
  if (!roleName) return false
  const normalized = roleName.trim().toLowerCase()
  return normalized === 'admin' || normalized === 'admin absoluto'
}

export const roundToNearest5 = (value: number) => 5 * Math.round(value / 5)

export const getNextLevelXp = (previousLevelXp: number) => roundToNearest5(previousLevelXp * 1.05)

export const getLevelProgressFromPoints = (points: number) => {
  const safePoints = Number.isFinite(points) ? Math.max(0, points) : 0
  let level = 1
  let currentLevelMin = 0
  let nextLevelXp = 100

  while (safePoints >= currentLevelMin + nextLevelXp) {
    currentLevelMin += nextLevelXp
    level += 1
    nextLevelXp = getNextLevelXp(nextLevelXp)
  }

  return {
    level,
    currentLevelMin,
    nextLevelXp,
    progress: safePoints - currentLevelMin,
  }
}