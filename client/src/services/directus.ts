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
  user_id?: number
  name?: string
  email?: string
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
  additional_description?: string | null
}

const directusUrl = import.meta.env.VITE_DIRECTUS_URL ?? ''
const normalizedDirectusUrl = directusUrl.replace(/\/$/, '')

if (!directusUrl) {
  console.warn('VITE_DIRECTUS_URL is not set. Directus requests will fail.')
}

export const directus = createDirectus(normalizedDirectusUrl).with(rest())

export const getAssetUrl = (assetId?: string | null) => {
  if (!assetId) return ''
  if (!normalizedDirectusUrl) return ''
  return `${normalizedDirectusUrl}/assets/${assetId}`
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

export const fetchUsers = (limit?: number) =>
  directus.request(
    readItems('gamibook_users' as any, {
      sort: ['-points'],
      limit,
    }),
  ) as Promise<User[]>

export const fetchUserById = (id: number | string) =>
  directus.request(readItem('gamibook_users' as any, id)) as Promise<User>

export const findUserByCredentials = (email: string, password: string) =>
  directus.request(
    readItems('gamibook_users' as any, {
      filter: {
        email: { _eq: email },
        password: { _eq: password },
      },
      limit: 1,
    }),
  ) as Promise<User[]>

export const registerUser = (payload: Partial<User>) =>
  directus.request(createItem('gamibook_users' as any, payload)) as Promise<User>

export const updateUser = (id: number | string, payload: Partial<User>) =>
  directus.request(updateItem('gamibook_users' as any, id, payload)) as Promise<User>
