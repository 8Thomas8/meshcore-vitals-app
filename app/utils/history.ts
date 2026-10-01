import { ADV_TYPE_REPEATER, SESSION_GAP_MS } from './constants'
import type { DeepReadonly } from 'vue'
import type { CoverageLevel, HeardRepeater, Position } from './constants'
import { distanceMeters, toHex, toPosition } from './repeaters'

export interface SessionRepeater {
  id: string
  name: string | null
  position: Position | null
  hops: number
  via: string | null
  rx: number | null
  tx: number | null
  lastHeard: number
}

export interface SessionScan {
  at: number
  position: Position | null
  level: CoverageLevel
  usable: number
}

export interface Session {
  startedAt: number
  endedAt: number
  companionName: string | null
  spreadingFactor: number | null
  repeaters: SessionRepeater[]
  scans: SessionScan[]
}

function best(...values: (number | null | undefined)[]): number | null {
  const known = values.filter(value => typeof value === 'number')
  return known.length ? Math.max(...known) : null
}

export function samePrefix(a: string, b: string): boolean {
  return a.startsWith(b) || b.startsWith(a)
}

export function copyPosition(position: DeepReadonly<Position> | null): Position | null {
  return position && { lat: position.lat, lon: position.lon }
}

export function summarizeRepeaters(previous: readonly SessionRepeater[], heard: DeepReadonly<HeardRepeater[]>, since: number): SessionRepeater[] {
  return heard.filter(repeater => repeater.lastHeard >= since).map((repeater) => {
    const before = previous.find(other => samePrefix(other.id, repeater.id))
    return {
      id: repeater.id,
      name: repeater.name ?? before?.name ?? null,
      position: copyPosition(repeater.position) ?? before?.position ?? null,
      hops: repeater.hops,
      via: repeater.via,
      rx: best(before?.rx, ...repeater.history.filter(sample => sample.at >= since).map(sample => sample.snr)),
      tx: best(before?.tx, repeater.tx && repeater.tx.at >= since ? repeater.tx.snr : null),
      lastHeard: repeater.lastHeard
    }
  })
}

export function fillFromContacts(repeaters: SessionRepeater[], contacts: readonly MeshCoreContact[]): SessionRepeater[] {
  const known = contacts.filter(contact => contact.type === ADV_TYPE_REPEATER).map(contact => ({ contact, id: toHex(contact.publicKey) }))
  return repeaters.map((repeater) => {
    if (repeater.name && repeater.position) return repeater
    const matches = known.filter(({ id }) => id.startsWith(repeater.id))
    if (matches.length !== 1) return repeater
    const { contact } = matches[0]!
    return { ...repeater, name: repeater.name ?? (contact.advName || null), position: repeater.position ?? toPosition(contact.advLat, contact.advLon) }
  })
}

export function isSessionOver(session: Session | null, now: number): boolean {
  return !session || now - session.endedAt > SESSION_GAP_MS
}

export function sessionDistance(scans: readonly SessionScan[]): number {
  const positions = scans.flatMap(scan => scan.position ? [scan.position] : [])
  return positions.slice(1).reduce((total, position, i) => total + distanceMeters(positions[i]!, position), 0)
}

export function mainLevel(scans: readonly SessionScan[]): CoverageLevel | null {
  const counts = new Map<CoverageLevel, number>()
  for (const { level } of scans) counts.set(level, (counts.get(level) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

export function keepLatest(sessions: readonly Session[], session: Session, max: number): { kept: Session[], dropped: Session[] } {
  const all = [session, ...sessions.filter(other => other.startedAt !== session.startedAt)].sort((a, b) => b.startedAt - a.startedAt)
  return { kept: all.slice(0, max), dropped: all.slice(max) }
}
