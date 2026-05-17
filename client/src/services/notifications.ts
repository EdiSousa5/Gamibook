import { authFetch, parseListResponse, parseResponse } from './client'
import type { Notification, CreateNotificationPayload } from '@/types/notification'

export const fetchNotifications = async (userId: string, limit = 50): Promise<Notification[]> => {
  const params = new URLSearchParams({
    'filter[user][_eq]': userId,
    sort: '-date_created',
    limit: String(limit),
  })
  const response = await authFetch(`/items/notifications?${params}`)
  return parseListResponse<Notification>(response, 'fetchNotifications')
}

export const markNotificationRead = async (id: string): Promise<void> => {
  await authFetch(`/items/notifications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_read: true }),
  })
}

export const markAllNotificationsRead = async (ids: string[]): Promise<void> => {
  if (!ids.length) return
  await authFetch('/items/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys: ids, data: { is_read: true } }),
  })
}

export const deleteNotifications = async (ids: string[]): Promise<void> => {
  if (!ids.length) return
  await authFetch('/items/notifications', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ids),
  })
}

export const createNotification = async (
  payload: CreateNotificationPayload,
): Promise<Notification> => {
  const response = await authFetch('/items/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, is_read: false }),
  })
  return parseResponse<Notification>(response, 'createNotification')
}
