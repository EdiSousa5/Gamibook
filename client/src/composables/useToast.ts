import { ref } from 'vue'

export type ToastType = 'error' | 'success' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

// Module-level singleton — all components share the same toast list
const toasts = ref<Toast[]>([])
let _nextId = 0

export function useToast() {
  const dismiss = (id: number) => {
    const i = toasts.value.findIndex((t) => t.id === id)
    if (i >= 0) toasts.value.splice(i, 1)
  }

  const show = (message: string, type: ToastType = 'info', duration = 4000) => {
    const id = ++_nextId
    toasts.value.push({ id, message, type })
    if (duration > 0) setTimeout(() => dismiss(id), duration)
  }

  return {
    toasts,
    dismiss,
    error: (msg: string, duration?: number) => show(msg, 'error', duration),
    success: (msg: string, duration?: number) => show(msg, 'success', duration),
    info: (msg: string, duration?: number) => show(msg, 'info', duration),
  }
}
