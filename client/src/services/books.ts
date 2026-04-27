import { readItem, readItems } from '@directus/sdk'
import type { Book, Editora, Module, UserBook } from '@/types'
import { authFetch, directus } from './client'

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
    let editoras: Editora[] = []
    try {
      const response = await authFetch('/items/editoras')
      const data = await response.json().catch(() => null)
      editoras = data?.data || []
    } catch {
      editoras = (await directus.request(readItems('editoras' as any))) as Editora[]
    }

    books.forEach((book) => {
      if (typeof book.editora_id === 'number') {
        const ed = editoras.find(
          (item) => item.id === book.editora_id || (item as any).editora_id === book.editora_id,
        )
        if (ed) {
          book.editora = ed
        }
      }
    })
  } catch (err) {
    console.error('Erro ao carregar editoras:', err)
  }

  return books
}

export const fetchBooks = async () => {
  const books = (await directus.request(
    readItems('books' as any, {
      fields: BOOK_FIELDS,
      sort: ['-date_created'],
    }),
  )) as Book[]
  return attachEditorasToBooks(books)
}

export const fetchApprovedBooks = async () => {
  const books = (await directus.request(
    readItems('books' as any, {
      filter: { is_approved: { _eq: true } },
      fields: BOOK_FIELDS,
      sort: ['-date_created'],
    }),
  )) as Book[]
  return attachEditorasToBooks(books)
}

export const fetchBook = async (id: number | string) => {
  const book = (await directus.request(
    readItem('books' as any, id, { fields: BOOK_FIELDS }),
  )) as Book
  await attachEditorasToBooks([book])
  return book
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

export const fetchUserBooks = async (userId: string) => {
  const params = new URLSearchParams({
    fields: 'user_book_id,book_id.*,book_id.editora_id.*',
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
