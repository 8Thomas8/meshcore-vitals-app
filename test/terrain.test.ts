import { describe, expect, it } from 'vitest'
import { TERRAIN_MARGIN_M } from '~/utils/constants'
import { analyzeTerrain, earthBulge, fresnelRadius, intrusions, pathPositions } from '~/utils/terrain'

describe('pathPositions', () => {
  it('spreads the points evenly from one end to the other', () => {
    const points = pathPositions({ lat: 45, lon: 5 }, { lat: 45.1, lon: 4.9 }, 11)
    expect(points).toHaveLength(11)
    expect(points[0]).toEqual({ lat: 45, lon: 5 })
    expect(points[5]!.lat).toBeCloseTo(45.05)
    expect(points[5]!.lon).toBeCloseTo(4.95)
    expect(points[10]!.lat).toBeCloseTo(45.1)
  })

  it('puts each point of a short path in its own elevation cell', () => {
    for (let angle = 0; angle < 180; angle += 5) {
      for (const meters of [300, 1100, 4000]) {
        const to = { lat: 45.1885 + meters / 111_320 * Math.cos(angle * Math.PI / 180), lon: 5.7245 + meters / 78_710 * Math.sin(angle * Math.PI / 180) }
        const cells = pathPositions({ lat: 45.1885, lon: 5.7245 }, to).map(point => `${point.lat.toFixed(3)},${point.lon.toFixed(3)}`)
        cells.slice(1).forEach((cell, i) => expect(cell).not.toBe(cells[i]))
      }
    }
  })

  it('keeps three points on a path too short to split', () => {
    expect(pathPositions({ lat: 45, lon: 5 }, { lat: 45, lon: 5 })).toHaveLength(3)
  })

  it('caps the points on long paths', () => {
    expect(pathPositions({ lat: 45, lon: 5 }, { lat: 45.2, lon: 5 })).toHaveLength(100)
  })
})

describe('earthBulge', () => {
  it('raises the middle of a 13 km path by about 2.5 m', () => {
    expect(earthBulge(6500, 6500)).toBeCloseTo(2.49, 2)
  })

  it('is flat at the ends', () => {
    expect(earthBulge(0, 13000)).toBe(0)
  })
})

describe('fresnelRadius', () => {
  it('follows the first Fresnel zone', () => {
    expect(fresnelRadius(3000, 3000, 869.525)).toBeCloseTo(22.74, 1)
  })

  it('closes at the antennas', () => {
    expect(fresnelRadius(0, 6000, 869.525)).toBe(0)
  })
})

describe('analyzeTerrain', () => {
  const flat = Array.from({ length: 21 }, () => 100)
  const withHill = (height: number) => flat.map((ground, i) => i === 10 ? height : ground)

  it('is clear over flat ground with room to spare', () => {
    const terrain = analyzeTerrain(flat, 2000, 40, 40, 869525)
    expect(terrain.verdict).toBe('clear')
    expect(terrain.tightest.shortfall).toBeLessThan(-TERRAIN_MARGIN_M)
  })

  it('is borderline when the margin is within the terrain uncertainty', () => {
    expect(analyzeTerrain(flat, 2000, 10, 10, 869525).verdict).toBe('marginal')
  })

  it('is partial when the ground cuts deep into the Fresnel zone', () => {
    const valley = flat.map((_, i) => i === 10 ? 102 : 50)
    const terrain = analyzeTerrain(valley, 20000, 60, 60, 869525)
    expect(terrain.verdict).toBe('partial')
    expect(terrain.tightest.distance).toBe(10000)
    expect(terrain.tightest.shortfall).toBeCloseTo(0.6 * fresnelRadius(10000, 10000, 869.525) - (110 - 102 - earthBulge(10000, 10000)))
  })

  it('is blocked when the ground rises well above the line of sight', () => {
    const terrain = analyzeTerrain(withHill(130), 2000, 10, 10, 869525)
    expect(terrain.verdict).toBe('blocked')
    expect(terrain.tightest.clearance).toBeLessThan(0)
  })

  it('reads the companion frequency in kHz', () => {
    const terrain = analyzeTerrain(flat, 2000, 10, 10, 869525)
    expect(terrain.points[10]!.radius).toBeCloseTo(fresnelRadius(1000, 1000, 869.525))
  })

  it('keeps a borderline band around the Fresnel limit', () => {
    const limit = 140 - 0.6 * fresnelRadius(1000, 1000, 869.525) - earthBulge(1000, 1000)
    const verdict = (hill: number) => analyzeTerrain(withHill(hill), 2000, 40, 40, 869525).verdict
    expect(verdict(limit - TERRAIN_MARGIN_M - 0.01)).toBe('clear')
    expect(verdict(limit - TERRAIN_MARGIN_M + 0.01)).toBe('marginal')
    expect(verdict(limit + TERRAIN_MARGIN_M - 0.01)).toBe('marginal')
    expect(verdict(limit + TERRAIN_MARGIN_M + 0.01)).toBe('blocked')
  })

  it('never picks an end as the tightest point', () => {
    const valley = flat.map((ground, i) => i === 0 || i === 20 ? 500 : ground)
    const terrain = analyzeTerrain(valley, 2000, 1.5, 5, 869525)
    expect(terrain.verdict).toBe('clear')
    expect(terrain.tightest.distance).toBeGreaterThan(0)
    expect(terrain.tightest.distance).toBeLessThan(2000)
  })

  it('puts the antennas above the ground at each end', () => {
    const terrain = analyzeTerrain(flat, 2000, 1.5, 10, 869525)
    expect(terrain.from).toBe(101.5)
    expect(terrain.to).toBe(110)
  })
})

describe('intrusions', () => {
  const flat = Array.from({ length: 21 }, () => 100)

  it('finds nothing over flat ground', () => {
    expect(intrusions(analyzeTerrain(flat, 2000, 10, 10, 869525).points)).toEqual([])
  })

  it('outlines a hill a single sample wide', () => {
    const runs = intrusions(analyzeTerrain(flat.map((ground, i) => i === 10 ? 105 : ground), 2000, 10, 10, 869525).points)
    expect(runs).toHaveLength(1)
    expect(runs[0]).toHaveLength(3)
    expect(runs[0]![0]!.top).toBeCloseTo(runs[0]![0]!.bottom)
    expect(runs[0]![1]!.distance).toBe(1000)
    expect(runs[0]![0]!.distance).toBeGreaterThan(900)
    expect(runs[0]![2]!.distance).toBeLessThan(1100)
  })

  it('keeps separate ridges apart', () => {
    const ridges = flat.map((ground, i) => i === 5 || i === 15 ? 120 : ground)
    expect(intrusions(analyzeTerrain(ridges, 2000, 10, 10, 869525).points)).toHaveLength(2)
  })
})
