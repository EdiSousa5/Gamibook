export type NotificationType =
  | 'system'
  | 'achievement'
  | 'quiz_ready'
  | 'quiz_result'
  | 'streak_warning'
  | 'new_content'
  | 'book_unlocked'
  | 'exercise_created'
  | 'exercise_deleted'
  | 'exercise_edited'
  | 'book_approved'
  | 'module_created'

export interface Notification {
  notifications_id: string
  user: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  date_created: string
}

export interface CreateNotificationPayload {
  user: string
  title: string
  message: string
  type: NotificationType
}
