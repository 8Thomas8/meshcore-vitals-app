import { describe, expect, it } from 'vitest'
import type { HeardRepeater } from '~/utils/constants'
import { SESSION_GAP_MS } from '~/utils/constants'
import type { Session, SessionRepeater, SessionScan } from '~/utils/history'
import { copyPosition, fillFromContacts, isSessionOver, keepLatest, mainLevel, sessionDistance, summarizeRepeaters } from '~/utils/history'

function heard(overrides: Partial<HeardRepeater> = {}): HeardRepeater {
  return { id: 'aabb', name: 'Alpha', position: null, hops: 0, via: null, lastVia: null, rx: null, history: [], tx: null, lastHeard: 1000, ...overrides }
}

function session(startedAt: number, overrides: Partial<Session> = {}): Session {
  return { startedAt, endedAt: startedAt, companionName: null, spreadingFactor: 10, repeaters: [], scans: [], ...overrides }
}

function scan(at: number, level: SessionScan['level'], position: SessionScan['position'] = null): SessionScan {
  return { at, position, level, usable: 0 }
}

describe('summarizeRepeaters', () => {
  it('keeps the best SNR heard since the session started', () => {
    const repeater = heard({
      history: [{ snr: 9, rssi: -80, at: 100 }, { snr: 3, rssi: -90, at: 600 }, { snr: 5, rssi: -85, at: 700 }],
      tx: { snr: -2, at: 700 }
    })
    expect(summarizeRepeaters([], [repeater], 500)).toEqual([
      { id: 'aabb', name: 'Alpha', position: null, hops: 0, via: null, rx: 5, tx: -2, lastHeard: 1000 }
    ])
  })

  it('does not lose a better value saved before', () => {
    const before: SessionRepeater = { id: 'aa', name: 'Alpha', position: { lat: 1, lon: 2 }, hops: 0, via: null, rx: 8, tx: 4, lastHeard: 500 }
    const [summary] = summarizeRepeaters([before], [heard({ name: null, history: [{ snr: 2, rssi: -90, at: 900 }], tx: { snr: 6, at: 900 } })], 0)
    expect(summary).toMatchObject({ id: 'aabb', name: 'Alpha', position: { lat: 1, lon: 2 }, rx: 8, tx: 6 })
  })

  it('keeps the saved TX when the last one predates the session', () => {
    const before: SessionRepeater = { id: 'aabb', name: 'Alpha', position: null, hops: 0, via: null, rx: null, tx: 4, lastHeard: 900 }
    const [summary] = summarizeRepeaters([before], [heard({ tx: { snr: 9, at: 100 } })], 500)
    expect(summary!.tx).toBe(4)
  })

  it('leaves out the repeaters not heard since the session started', () => {
    expect(summarizeRepeaters([], [heard({ lastHeard: 100 })], 500)).toEqual([])
  })

  it('stores plain positions', () => {
    const position = { lat: 44.9, lon: 4.9 }
    const [summary] = summarizeRepeaters([], [heard({ position })], 0)
    expect(summary!.position).toEqual(position)
    expect(summary!.position).not.toBe(position)
  })
})

describe('copyPosition', () => {
  it('keeps an unknown position unknown', () => {
    expect(copyPosition(null)).toBeNull()
  })
})

describe('fillFromContacts', () => {
  const contact = { publicKey: Uint8Array.from([0xaa, 0xbb, 0xcc]), type: 2, advName: 'Alpha', advLat: 44_900_000, advLon: 4_900_000 } as MeshCoreContact
  const repeater: SessionRepeater = { id: 'aabb', name: null, position: null, hops: 0, via: null, rx: null, tx: null, lastHeard: 0 }

  it('takes the name and position of the matching contact', () => {
    expect(fillFromContacts([repeater], [contact])[0]).toMatchObject({ name: 'Alpha', position: { lat: 44.9, lon: 4.9 } })
  })

  it('keeps what the advert gave', () => {
    expect(fillFromContacts([{ ...repeater, name: 'Own' }], [contact])[0]!.name).toBe('Own')
  })

  it('ignores contacts that are not repeaters or match several', () => {
    expect(fillFromContacts([repeater], [{ ...contact, type: 1 }])[0]!.name).toBeNull()
    expect(fillFromContacts([repeater], [contact, contact])[0]!.name).toBeNull()
  })
})

describe('isSessionOver', () => {
  it('starts a session when there is none', () => {
    expect(isSessionOver(null, 0)).toBe(true)
  })

  it('ends a session after a long pause', () => {
    expect(isSessionOver(session(0, { endedAt: 1000 }), 1000 + SESSION_GAP_MS)).toBe(false)
    expect(isSessionOver(session(0, { endedAt: 1000 }), 1001 + SESSION_GAP_MS)).toBe(true)
  })
})

describe('sessionDistance', () => {
  it('adds up the way between the scans with a position', () => {
    const scans = [scan(0, 'good', { lat: 45, lon: 5 }), scan(1, 'good'), scan(2, 'fair', { lat: 45.01, lon: 5 })]
    expect(sessionDistance(scans)).toBeCloseTo(1112, 0)
  })

  it('is zero without positions', () => {
    expect(sessionDistance([scan(0, 'good')])).toBe(0)
  })
})

describe('mainLevel', () => {
  it('takes the most frequent level', () => {
    expect(mainLevel([scan(0, 'fair'), scan(1, 'good'), scan(2, 'good')])).toBe('good')
  })

  it('is unknown without scans', () => {
    expect(mainLevel([])).toBeNull()
  })
})

describe('keepLatest', () => {
  it('replaces the saved copy and keeps the newest first', () => {
    const { kept, dropped } = keepLatest([session(3), session(2), session(1)], session(2, { endedAt: 9 }), 5)
    expect(kept.map(s => s.startedAt)).toEqual([3, 2, 1])
    expect(kept[1]!.endedAt).toBe(9)
    expect(dropped).toEqual([])
  })

  it('drops the oldest beyond the limit', () => {
    const { kept, dropped } = keepLatest([session(2), session(1)], session(3), 2)
    expect(kept.map(s => s.startedAt)).toEqual([3, 2])
    expect(dropped.map(s => s.startedAt)).toEqual([1])
  })
})
