import type { User } from './user'
import type { Module } from './book'

export type Exercise = {
  exercise_id?: number
  id_module?: number | null
  status?: 'draft' | 'approved' | 'unapproved'
  type?: 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'
  content?: Record<string, unknown>
  points?: number | null
  date_created?: string | null
}

export type DailyExercise = {
  daily_exercise_id?: number
  book_id?: number | null
  type?: 'multiple-choice' | 'true-false' | 'fill-blanks' | 'ordering'
  content?: Record<string, unknown>
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
