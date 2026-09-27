import { describe, expect, it } from 'vitest'
import { geoidHeight } from '~/utils/geoid'

describe('geoidHeight', () => {
  it('puts the geoid about 45 m above the ellipsoid in Paris', () => {
    expect(Math.abs(geoidHeight({ lat: 48.8566, lon: 2.3522 }) - 44.6)).toBeLessThan(1)
  })

  it('puts the geoid about 33 m below the ellipsoid in New York', () => {
    expect(Math.abs(geoidHeight({ lat: 40.7128, lon: -74.006 }) - -32.7)).toBeLessThan(1)
  })

  it('returns the grid value on a node', () => {
    expect(geoidHeight({ lat: 6, lon: 0 })).toBe(26)
  })

  it('interpolates between rows', () => {
    expect(geoidHeight({ lat: 5.5, lon: 0 })).toBeCloseTo(23)
  })

  it('wraps across the prime meridian', () => {
    expect(geoidHeight({ lat: 6, lon: 359.5 })).toBeCloseTo(26.5)
    expect(geoidHeight({ lat: 5.5, lon: -0.5 })).toBeCloseTo(geoidHeight({ lat: 5.5, lon: 359.5 }))
  })

  it('stays on the grid at the poles', () => {
    expect(geoidHeight({ lat: 90, lon: 0 })).toBe(14)
    expect(geoidHeight({ lat: -90, lon: 0 })).toBe(-30)
  })
})
