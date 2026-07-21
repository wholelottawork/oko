import { toast } from 'sonner'
import type { ReactNode } from 'react'

export interface ConfirmOptions {
  title?: string
  message?: string
  okText?: string
  cancelText?: string
}

// A reference to the global confirm function, which will be set in ConfirmDialogProvider
let globalConfirm:
  | ((options: ConfirmOptions & { message: string }) => Promise<boolean>)
  | null = null

export function setGlobalConfirm(
  confirmFn: (options: ConfirmOptions & { message: string }) => Promise<boolean>
) {
  globalConfirm = confirmFn
}

// Confirm dialog function, use shadcn AlertDialog
export function confirmToast(
  message: string,
  options: ConfirmOptions = {}
): Promise<boolean> {
  if (!globalConfirm) {
    console.error('ConfirmDialogProvider not initialized')
    return Promise.resolve(false)
  }

  return globalConfirm({
    message,
    ...options,
  })
}

// Unified notification encapsulation to avoid components directly relying on sonner
type Message = string | ReactNode

function withFallbackMessage(msg: Message): Message {
  return typeof msg === 'string' && !msg.trim() ? 'An unexpected error occurred' : msg
}

function message(msg: Message, options?: Parameters<typeof toast>[1]) {
  return toast(withFallbackMessage(msg) as any, options)
}

function success(msg: Message, options?: Parameters<typeof toast.success>[1]) {
  return toast.success(withFallbackMessage(msg) as any, options)
}

function error(msg: Message, options?: Parameters<typeof toast.error>[1]) {
  return toast.error(withFallbackMessage(msg) as any, options)
}

function info(msg: Message, options?: Parameters<typeof toast.info>[1]) {
  return toast.info?.(withFallbackMessage(msg) as any, options) ?? toast(withFallbackMessage(msg) as any, options)
}

function warning(msg: Message, options?: Parameters<typeof toast.warning>[1]) {
  return toast.warning?.(withFallbackMessage(msg) as any, options) ?? toast(withFallbackMessage(msg) as any, options)
}

function custom(
  renderer: Parameters<typeof toast.custom>[0],
  options?: Parameters<typeof toast.custom>[1]
) {
  return toast.custom(renderer, options)
}

function dismiss(id?: string | number) {
  return toast.dismiss(id as any)
}

function promise<T>(p: Promise<T> | (() => Promise<T>), msgs: any) {
  return toast.promise<T>(p as any, msgs as any)
}

export const notify = {
  message,
  success,
  error,
  info,
  warning,
  custom,
  dismiss,
  promise,
}

export default { confirmToast, notify }
