import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, readonly, ref, shallowRef, watch } from 'vue'

async function load() {
  vi.resetModules()
  const autoScan = ref(false)
  const connection = shallowRef<object | null>(null)
  const status = ref('disconnected')
  const retrying = ref(false)
  const lock = { release: vi.fn(async () => {}), addEventListener: vi.fn() }
  const request = vi.fn(async () => lock)
  Object.entries({
    computed,
    readonly,
    ref,
    watch,
    WAKE_LOCK_STORAGE_KEY: 'wake-lock',
    useRepeaters: () => ({ autoScan }),
    useMeshCore: () => ({ connection, status, retrying }),
    navigator: { wakeLock: { request } },
    document: { hidden: false, addEventListener: vi.fn() },
    localStorage: { getItem: () => null, setItem: vi.fn() }
  }).forEach(([name, value]) => vi.stubGlobal(name, value))
  const { useWakeLock } = await import('~/composables/useWakeLock')
  useWakeLock().start()
  return { autoScan, connection, status, retrying, request, lock }
}

describe('wake lock', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the screen on for auto scan only while connected', async () => {
    const { autoScan, connection, status, request, lock } = await load()
    autoScan.value = true
    await nextTick()
    expect(request).not.toHaveBeenCalled()

    connection.value = {}
    status.value = 'connected'
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1))

    connection.value = null
    await vi.waitFor(() => expect(lock.release).toHaveBeenCalledTimes(1))
    expect(autoScan.value).toBe(true)
  })

  it('keeps it on while reconnecting and lets it go once the retries are over', async () => {
    const { autoScan, connection, status, retrying, request, lock } = await load()
    autoScan.value = true
    connection.value = {}
    status.value = 'connected'
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1))

    status.value = 'lost'
    retrying.value = true
    await nextTick()
    expect(lock.release).not.toHaveBeenCalled()

    retrying.value = false
    await vi.waitFor(() => expect(lock.release).toHaveBeenCalledTimes(1))
  })
})
