interface Toast {
  id: number
  message: string
  tone: 'warning' | 'error'
  open: boolean
}

const toasts = ref<Toast[]>([])
let nextId = 0

export function showToast(message: string, tone: Toast['tone'] = 'error') {
  if (toasts.value.some(toast => toast.open && toast.message === message)) return
  toasts.value = [...toasts.value.filter(toast => toast.open), { id: nextId++, message, tone, open: true }]
}

export function useToasts() {
  return toasts
}
