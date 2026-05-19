import type { User } from './user'
import type { Module } from './book'

export type ExerciseContent = {
  pergunta?: string
  question?: string
  enunciado?: string
  frase?: string
  afirmacao?: string
  opcoes?: string[] | string
  options?: string[] | string
  resposta_correta?: string | boolean
  correto?: boolean | string
}

export type Exercise = {
  exercise_id?: number
  id_module?: number | null
  status?: 'draft' | 'approved' | 'unapproved'
  type?: 'multiple-choice' | 'true-false'
  content?: ExerciseContent
  points?: number | null
  date_created?: string | null
  created_by?: string | null
}

export type UserDailyExercise = {
  id_user_daily_exercise?: number
  user_id?: string | User
  exercise_id?: number | Exercise
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

export type UserPointsHistory = {
  id?: number
  user_id?: string | User
  points?: number | null
  source?: 'exercise' | 'daily'
  reference_id?: number | null
  date_created?: string | null
}

export type FinalQuizAttemptQuestion = {
  exercise_id: number
  question_text: string
  is_correct: boolean
}

export type FinalQuizAttemptContent = {
  questions: FinalQuizAttemptQuestion[]
}

export type FinalQuizAttempt = {
  final_quiz_attempts_id?: number
  date_created?: string
  user_id?: string
  book_id?: number
  score?: number
  status?: 'fail' | 'pass'
  content?: FinalQuizAttemptContent
}
