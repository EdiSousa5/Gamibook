import type { Book, Module, UserBook } from '@/types'
import { authFetch, publicFetch } from './client'

export type BookUserStats = {
  totalUsers: number
  badgeCounts: Record<string, number>
}

const BOOK_FIELDS = [
  'book_id',
  'title',
  'cover_img',
  'description',
  'ISBN',
  'publish_date',
  'publisher',
  'editora.*',
  'is_approved',
  'has_minimum_content',
  'site_url',
  'min_active_codes',
  'date_created',
  'date_updated',
]

export const fetchBooks = async (onlyApproved = false) => {
  const params = new URLSearchParams({ fields: BOOK_FIELDS.join(','), sort: '-date_created' })
  if (onlyApproved) params.set('filter[is_approved][_eq]', 'true')
  const response = await authFetch(`/items/books?${params.toString()}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch books failed: ${response.status} ${text}`.trim())
  }
  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as Book[]
}

export const fetchApprovedBooks = () => fetchBooks(true)

export const fetchPublicApprovedBooks = async (): Promise<Pick<Book, 'book_id' | 'title' | 'cover_img'>[]> => {
  const params = new URLSearchParams({
    fields: 'book_id,title,cover_img',
    sort: '-date_created',
    'filter[is_approved][_eq]': 'true',
  })
  const response = await publicFetch(`/items/books?${params.toString()}`)
  if (!response.ok) return []
  const data = await response.json().catch(() => null)
  return data?.data ?? []
}

export const fetchBook = async (id: number | string) => {
  const params = new URLSearchParams({ fields: BOOK_FIELDS.join(',') })
  const response = await authFetch(`/items/books/${id}?${params.toString()}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch book failed: ${response.status} ${text}`.trim())
  }
  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as Book
}

export const fetchModulesByBook = async (bookId: number) => {
  const params = new URLSearchParams({ sort: 'order_number' })
  params.set('filter[id_book][_eq]', String(bookId))
  const response = await authFetch(`/items/modules?${params.toString()}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch modules failed: ${response.status} ${text}`.trim())
  }
  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as Module[]
}

export const fetchModulesByBooks = async (bookIds: number[]): Promise<Module[]> => {
  if (!bookIds.length) return []
  const params = new URLSearchParams({
    fields: 'modules_id,id_book,module_title',
    limit: '-1',
    sort: 'id_book,order_number',
  })
  params.set('filter[id_book][_in]', bookIds.join(','))
  const response = await authFetch(`/items/modules?${params.toString()}`)
  if (!response.ok) return []
  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as Module[]
}

export const fetchApprovedModulesByBook = async (bookId: number) => {
  const params = new URLSearchParams({ sort: 'order_number' })
  params.set('filter[id_book][_eq]', String(bookId))
  params.set('filter[minimum_exercises][_eq]', 'true')
  const response = await authFetch(`/items/modules?${params.toString()}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch approved modules failed: ${response.status} ${text}`.trim())
  }
  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as Module[]
}

export const fetchModules = async () => {
  const params = new URLSearchParams({ sort: 'id_book,order_number' })
  const response = await authFetch(`/items/modules?${params.toString()}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch modules failed: ${response.status} ${text}`.trim())
  }
  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as Module[]
}

export const fetchModule = async (moduleId: number | string) => {
  const response = await authFetch(`/items/modules/${moduleId}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch module failed: ${response.status} ${text}`.trim())
  }
  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as Module
}

export const fetchUserBooks = async (userId: string) => {
  const params = new URLSearchParams({
    fields:
      'user_book_id,date_created,current_badge,final_quiz_unlocked,book_id.book_id,book_id.title,book_id.cover_img,book_id.description,book_id.ISBN,book_id.publish_date,book_id.publisher,book_id.is_approved,book_id.editora.*',
    sort: '-user_book_id',
  })
  params.set('filter[user_id][_eq]', userId)

  const response = await authFetch(`/items/user_books?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch user books failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as UserBook[]
}

export const fetchUserBookBadges = async () => {
  const params = new URLSearchParams({
    fields: 'user_id,current_badge',
    limit: '-1',
  })

  const response = await authFetch(`/items/user_books?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch user book badges failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? []) as UserBook[]
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

export const fetchBookByQrCode = async (qrCode: string): Promise<Book | null> => {
  const params = new URLSearchParams({ fields: 'book_id,title,cover_img,description', limit: '1' })
  params.set('filter[qr_code][_eq]', qrCode)
  const response = await authFetch(`/items/books?${params.toString()}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch book by QR code failed: ${response.status} ${text}`.trim())
  }
  const data = await response.json().catch(() => null)
  return (data?.data?.[0] ?? null) as Book | null
}

