import type { Map as MapLibreMap } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { CoverageLevel, Position } from './constants'
import { COVERAGE_GOOD_USABLE, COVERAGE_TONES, MAP_CREDIT, MAP_MAX_ZOOM, MAP_MUTED_COLOR, MAP_STYLE_URL, SHARE_JPEG_QUALITY, SHARE_MAP_TIMEOUT_MS, SHARE_ROWS, SITE_URL, THEME_COLORS } from './constants'
import { withTimeout } from './timeout'
import { freePlacement, labelPlacements, paintDark, pointBox } from './map'
import type { Box, ScreenPoint } from './map'

interface ShareRepeater {
  id: string
  name: string
  route: string
  position: Position | null
  hops: number
  via: string | null
  color: string
  rx: { text: string, color: string | null } | null
  tx: { text: string, color: string | null } | null
}

export interface ShareScan {
  here: Position | null
  track: { position: Position, color: string }[]
  repeaters: ShareRepeater[]
  level: CoverageLevel
  usable: number
  title: string
  subtitle: string
  date: string
  more: string | null
  tagline: string
}

const WIDTH = 1080
const MAP_HEIGHT = 760
const NO_MAP_HEIGHT = 140
const MAP_SCALE = 2
const MAP_PADDING = { top: 90, bottom: 110, left: 70, right: 70 }
const FADE_HEIGHT = 200
const HEADER_HEIGHT = 160
const ROW_HEIGHT = 96
const MORE_HEIGHT = 64
const LIST_OFFSET = 130
const FOOTER_HEIGHT = 170
const LABEL_HEIGHT = 44
const LABEL_GAP = 24
const LABEL_MAX_WIDTH = 320
const TEXT = THEME_COLORS['on-surface']
const MEDIUM = `${TEXT}b3`
const FAINT = `${TEXT}99`
const LINE = `${TEXT}14`
const SANS = '"IBM Plex Sans", sans-serif'
const MONO = '"IBM Plex Mono", monospace'

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
<g stroke="${THEME_COLORS.primary}" stroke-opacity="0.35" stroke-width="1.5"><path d="M12 16 L32 10 L52 18 M12 16 L14 50 L50 48 L52 18 M32 10 L32 54"/></g>
<g fill="${THEME_COLORS.primary}" fill-opacity="0.6"><circle cx="12" cy="16" r="2.5"/><circle cx="32" cy="10" r="2.5"/><circle cx="52" cy="18" r="2.5"/><circle cx="14" cy="50" r="2.5"/><circle cx="50" cy="48" r="2.5"/></g>
<path d="M4 34 H18 L23 24 L30 46 L37 16 L43 34 H60" stroke="${THEME_COLORS.primary}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="60" cy="34" r="3.5" fill="${THEME_COLORS.success}"/></svg>`

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

