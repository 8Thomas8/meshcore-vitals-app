import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, reactive, ref, watch } from 'vue'
import * as constants from '~/utils/constants'
import { pathPositions } from '~/utils/terrain'

const here = { lat: 45.1885, lon: 5.7245 }
const repeater = { lat: 45.144, lon: 5.6283 }

function answer(status: number) {
  return vi.fn(async (url: string) => {
    const count = new URL(url).searchParams.get('latitude')!.split(',').length
    return new Response(JSON.stringify({ elevation: Array.from({ length: count }, (_, i) => 200 + i) }), { status })
  })
}

async function load() {
  vi.resetModules()
  Object.entries({ ...constants, computed, reactive, ref, watch, pathPositions }).forEach(([name, value]) => vi.stubGlobal(name, value))
  const elevation = await import('~/composables/useElevation')
  vi.stubGlobal('elevationAt', elevation.elevationAt)
  return { ...elevation, ...await import('~/composables/useTerrain') }
}

describe('elevation lookups', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('flags the quota and asks again on retry', async () => {
    const { elevationAt, elevationThrottled, retryElevations } = await load()
    vi.stubGlobal('fetch', answer(429))
    expect(elevationAt(here)).toBeUndefined()
    await vi.waitFor(() => expect(elevationAt(here)).toBeNull())
    expect(elevationThrottled.value).toBe(true)

    vi.stubGlobal('fetch', answer(200))
    retryElevations()
    expect(elevationAt(here)).toBeUndefined()
    await vi.waitFor(() => expect(elevationAt(here)).toBe(200))
    expect(elevationThrottled.value).toBe(false)
  })

  it('does not blame the quota when offline', async () => {
    const { elevationAt, elevationThrottled } = await load()
    vi.stubGlobal('fetch', answer(429))
    elevationAt(here)
    await vi.waitFor(() => expect(elevationThrottled.value).toBe(true))

    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }))
    elevationAt(repeater)
    await vi.waitFor(() => expect(elevationAt(repeater)).toBeNull())
    expect(elevationThrottled.value).toBe(false)
  })

  it('keeps the last profile while the next one loads', async () => {
    const { groundBetween } = await load()
    vi.stubGlobal('fetch', answer(200))
    expect(groundBetween(here, repeater)).toBeUndefined()
    const ground = await vi.waitFor(() => {
      const value = groundBetween(here, repeater)
      expect(value).toHaveLength(pathPositions(here, repeater).length)
      return value
    })
    expect(groundBetween({ lat: here.lat + 0.01, lon: here.lon }, repeater)).toBe(ground)
  })
})
