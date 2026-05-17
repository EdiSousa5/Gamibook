export type User = {
  id?: string
  first_name?: string
  last_name?: string
  name?: string
  email?: string
  avatar?: string | null
  points?: number
  level?: number
  role?: { id?: string; name?: string } | string | null
  password?: string
  date_created?: string | null
  exercises_daily_streak?: number
  best_exercises_daily_streak?: number
  last_login?: string | null
}