async function captureMap(points: [number, number][]): Promise<{ image: HTMLCanvasElement, project: (lngLat: [number, number]) => ScreenPoint } | null> {
  const { Map: MapLibre, setWorkerUrl } = await import('maplibre-gl')
  setWorkerUrl(workerUrl)
  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH / MAP_SCALE}px;height:${MAP_HEIGHT / MAP_SCALE}px`
  container.setAttribute('aria-hidden', 'true')
  document.body.append(container)
  let map: MapLibreMap | undefined
  try {
    map = new MapLibre({
      container,
      style: MAP_STYLE_URL,
      interactive: false,
      attributionControl: false,
      pixelRatio: MAP_SCALE,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true }
    })
    const loaded = map
    await withTimeout(new Promise<void>((resolve, reject) => {
      const fail = ({ error }: { error: unknown }) => reject(error)
      loaded.on('error', fail)
      loaded.once('load', () => {
        loaded.off('error', fail)
        paintDark(loaded)
        const lons = points.map(([lon]) => lon)
        const lats = points.map(([, lat]) => lat)
        loaded.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], {
          padding: MAP_PADDING,
          maxZoom: MAP_MAX_ZOOM,
          duration: 0
        })
        loaded.once('idle', () => resolve())
      })
    }), SHARE_MAP_TIMEOUT_MS)
    const image = document.createElement('canvas')
    image.width = WIDTH
    image.height = MAP_HEIGHT
    image.getContext('2d')!.drawImage(loaded.getCanvas(), 0, 0, WIDTH, MAP_HEIGHT)
    const project = (lngLat: [number, number]): ScreenPoint => {
      const { x, y } = loaded.project(lngLat)
      return [x * MAP_SCALE, y * MAP_SCALE]
    }
    const projected = new Map(points.map(point => [point.join(), project(point)]))
    return { image, project: lngLat => projected.get(lngLat.join())! }
  }
  catch {
    return null
  }
  finally {
    map?.remove()
    container.remove()
  }
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath()
  if (context.roundRect) context.roundRect(x, y, width, height, radius)
  else context.rect(x, y, width, height)
}

export function fitText(context: CanvasRenderingContext2D, text: string, width: number): string {
  if (context.measureText(text).width <= width) return text
  const characters = Array.from(text)
  while (characters.length > 1 && context.measureText(`${characters.join('')}…`).width > width) characters.pop()
  return `${characters.join('')}…`
}

function drawDot(context: CanvasRenderingContext2D, [x, y]: ScreenPoint, radius: number, color: string, stroke: number) {
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fillStyle = color
  context.fill()
  context.lineWidth = stroke
  context.strokeStyle = TEXT
  context.stroke()
}

function drawLinks(context: CanvasRenderingContext2D, here: ScreenPoint | null, placed: ShareRepeater[], at: (position: Position) => ScreenPoint): [ScreenPoint, ScreenPoint][] {
  const links: [ScreenPoint, ScreenPoint][] = []
  context.lineWidth = 4
  context.globalAlpha = 0.75
  for (const repeater of placed) {
    const through = repeater.via ? placed.filter(other => !other.hops && other.id.startsWith(repeater.via!)) : []
    const source = repeater.hops ? through.length === 1 ? through[0]! : null : repeater
    const from = repeater.hops ? source && at(source.position!) : here
    if (!from || !source) continue
    const to = at(repeater.position!)
    context.setLineDash(repeater.hops ? [10, 10] : [])
    context.strokeStyle = source.color
    context.beginPath()
    context.moveTo(...from)
    context.lineTo(...to)
    context.stroke()
    links.push([from, to])
  }
  context.setLineDash([])
  context.globalAlpha = 1
  return links
}

function drawLabels(context: CanvasRenderingContext2D, placed: ShareRepeater[], at: (position: Position) => ScreenPoint, taken: Box[], links: [ScreenPoint, ScreenPoint][]) {
  const view: Box = { left: 16, top: HEADER_HEIGHT, right: WIDTH - 16, bottom: MAP_HEIGHT - 60 }
  const height = LABEL_HEIGHT
  context.font = `500 26px ${SANS}`
  context.textBaseline = 'middle'
  for (const repeater of placed) {
    const text = fitText(context, repeater.name, LABEL_MAX_WIDTH)
    const width = context.measureText(text).width + 28
    const place = freePlacement(labelPlacements(at(repeater.position!), width, height, LABEL_GAP, view), taken, links, view)
    if (!place) continue
    taken.push(place.box)
    const { left, top } = place.box
    roundRect(context, left, top, width, height, 12)
    context.fillStyle = `${THEME_COLORS.surface}e0`
    context.fill()
    context.lineWidth = 2
    context.strokeStyle = `${TEXT}1f`
    context.stroke()
    context.fillStyle = TEXT
    context.fillText(text, left + 14, top + height / 2 + 1)
  }
}

function drawTrack(context: CanvasRenderingContext2D, track: ShareScan['track'], at: (position: Position) => ScreenPoint): [ScreenPoint, ScreenPoint][] {
  const segments = track.slice(1).map((scan, i): [ScreenPoint, ScreenPoint] => [at(track[i]!.position), at(scan.position)])
  context.lineWidth = 8
  context.lineCap = 'round'
  segments.forEach(([from, to], i) => {
    context.strokeStyle = track[i + 1]!.color
    context.beginPath()
    context.moveTo(...from)
    context.lineTo(...to)
    context.stroke()
  })
  context.lineCap = 'butt'
  for (const scan of track) {
    context.beginPath()
    context.arc(...at(scan.position), 6, 0, Math.PI * 2)
    context.fillStyle = scan.color
    context.fill()
  }
  return segments
}

function drawMesh(context: CanvasRenderingContext2D, scan: ShareScan, project: (lngLat: [number, number]) => ScreenPoint) {
  const placed = scan.repeaters.filter(repeater => repeater.position)
  const at = (position: Position) => project([position.lon, position.lat])
  const here = scan.here && at(scan.here)
  const links = [...drawTrack(context, scan.track, at), ...drawLinks(context, here, placed, at)]
  const taken: Box[] = []
  for (const repeater of placed) {
    const point = at(repeater.position!)
    drawDot(context, point, 12, repeater.color, 4)
    taken.push(pointBox(point, 18))
  }
  if (here) {
    context.beginPath()
    context.arc(...here, 34, 0, Math.PI * 2)
    context.fillStyle = `${THEME_COLORS.primary}33`
    context.fill()
    drawDot(context, here, 16, THEME_COLORS.primary, 5)
    taken.push(pointBox(here, 22))
  }
  drawLabels(context, placed, at, taken, links)
}

function drawRing(context: CanvasRenderingContext2D, x: number, y: number, scan: ShareScan) {
  const color = THEME_COLORS[COVERAGE_TONES[scan.level]]
  const radius = 46
  context.lineWidth = 10
  context.strokeStyle = `${color}33`
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.stroke()
  context.strokeStyle = color
  context.lineCap = 'round'
  context.beginPath()
  const share = Math.min(scan.usable, COVERAGE_GOOD_USABLE) / COVERAGE_GOOD_USABLE
  if (share) {
    context.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2)
    context.stroke()
  }
  context.lineCap = 'butt'
  context.fillStyle = TEXT
  context.font = `500 40px ${MONO}`
  context.textAlign = 'center'
  context.fillText(String(scan.usable), x, y + 2)
  context.textAlign = 'left'
}

export async function renderShareImage(scan: ShareScan): Promise<Blob> {
  const texts = [scan.title, scan.subtitle, scan.date, ...scan.repeaters.flatMap(repeater => [repeater.name, repeater.route])].join(' ')
  await Promise.all([`500 32px ${SANS}`, `32px ${SANS}`, `500 32px ${MONO}`].map(font => document.fonts.load(font, texts).catch(() => [])))
  const positions = [...scan.repeaters.flatMap(repeater => repeater.position ? [repeater.position] : []), ...scan.track.map(({ position }) => position), ...scan.here ? [scan.here] : []]
  const points = positions.map(({ lon, lat }): [number, number] => [lon, lat])
  const [map, logo] = await Promise.all([points.length ? captureMap(points) : null, loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO)}`)])
  const shown = scan.repeaters.slice(0, SHARE_ROWS)
  const mapHeight = map ? MAP_HEIGHT : NO_MAP_HEIGHT
  const listTop = mapHeight + LIST_OFFSET
  const listHeight = shown.length * ROW_HEIGHT + (scan.more ? MORE_HEIGHT : 0)
  const height = listTop + listHeight + FOOTER_HEIGHT
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = height
  const context = canvas.getContext('2d')!
  context.fillStyle = THEME_COLORS.background
  context.fillRect(0, 0, WIDTH, height)

  if (map) {
    context.drawImage(map.image, 0, 0)
    map.image.width = 0
    const fade = context.createLinearGradient(0, mapHeight - FADE_HEIGHT, 0, mapHeight)
    fade.addColorStop(0, `${THEME_COLORS.background}00`)
    fade.addColorStop(1, THEME_COLORS.background)
    context.fillStyle = fade
    context.fillRect(0, mapHeight - FADE_HEIGHT, WIDTH, FADE_HEIGHT)
    const top = context.createLinearGradient(0, 0, 0, HEADER_HEIGHT)
    top.addColorStop(0, `${THEME_COLORS.background}d9`)
    top.addColorStop(1, `${THEME_COLORS.background}00`)
    context.fillStyle = top
    context.fillRect(0, 0, WIDTH, HEADER_HEIGHT)
    drawMesh(context, scan, map.project)
  }

  context.drawImage(logo, 40, 32, 72, 72)
  context.textBaseline = 'middle'
  context.fillStyle = TEXT
  context.font = `500 36px ${SANS}`
  context.fillText('MeshCore Vitals', 128, 58)
  context.font = `24px ${SANS}`
  context.fillStyle = MEDIUM
  context.fillText(scan.date, 128, 92)

  const cardTop = mapHeight - 40
  drawRing(context, 100, cardTop + 70, scan)
  context.textBaseline = 'middle'
  context.fillStyle = THEME_COLORS[COVERAGE_TONES[scan.level]]
  context.font = `500 48px ${SANS}`
  context.fillText(fitText(context, scan.title, WIDTH - 240), 180, cardTop + 50)
  context.fillStyle = MEDIUM
  context.font = `28px ${SANS}`
  context.fillText(fitText(context, scan.subtitle, WIDTH - 240), 180, cardTop + 98)

  roundRect(context, 32, listTop - 20, WIDTH - 64, listHeight + 20, 28)
  context.fillStyle = THEME_COLORS.surface
  context.fill()
  context.lineWidth = 2
  context.strokeStyle = LINE
  context.stroke()
  shown.forEach((repeater, i) => {
    const y = listTop + i * ROW_HEIGHT + ROW_HEIGHT / 2 - 10
    if (i) {
      context.fillStyle = LINE
      context.fillRect(64, y - ROW_HEIGHT / 2, WIDTH - 128, 2)
    }
    drawDot(context, [80, y], 12, repeater.color, 3)
    const signal = repeater.rx || repeater.tx
    const textWidth = signal ? 520 : 840
    context.fillStyle = TEXT
    context.font = `500 32px ${SANS}`
    context.fillText(fitText(context, repeater.name, textWidth), 116, y - 18)
    context.fillStyle = FAINT
    context.font = `24px ${SANS}`
    context.fillText(fitText(context, repeater.route, textWidth), 116, y + 20)
    if (!signal) return
    context.textAlign = 'right'
    for (const [way, value, x] of [['RX', repeater.rx, WIDTH - 250], ['TX', repeater.tx, WIDTH - 72]] as const) {
      context.font = `500 32px ${MONO}`
      context.fillStyle = value?.color ?? FAINT
      context.fillText(value?.text ?? '–', x, y - 14)
      context.font = `20px ${SANS}`
      context.fillStyle = `${TEXT}80`
      context.fillText(`${way} dB`, x, y + 22)
    }
    context.textAlign = 'left'
  })
  if (scan.more) {
    context.font = `24px ${SANS}`
    context.fillStyle = FAINT
    context.fillText(scan.more, 116, listTop + shown.length * ROW_HEIGHT + 12)
  }

  const footer = height - 90
  context.font = `24px ${SANS}`
  context.fillStyle = MAP_MUTED_COLOR
  context.fillText(fitText(context, scan.tagline, 640), 40, footer)
  context.textAlign = 'right'
  context.fillStyle = THEME_COLORS.primary
  context.font = `500 26px ${SANS}`
  context.fillText(new URL(SITE_URL).host.replace(/^www\./, ''), WIDTH - 40, footer)
  context.textAlign = 'left'
  if (map) {
    context.font = `18px ${SANS}`
    context.fillStyle = FAINT
    context.fillText(fitText(context, MAP_CREDIT, WIDTH - 80), 40, footer + 44)
  }

  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    canvas.width = 0
    if (blob) resolve(blob)
    else reject(new Error('no image'))
  }, 'image/jpeg', SHARE_JPEG_QUALITY))
}
