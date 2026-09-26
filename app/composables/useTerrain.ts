const lastGrounds = new Map<string, number[]>()
const open = ref(false)
const heights = ref<{ you: number, repeaters: Record<string, number> }>({ you: DEFAULT_YOUR_ANTENNA_M, repeaters: {} })
let restored = false

export function groundBetween(from: Position, to: Position): number[] | null | undefined {
  const ground = pathPositions(from, to).map(elevationAt)
  if (ground.includes(null)) return null
  const key = `${to.lat},${to.lon}`
  if (ground.includes(undefined)) return lastGrounds.get(key)
  lastGrounds.set(key, ground as number[])
  return ground as number[]
}

function readHeights() {
  try {
    const value = JSON.parse(localStorage.getItem(ANTENNA_HEIGHTS_STORAGE_KEY) ?? 'null')
    return typeof value?.you === 'number' && value.repeaters && typeof value.repeaters === 'object' ? value : null
  }
  catch {
    return null
  }
}

watch(heights, (value) => {
  try {
    localStorage.setItem(ANTENNA_HEIGHTS_STORAGE_KEY, JSON.stringify(value))
  }
  catch {
    // Stays for this visit only.
  }
})

export function useTerrain() {
  if (!restored && import.meta.client) {
    restored = true
    heights.value = readHeights() ?? heights.value
  }
  return { open, heights }
}