export const checkBookOwnership = async (userId: string, bookId: number): Promise<boolean> => {
  const params = new URLSearchParams({ fields: 'user_book_id', limit: '1' })
  params.set('filter[user_id][_eq]', userId)
  params.set('filter[book_id][_eq]', String(bookId))
  const response = await authFetch(`/items/user_books?${params.toString()}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Check book ownership failed: ${response.status} ${text}`.trim())
  }
  const data = await response.json().catch(() => null)
  return (data?.data?.length ?? 0) > 0
}

export const unlockBook = async (userId: string, bookId: number): Promise<void> => {
  const response = await authFetch('/items/user_books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, book_id: bookId, current_badge: 'default', final_quiz_unlocked: false }),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Unlock failed: ${response.status} ${text}`.trim())
  }
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

export const updateBookMinimumContent = async (bookId: number, hasMinimumContent: boolean) => {
  const response = await authFetch(`/items/books/${bookId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ has_minimum_content: hasMinimumContent }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Update book minimum content failed: ${response.status} ${text}`.trim())
  }

  const data = await response.json().catch(() => null)
  return (data?.data ?? data) as Book
}

// ── Activation Codes ─────────────────────────────────────────────────────────

export type RedeemStatus = 'success' | 'not-found' | 'already-used' | 'already-owned'

export interface RedeemResult {
  status: RedeemStatus
  book?: Book
}

export const redeemActivationCode = async (code: string, userId: string): Promise<RedeemResult> => {
  const params = new URLSearchParams({
    fields: 'activation_codes_id,is_used,book_id.book_id,book_id.title,book_id.cover_img,book_id.description',
    limit: '1',
  })
  params.set('filter[code][_eq]', code.trim().toUpperCase())
  const response = await authFetch(`/items/activation_codes?${params.toString()}`)
  if (!response.ok) throw new Error('Erro ao verificar o código.')
  const data = await response.json().catch(() => null)
  const entry = data?.data?.[0]

  if (!entry) return { status: 'not-found' }
  if (entry.is_used) return { status: 'already-used' }

  const book = entry.book_id as Book

  const owned = await checkBookOwnership(userId, book.book_id)
  if (owned) return { status: 'already-owned', book }

  const patchRes = await authFetch(`/items/activation_codes/${entry.activation_codes_id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_used: true, used_by: userId, date_updated: new Date().toISOString() }),
  })
  if (!patchRes.ok) throw new Error('Erro ao marcar código como utilizado.')

  await unlockBook(userId, book.book_id)
  return { status: 'success', book }
}

export const fetchActivationCodeStats = async (bookId: number): Promise<{ total: number; unused: number }> => {
  const [totalRes, unusedRes] = await Promise.all([
    authFetch(`/items/activation_codes?aggregate[count]=*&filter[book_id][_eq]=${bookId}`),
    authFetch(`/items/activation_codes?aggregate[count]=*&filter[book_id][_eq]=${bookId}&filter[is_used][_eq]=false`),
  ])
  const totalData = await totalRes.json().catch(() => null)
  const unusedData = await unusedRes.json().catch(() => null)
  return {
    total: Number(totalData?.data?.[0]?.count ?? 0),
    unused: Number(unusedData?.data?.[0]?.count ?? 0),
  }
}

export const fetchBookUserStats = async (bookId: number): Promise<BookUserStats> => {
  const [countRes, badgeRes] = await Promise.all([
    authFetch(`/items/user_books?aggregate[count]=*&filter[book_id][_eq]=${bookId}`),
    authFetch(`/items/user_books?groupBy[]=current_badge&aggregate[count]=*&filter[book_id][_eq]=${bookId}&limit=-1`),
  ])
  const countData = await countRes.json().catch(() => null)
  const badgeData = await badgeRes.json().catch(() => null)
  const totalUsers = Number(countData?.data?.[0]?.count ?? 0)
  const badgeCounts: Record<string, number> = {}
  ;(badgeData?.data ?? []).forEach((item: any) => {
    const badge = item.current_badge ?? 'default'
    badgeCounts[badge] = Number(item.count ?? 0)
  })
  return { totalUsers, badgeCounts }
}

export const fetchBookExerciseAttempts = async (moduleIds: number[]): Promise<number> => {
  if (!moduleIds.length) return 0
  const res = await authFetch(
    `/items/user_exercises?aggregate[count]=*&filter[id_module][_in]=${moduleIds.join(',')}`
  )
  const data = await res.json().catch(() => null)
  return Number(data?.data?.[0]?.count ?? 0)
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  let s = ''
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) s += '-'
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return s
}

export const generateActivationCodes = async (
  bookId: number,
  quantity: number,
  onProgress?: (done: number, total: number) => void,
): Promise<void> => {
  const BATCH = 500
  let done = 0
  while (done < quantity) {
    const n = Math.min(BATCH, quantity - done)
    const batch = Array.from({ length: n }, () => ({ code: generateCode(), book_id: bookId, is_used: false }))
    const res = await authFetch('/items/activation_codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Erro ao gerar códigos: ${res.status} ${text}`.trim())
    }
    done += n
    onProgress?.(done, quantity)
  }
}
