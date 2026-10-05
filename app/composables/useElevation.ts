// Ground elevation of positions, rounded to about 100 m, kept for the session
// and looked up in batches. Undefined while looking up, null when it failed.
const elevations = reactive(new Map<string, number | null>())
const requested = new Set<string>()
const queue: string[] = []
let flushTimer: ReturnType<typeof setTimeout> | undefined
export const elevationThrottled = ref(false)

watch(elevationThrottled, () => showToast('quota.reached', 'warning'), { once: true })

// The API takes up to 100 points per call.
const BATCH_SIZE = 100

function keyOf(position: Position): string {
  return `${position.lat.toFixed(3)},${position.lon.toFixed(3)}`
}

async function flush() {
  flushTimer = undefined
  const keys = queue.splice(0, BATCH_SIZE)
  if (queue.length) flushTimer = setTimeout(flush)
  const points = keys.map(key => key.split(','))
  try {
    const response = await fetch(`${ELEVATION_API_URL}?latitude=${points.map(([lat]) => lat).join(',')}&longitude=${points.map(([, lon]) => lon).join(',')}`).catch(() => null)
    elevationThrottled.value = response?.status === 429
    if (!response?.ok) throw new Error(`Elevation lookup failed with ${response?.status}.`)
    const { elevation } = await response.json() as { elevation: number[] }
    keys.forEach((key, i) => elevations.set(key, elevation[i] ?? null))
  }
  catch {
    keys.forEach(key => elevations.set(key, null))
    // Offline or throttled for now, asked again on a later render.
    setTimeout(() => keys.filter(key => elevations.get(key) === null).forEach(key => requested.delete(key)), ELEVATION_RETRY_MS)
  }
}

export function retryElevations() {
  for (const [key, elevation] of elevations) {
    if (elevation !== null) continue
    elevations.delete(key)
    requested.delete(key)
  }
}

export function elevationAt(position: Position): number | null | undefined {
  const key = keyOf(position)
  if (!requested.has(key)) {
    requested.add(key)
    queue.push(key)
    // Lets the positions asked for in the same tick share one call.
    flushTimer ??= setTimeout(flush)
  }
  return elevations.get(key)
}
