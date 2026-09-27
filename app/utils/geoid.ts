import grid from '~/assets/egm96.bin?inline'
import type { Position } from './constants'

// EGM96 geoid heights above the WGS84 ellipsoid, in whole metres on a 1° grid
// from 90° N and 0° E, taken from GeographicLib's egm96-15.
const undulations = Int8Array.from(atob(grid.slice(grid.indexOf(',') + 1)), char => char.charCodeAt(0))

function undulation(row: number, column: number): number {
  return undulations[row * 360 + column % 360]!
}

export function geoidHeight({ lat, lon }: Position): number {
  const y = 90 - lat
  const x = (lon % 360 + 360) % 360
  const row = Math.min(Math.floor(y), 179)
  const column = Math.floor(x)
  const dy = y - row
  const dx = x - column
  const top = undulation(row, column) * (1 - dx) + undulation(row, column + 1) * dx
  const bottom = undulation(row + 1, column) * (1 - dx) + undulation(row + 1, column + 1) * dx
  return top * (1 - dy) + bottom * dy
}
