import type { Book, Editora, Module, UserBook } from '@/types'
import { authFetch } from './client'

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

const attachEditorasToBooks = async (books: Book[]) => {
  if (!books || books.length === 0) return books

  books.forEach((book) => {
    if (typeof book.editora_id === 'object' && book.editora_id !== null) {
      book.editora = book.editora_id as Editora
    }
  })

  const needsFetching = books.some((book) => typeof book.editora_id === 'number')
  if (!needsFetching) return books

  try {
    const response = await authFetch('/items/editoras')
    const data = await response.json().catch(() => null)
    const editoras: Editora[] = data?.data ?? []

    books.forEach((book) => {
      if (typeof book.editora_id === 'number') {
        const ed = editoras.find(
          (item) => item.id === book.editora_id || (item as any).editora_id === book.editora_id,
        )
        if (ed) book.editora = ed
      }
    })
  } catch (err) {
    console.error('Erro ao carregar editoras:', err)
  }

  return books
}

export const fetchBooks = async () => {
  const params = new URLSearchParams({ fields: BOOK_FIELDS.join(','), sort: '-date_created' })
  const response = await authFetch(`/items/books?${params.toString()}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch books failed: ${response.status} ${text}`.trim())
  }
  const data = await response.json().catch(() => null)
  const books = (data?.data ?? []) as Book[]
  return attachEditorasToBooks(books)
}

export const fetchApprovedBooks = async () => {
  const params = new URLSearchParams({ fields: BOOK_FIELDS.join(','), sort: '-date_created' })
  params.set('filter[is_approved][_eq]', 'true')
  const response = await authFetch(`/items/books?${params.toString()}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch approved books failed: ${response.status} ${text}`.trim())
  }
  const data = await response.json().catch(() => null)
  const books = (data?.data ?? []) as Book[]
  return attachEditorasToBooks(books)
}

export const fetchBook = async (id: number | string) => {
  const params = new URLSearchParams({ fields: BOOK_FIELDS.join(',') })
  const response = await authFetch(`/items/books/${id}?${params.toString()}`)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Fetch book failed: ${response.status} ${text}`.trim())
  }
  const data = await response.json().catch(() => null)
  const book = (data?.data ?? data) as Book
  await attachEditorasToBooks([book])
  return book
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
    fields: 'user_book_id,current_badge,final_quiz_unlocked,book_id.*,book_id.editora_id.*',
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

  const booksToAttach = userBooks.map((entry) => entry.book_id).filter((book) => !!book) as Book[]
  await attachEditorasToBooks(booksToAttach)

  return userBooks
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
  const data = await response.json().catch(() => null)
  return (data?.data?.[0] ?? null) as Book | null
}

export const checkBookOwnership = async (userId: string, bookId: number): Promise<boolean> => {
  const params = new URLSearchParams({ fields: 'user_book_id', limit: '1' })
  params.set('filter[user_id][_eq]', userId)
  params.set('filter[book_id][_eq]', String(bookId))
  const response = await authFetch(`/items/user_books?${params.toString()}`)
  const data = await response.json().catch(() => null)
  return (data?.data?.length ?? 0) > 0
}

export const unlockBook = async (userId: string, bookId: number): Promise<void> => {
  const response = await authFetch('/items/user_books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, book_id: bookId }),
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
