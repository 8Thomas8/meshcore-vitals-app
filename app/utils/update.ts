import type { ConnectionStatus } from './constants'

export interface AutoReloadState {
  available: boolean
  status: ConnectionStatus
  /** A toast is on screen, a reload would clear it. */
  toast: boolean
  /** A service worker serves this page, it cannot reload into the same build. */
  controlled: boolean
  /** The deployment this tab already reloaded by itself for. */
  reloadedFor: string | null
  latestId: string | null
}

// Reloading drops the Bluetooth link and clears the toasts, so only with
// neither. Without a service worker, once per deployment: a reload that still
// serves the old build, say from a lagging cache, must not loop.
export function shouldAutoReload(state: AutoReloadState): boolean {
  if (!state.available || state.status !== 'disconnected' || state.toast) return false
  return state.controlled || state.reloadedFor !== state.latestId
}
