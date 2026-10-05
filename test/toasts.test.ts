import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

async function load() {
  vi.resetModules()
  vi.stubGlobal('ref', ref)
  return await import('~/composables/useToasts')
}

describe('toasts', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows an error once while it is open', async () => {
    const { showToast, useToasts } = await load()
    showToast('errors.unreachable')
    showToast('errors.unreachable')
    expect(useToasts().value).toMatchObject([{ message: 'errors.unreachable', tone: 'error', open: true }])
  })

  it('shows it again once closed and forgets the closed one', async () => {
    const { showToast, useToasts } = await load()
    showToast('quota.reached', 'warning')
    const [first] = useToasts().value
    first!.open = false
    showToast('quota.reached', 'warning')
    expect(useToasts().value).toHaveLength(1)
    expect(useToasts().value[0]).toMatchObject({ open: true, tone: 'warning' })
    expect(useToasts().value[0]!.id).not.toBe(first!.id)
  })

  it('stacks different messages', async () => {
    const { showToast, useToasts } = await load()
    showToast('quota.reached', 'warning')
    showToast('errors.unreachable')
    expect(useToasts().value.map(toast => toast.message)).toEqual(['quota.reached', 'errors.unreachable'])
  })
})
