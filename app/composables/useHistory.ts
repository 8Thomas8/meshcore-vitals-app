import { useThrottleFn } from '@vueuse/core'
import type { DeepReadonly } from 'vue'

const sessions = shallowRef<Session[]>([])
let current: Session | null = null
let connectedAt = 0
let database: Promise<IDBDatabase> | null = null
let started = false

function open() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(HISTORY_DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(HISTORY_STORE, { keyPath: 'startedAt' })
    request.onsuccess = () => {
      const db = request.result
      db.onclose = () => {
        database = null
      }
      db.onversionchange = () => {
        db.close()
        database = null
      }
      resolve(db)
    }
    request.onerror = () => reject(request.error)
  }).catch((error) => {
    database = null
    throw error
  })
  return database
}

async function transact(mode: IDBTransactionMode, run: (store: IDBObjectStore) => void) {
  const db = await open()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(HISTORY_STORE, mode)
    run(transaction.objectStore(HISTORY_STORE))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

async function load() {
  let all: Session[] = []
  await transact('readonly', (store) => {
    const request = store.getAll()
    request.onsuccess = () => {
      all = request.result
    }
  })
  const known = new Set(sessions.value.map(session => session.startedAt))
  sessions.value = [...sessions.value, ...all.filter(session => !known.has(session.startedAt))]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, HISTORY_MAX_SESSIONS)
}

async function save(session: Session) {
  const { kept, dropped } = keepLatest(sessions.value, session, HISTORY_MAX_SESSIONS)
  sessions.value = kept
  await transact('readwrite', (store) => {
    store.put(session)
    for (const old of dropped) store.delete(old.startedAt)
  })
}

async function remove(startedAt: number) {
  sessions.value = sessions.value.filter(session => session.startedAt !== startedAt)
  if (current?.startedAt === startedAt) {
    current = null
    connectedAt = Date.now()
  }
  await transact('readwrite', store => store.delete(startedAt))
}

function record(scan?: SessionScan) {
  const { repeaters, selfInfo, contacts } = useRepeaters()
  const now = Date.now()
  if (isSessionOver(current, now)) {
    const since = current
      ? Math.min(scan?.at ?? Infinity, ...repeaters.value.filter(repeater => repeater.lastHeard > current!.endedAt).map(repeater => repeater.lastHeard))
      : connectedAt
    if (!Number.isFinite(since)) return
    current = { startedAt: since, endedAt: since, companionName: null, spreadingFactor: null, repeaters: [], scans: [] }
  }
  const session = current!
  const summary = fillFromContacts(summarizeRepeaters(session.repeaters, repeaters.value, session.startedAt), contacts.value)
  if (!summary.length && !scan) return
  current = {
    ...session,
    endedAt: Math.max(session.endedAt, ...summary.map(repeater => repeater.lastHeard), scan?.at ?? 0),
    companionName: selfInfo.value?.name ?? session.companionName,
    spreadingFactor: selfInfo.value?.radioSf ?? session.spreadingFactor,
    repeaters: summary,
    scans: scan ? [...session.scans, scan] : session.scans
  }
  if (current.scans.length) save(current).catch(() => {})
}

function addScan(position: DeepReadonly<Position> | null, level: CoverageLevel, usable: number) {
  record({ at: Date.now(), position: copyPosition(position), level, usable })
}

function start() {
  if (started) return
  started = true
  navigator.storage?.persist?.().catch(() => {})
  load().catch(() => {})
  const { connection } = useMeshCore()
  const { repeaters } = useRepeaters()
  watch(connection, (_, previous) => {
    if (previous) record()
    current = null
    connectedAt = Date.now()
  }, { immediate: true })
  const throttled = useThrottleFn(() => record(), HISTORY_SAVE_MS, true)
  watch(() => Math.max(0, ...repeaters.value.map(repeater => repeater.lastHeard)), throttled)
  window.addEventListener('pagehide', () => record())
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) record()
  })
}

export function useHistory() {
  return {
    sessions: shallowReadonly(sessions),
    start,
    addScan,
    remove
  }
}
