import { EARTH_K, FRESNEL_CLEAR_SHARE, TERRAIN_MARGIN_M, TERRAIN_SAMPLES, TERRAIN_SPACING_M } from './constants'
import type { Position } from './constants'
import { distanceMeters, EARTH_RADIUS_M } from './repeaters'

const SPEED_OF_LIGHT_M_PER_S = 299_792_458

export type TerrainVerdict = 'clear' | 'marginal' | 'partial' | 'blocked'

export const TERRAIN_TONES = { clear: 'success', marginal: 'warning', partial: 'warning', blocked: 'error' } as const

export function pathPositions(from: Position, to: Position, count = Math.min(TERRAIN_SAMPLES, Math.max(3, Math.floor(distanceMeters(from, to) / TERRAIN_SPACING_M) + 1))): Position[] {
  return Array.from({ length: count }, (_, i) => {
    const share = i / (count - 1)
    return { lat: from.lat + (to.lat - from.lat) * share, lon: from.lon + (to.lon - from.lon) * share }
  })
}

export function earthBulge(fromMeters: number, toMeters: number): number {
  return fromMeters * toMeters / (2 * EARTH_K * EARTH_RADIUS_M)
}

export function fresnelRadius(fromMeters: number, toMeters: number, frequencyMhz: number): number {
  const total = fromMeters + toMeters
  return total ? Math.sqrt(SPEED_OF_LIGHT_M_PER_S / (frequencyMhz * 1e6) * fromMeters * toMeters / total) : 0
}

export function analyzeTerrain(ground: readonly number[], length: number, fromAntenna: number, toAntenna: number, frequencyKhz: number) {
  const last = ground.length - 1
  const from = ground[0]! + fromAntenna
  const to = ground[last]! + toAntenna
  const points = ground.map((height, i) => {
    const distance = length * i / last
    const surface = height + earthBulge(distance, length - distance)
    const sight = from + (to - from) * i / last
    const radius = fresnelRadius(distance, length - distance, frequencyKhz / 1000)
    const clearance = sight - surface
    return { distance, ground: height, surface, sight, radius, clearance, shortfall: FRESNEL_CLEAR_SHARE * radius - clearance }
  })
  const tightest = points.slice(1, -1).reduce((worst, point) => point.shortfall > worst.shortfall ? point : worst, points[1]!)
  const verdict: TerrainVerdict = Math.abs(tightest.shortfall) < TERRAIN_MARGIN_M ? 'marginal' : tightest.shortfall < 0 ? 'clear' : tightest.clearance >= 0 ? 'partial' : 'blocked'
  return { points, tightest, verdict, from, to, length }
}

export type TerrainAnalysis = ReturnType<typeof analyzeTerrain>
type TerrainPoint = TerrainAnalysis['points'][number]

export function intrusions(points: readonly TerrainPoint[]) {
  const limit = (point: TerrainPoint) => point.sight - FRESNEL_CLEAR_SHARE * point.radius
  const over = (point: TerrainPoint) => point.surface - limit(point)
  const runs: { distance: number, top: number, bottom: number }[][] = [[]]
  points.forEach((point, i) => {
    const previous = points[i - 1]
    if (previous && (over(previous) > 0) !== (over(point) > 0)) {
      const share = over(previous) / (over(previous) - over(point))
      const height = limit(previous) + (limit(point) - limit(previous)) * share
      runs.at(-1)!.push({ distance: previous.distance + (point.distance - previous.distance) * share, top: height, bottom: height })
      if (over(point) <= 0) runs.push([])
    }
    if (over(point) > 0) runs.at(-1)!.push({ distance: point.distance, top: point.surface, bottom: limit(point) })
  })
  return runs.filter(run => run.length)
}
