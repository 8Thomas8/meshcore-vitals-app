import type { CoverageLevel, Position } from '../../app/utils/constants'
import type { Session } from '../../app/utils/history'

export const HERE: Position = { lat: 45.0434, lon: 3.8853 }

export const COMPANION = { name: 'Test Companion', spreadingFactor: 11 }

export interface MockRepeater {
  name: string
  bearing: number
  km: number
  rx?: number
  tx?: number
  via?: string
}

export const REPEATERS: MockRepeater[] = [
  { name: 'Foxtrot', bearing: 92, km: 4.3, rx: 8, tx: 7 },
  { name: 'Juliett', bearing: 313, km: 3.2, rx: 7, tx: 6 },
  { name: 'Alpha', bearing: 31, km: 1.5, rx: 6, tx: 5 },
  { name: 'India', bearing: 247, km: 3.4, rx: 5, tx: 6 },
  { name: 'Delta', bearing: 305, km: 4.8, rx: 3, tx: 3 },
  { name: 'Bravo', bearing: 133, km: 4.9, rx: 2, tx: 1 },
  { name: 'Echo', bearing: 204, km: 6.7, rx: -4, tx: -5 },
  { name: 'Golf', bearing: 173, km: 7.3, rx: -9, tx: -10 },
  { name: 'Hotel', bearing: 210, km: 3.2, rx: -14, tx: -13 },
  { name: 'Mike', bearing: 141, km: 11.4, via: 'Bravo' },
  { name: 'Lima', bearing: 8, km: 10.7, via: 'Alpha' },
  { name: 'Kilo', bearing: 35, km: 10.2, via: 'Alpha' }
]

export function around(bearing: number, km: number): Position {
  const angle = bearing * Math.PI / 180
  return {
    lat: HERE.lat + km * Math.cos(angle) / 111.32,
    lon: HERE.lon + km * Math.sin(angle) / (111.32 * Math.cos(HERE.lat * Math.PI / 180))
  }
}

export function keyOf(name: string): Uint8Array {
  let seed = Array.from(name).reduce((hash, letter) => Math.imul(hash, 31) + letter.charCodeAt(0), 7) >>> 0
  const key = Uint8Array.from({ length: 32 }, () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
    return seed >>> 24
  })
  key[0] = 0x10 + REPEATERS.findIndex(repeater => repeater.name === name) * 0x11
  return key
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

const LEVELS: CoverageLevel[] = ['good', 'good', 'good', 'fair', 'fair', 'weak', 'fair', 'good', 'good', 'good', 'fair', 'good', 'good', 'good', 'good', 'fair', 'good', 'good']

export function pastSession(): Session {
  const startedAt = new Date(2026, 8, 12, 21, 49).getTime()
  return {
    startedAt,
    endedAt: startedAt + 43 * 60_000,
    companionName: COMPANION.name,
    spreadingFactor: COMPANION.spreadingFactor,
    scans: LEVELS.map((level, i) => ({ at: startedAt + i * 150_000, position: around(200, 2.2 - i * 0.25), level, usable: level === 'good' ? 3 : 1 })),
    repeaters: REPEATERS.filter(repeater => !repeater.via).slice(0, 8).map(repeater => ({
      id: hex(keyOf(repeater.name)),
      name: repeater.name,
      position: around(repeater.bearing, repeater.km),
      hops: 0,
      via: null,
      rx: repeater.rx!,
      tx: repeater.tx!,
      lastHeard: startedAt
    }))
  }
}
