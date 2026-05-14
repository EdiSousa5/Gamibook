import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Notification, CreateNotificationPayload } from '@/types/notification'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification as apiCreate,
} from '@/services/notifications'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const loading = ref(false)

  const unreadCount = computed(() => notifications.value.filter((n) => !n.is_read).length)

  const load = async (userId: string) => {
    loading.value = true
    try {
      notifications.value = await fetchNotifications(userId)
    } catch {
      // silent fail — not critical
    } finally {
      loading.value = false
    }
  }

  const markRead = async (id: string) => {
    const notif = notifications.value.find((n) => n.notifications_id === id)
    if (notif) notif.is_read = true
    markNotificationRead(id).catch(() => {})
  }

  const markAllRead = async () => {
    const unreadIds = notifications.value
      .filter((n) => !n.is_read)
      .map((n) => n.notifications_id)
    notifications.value.forEach((n) => { n.is_read = true })
    markAllNotificationsRead(unreadIds).catch(() => {})
  }

  const add = async (payload: CreateNotificationPayload): Promise<void> => {
    const tempId = `temp-${Date.now()}`
    const optimistic: Notification = {
      notifications_id: tempId,
      ...payload,
      is_read: false,
      date_created: new Date().toISOString(),
    }
    notifications.value.unshift(optimistic)

    try {
      const saved = await apiCreate(payload)
      const idx = notifications.value.findIndex((n) => n.notifications_id === tempId)
      if (idx !== -1) notifications.value[idx] = saved
    } catch {
      notifications.value = notifications.value.filter((n) => n.notifications_id !== tempId)
    }
  }

  const reset = () => {
    notifications.value = []
  }

  return { notifications, unreadCount, loading, load, markRead, markAllRead, add, reset }
})
