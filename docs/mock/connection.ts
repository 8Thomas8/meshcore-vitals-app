import { ADV_TYPE_REPEATER, CMD_SEND_CONTROL_DATA, CTL_NODE_DISCOVER_REQ, CTL_NODE_DISCOVER_RESP, PUSH_CONTROL_DATA, PUSH_LOG_RX_DATA, RESP_OK } from '../../app/utils/constants'
import { around, COMPANION, HERE, keyOf, REPEATERS } from './data'
import type { MockRepeater } from './data'

type Handler = (payload: unknown) => void

const ROUTE_FLOOD = 1
const PAYLOAD_TXT_MSG = 2
const PAYLOAD_ADVERT = 4
const TRAFFIC_MS = 20_000
const ADVERT_HAS_POSITION = 0x10
const ADVERT_HAS_NAME = 0x80

function discoverResponse(repeater: MockRepeater, tag: Uint8Array): Uint8Array {
  const frame = new Uint8Array(4 + 6 + 32)
  frame[0] = PUSH_CONTROL_DATA
  frame[1] = (repeater.rx! * 4) & 0xff
  frame[2] = (-90 + repeater.rx!) & 0xff
  frame[4] = CTL_NODE_DISCOVER_RESP | ADV_TYPE_REPEATER
  frame[5] = (repeater.tx! * 4) & 0xff
  frame.set(tag, 6)
  frame.set(keyOf(repeater.name), 10)
  return frame
}

function relayedAdvert(repeater: MockRepeater): Uint8Array {
  const name = new TextEncoder().encode(repeater.name)
  const raw = new Uint8Array(3 + 101 + 8 + name.length)
  raw[0] = PAYLOAD_ADVERT << 2 | ROUTE_FLOOD
  raw[1] = 1
  raw[2] = keyOf(repeater.via!)[0]!
  raw.set(keyOf(repeater.name), 3)
  raw[103] = ADV_TYPE_REPEATER | ADVERT_HAS_POSITION | ADVERT_HAS_NAME
  const { lat, lon } = around(repeater.bearing, repeater.km)
  const view = new DataView(raw.buffer)
  view.setInt32(104, Math.round(lat * 1e6), true)
  view.setInt32(108, Math.round(lon * 1e6), true)
  raw.set(name, 112)
  return raw
}

function relayedPacket(repeater: MockRepeater): Uint8Array {
  return Uint8Array.from([PAYLOAD_TXT_MSG << 2 | ROUTE_FLOOD, 1, keyOf(repeater.name)[0]!, 0, 0, 0, 0])
}

function stats<T>(type: number, data: T) {
  return async () => ({ type, raw: new Uint8Array(), data })
}

export default class MockConnection {
  bleDevice = Object.assign(new EventTarget(), { id: 'docs-mock', name: COMPANION.name, gatt: { connect: async () => {}, disconnect() {} } })
  private handlers = new Map<number | string, Set<Handler>>()
  private traffic: ReturnType<typeof setInterval> | undefined
  private ticks = 0

  static async open() {
    const connection = new MockConnection()
    setTimeout(() => connection.emit('connected', undefined), 200)
    connection.traffic = setInterval(() => connection.hear(), TRAFFIC_MS)
    return connection
  }

  private hear() {
    this.ticks++
    REPEATERS.filter(repeater => !repeater.via).forEach((repeater, i) => {
      const snr = repeater.rx! + Math.round(Math.sin(this.ticks + i) * 6) / 4
      this.emit(PUSH_LOG_RX_DATA, { lastSnr: snr, lastRssi: Math.round(-90 + snr), raw: relayedPacket(repeater) })
    })
  }

  on(event: number | string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
  }

  off(event: number | string, handler: Handler) {
    this.handlers.get(event)?.delete(handler)
  }

  private emit(event: number | string, payload: unknown) {
    for (const handler of [...this.handlers.get(event) ?? []]) handler(payload)
  }

  async close() {
    clearInterval(this.traffic)
    this.emit('disconnected', undefined)
  }

  async sendToRadioFrame(frame: Uint8Array) {
    setTimeout(() => this.emit('rx', new Uint8Array([RESP_OK])), 50)
    if (frame[0] !== CMD_SEND_CONTROL_DATA || frame[1] !== CTL_NODE_DISCOVER_REQ) return
    const tag = frame.slice(3, 7)
    REPEATERS.forEach((repeater, i) => setTimeout(() => {
      const via = REPEATERS.find(other => other.name === repeater.via)
      if (via) this.emit(PUSH_LOG_RX_DATA, { lastSnr: via.rx, lastRssi: -90 + via.rx!, raw: relayedAdvert(repeater) })
      else this.emit('rx', discoverResponse(repeater, tag))
    }, 300 + i * 250))
  }

  deviceQuery = async () => ({ firmwareVer: 8, reserved: new Uint8Array(), firmware_build_date: '12-Sep-2026', manufacturerModel: 'Heltec V3\0v1.9.0' })
  getDeviceTime = async () => ({ epochSecs: Math.floor(Date.now() / 1000) })
  getStatsCore = stats(0, { batteryMilliVolts: 3980, uptimeSecs: 12_300, queueLen: 0 })
  getStatsRadio = stats(1, { noiseFloor: -112, lastRssi: -84, lastSnr: 7.5, txAirSecs: 46, rxAirSecs: 1310 })
  getStatsPackets = stats(2, { recv: 1843, sent: 212, nSentFlood: 148, nSentDirect: 64, nRecvFlood: 1590, nRecvDirect: 253, nRecvErrors: 21 })

  getSelfInfo = async () => ({ type: 1, txPower: 22, maxTxPower: 22, publicKey: new Uint8Array(32).fill(0xc0), advLat: Math.round(HERE.lat * 1e6), advLon: Math.round(HERE.lon * 1e6), manualAddContacts: 0, radioFreq: 869525, radioBw: 250000, radioSf: COMPANION.spreadingFactor, radioCr: 5, name: COMPANION.name })

  async getContacts() {
    return REPEATERS.filter(repeater => !repeater.via).map((repeater) => {
      const { lat, lon } = around(repeater.bearing, repeater.km)
      return { publicKey: keyOf(repeater.name), type: ADV_TYPE_REPEATER, flags: 0, outPathLen: 0, outPath: new Uint8Array(), advName: repeater.name, lastAdvert: Math.floor(Date.now() / 1000), advLat: Math.round(lat * 1e6), advLon: Math.round(lon * 1e6), lastMod: 0 }
    })
  }

  tracePath = () => Promise.reject()
}
