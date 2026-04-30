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
  exercises_daily_streak?: number
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

export type DailyExercise = {
  daily_exercise_id?: number
  book_id?: number | null
  type?: 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'
  content?: Record<string, any>
  date_created?: string | null
}

export type UserDailyExercise = {
  id_user_daily_exercise?: number
  user_id?: string | User
  daily_exercise_id?: number | DailyExercise
  is_correct?: boolean | null
  date_created?: string | null
}

export type ExerciseExample = Pick<Exercise, 'type' | 'content'> & {
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
  user_book_id?: number
  user_id?: string | User
  book_id?: number | Book
  current_badge?: 'default' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'galaxy' | null
  final_quiz_unlocked?: boolean | null
}
