// Module scope so every page shares the one Bluetooth link. It is only ever
// written on the client.
const connection = shallowRef<MeshCoreConnection | null>(null)
const status = ref<ConnectionStatus>('disconnected')
const error = ref<string | null>(null)
const retrying = ref(false)
let attempts = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined

// open() returns before the GATT link is up, and a failed link emits nothing,
// hence the timeout.
function waitUntilConnected(conn: MeshCoreConnection) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('errors.connectTimeout')), CONNECT_TIMEOUT_MS)
    conn.on('connected', () => {
      clearTimeout(timer)
      resolve()
    })
    conn.on('disconnected', () => {
      clearTimeout(timer)
      reject(new Error('errors.disconnectedWhileConnecting'))
    })
  })
}

function advertised(device: MeshCoreBleDevice) {
  const controller = new AbortController()
  const watching = device.watchAdvertisements?.({ signal: controller.signal })
  if (!watching) return
  return withTimeout(new Promise<void>((resolve) => {
    device.addEventListener('advertisementreceived', () => resolve(), { once: true })
    watching.catch(() => resolve())
  }), CONNECT_TIMEOUT_MS, 'errors.unreachable').finally(() => controller.abort())
}

async function connect(device = connection.value?.bleDevice) {
  if (status.value === 'connecting') return
  const lost = connection.value
  error.value = null
  status.value = 'connecting'
  let conn: MeshCoreConnection | null | undefined
  try {
    const { default: WebBleConnection } = await import('@liamcottle/meshcore.js/src/connection/web_ble_connection.js')
    if (device && !lost) await advertised(device)
    if (device) await withTimeout(device.gatt.connect(), CONNECT_TIMEOUT_MS, 'errors.connectTimeout')
    conn = device ? new WebBleConnection(device) : await WebBleConnection.open()
    if (!conn) {
      status.value = 'disconnected'
      return
    }
    conn.sendToRadioFrame = oneAtATime(conn.sendToRadioFrame.bind(conn))
    await waitUntilConnected(conn)
    if (connection.value !== lost) {
      await conn.close()
      return
    }
    conn.on('disconnected', () => {
      if (connection.value === conn) status.value = 'lost'
    })
    connection.value = conn
    status.value = 'connected'
    useRepeaters().start(conn, !!lost)
  }
  catch (e) {
    if (connection.value !== lost) return
    (conn?.bleDevice ?? device)?.gatt.disconnect()
    status.value = connection.value ? 'lost' : 'disconnected'
    // Dismissing the device picker rejects with NotFoundError.
    if (!(e instanceof DOMException && e.name === 'NotFoundError')) {
      error.value = e instanceof DOMException ? 'errors.unreachable' : e instanceof Error ? e.message : String(e)
      if (!lost) showToast(error.value)
    }
  }
}

async function disconnect() {
  await connection.value?.close()
  connection.value = null
  status.value = 'disconnected'
  error.value = null
}

function retry() {
  if (document.hidden) {
    retryTimer = setTimeout(retry, RECONNECT_DELAY_MS)
    return
  }
  connect()
}

watch(status, (value) => {
  clearTimeout(retryTimer)
  if (value === 'connected' || value === 'disconnected') attempts = 0
  retrying.value = value === 'connecting' || (value === 'lost' && attempts < RECONNECT_ATTEMPTS)
  if (value === 'lost' && retrying.value) retryTimer = setTimeout(retry, RECONNECT_DELAY_MS * 2 ** attempts++)
})

export function useMeshCore() {
  return {
    connection: shallowReadonly(connection),
    status: readonly(status),
    error: readonly(error),
    retrying: readonly(retrying),
    connect,
    disconnect
  }
}
