import type { User } from './user'

export type Editora = {
  id?: number
  nome_editora?: string
}

export type Book = {
  book_id: number
  title?: string
  cover_img?: string | null
  description?: string | null
  ISBN?: string | null
  publish_date?: string | null
  publisher?: string
  editora_id?: number | Editora | null
  editora?: Editora | null
  is_approved?: boolean | null
  qr_code?: string | null
  date_created?: string | null
  date_updated?: string | null
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

export type UserBook = {
  user_book_id?: number
  user_id?: string | User
  book_id?: number | Book
  current_badge?: 'default' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'galaxy' | null
  final_quiz_unlocked?: boolean | null
}
