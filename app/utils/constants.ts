import { mdiAccessPoint, mdiAlert, mdiAlertCircle, mdiCheckCircle, mdiHistory, mdiRadioTower } from '@mdi/js'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'lost'

export type Tone = 'success' | 'warning' | 'error'

export const TONE_ICONS = { success: mdiCheckCircle, warning: mdiAlert, error: mdiAlertCircle }

export type CoverageLevel = 'good' | 'fair' | 'weak' | 'none'

export interface CounterSample {
  at: number
  recv: number
  sent: number
  errors: number
  txAirSecs: number
}

export interface DeviceSummary {
  model: string | null
  version: string | null
  buildDate: string | null
}

export interface Position {
  lat: number
  lon: number
}

export interface CompanionFix {
  position: Position
  /** Metres, the radius the position is likely within. */
  accuracy: number
  /** When it came in, by this device's clock. */
  at: number
}

export interface LinkSample {
  /** dB. */
  snr: number
  at: number
}

export interface RxSample extends LinkSample {
  /** dBm. */
  rssi: number
}

export interface HeardRepeater {
  /** Public key in hex, or only its first bytes when heard through a path hash. */
  id: string
  name: string | null
  position: Position | null
  /** Fewest hops it was heard at, 0 in direct range. */
  hops: number
  /** Id of the repeater in direct range it was reached through. */
  via: string | null
  /** Id of the repeater in direct range it was last reached through. */
  lastVia: string | null
  /** How we hear it, RSSI in dBm, only in direct range. */
  rx: RxSample | null
  /** Every rx sample this session, oldest first. */
  history: RxSample[]
  /** How it hears us, only known from a scan. */
  tx: LinkSample | null
  lastHeard: number
}

export const SITE_URL = 'https://www.meshcore-vitals.com'

// OpenFreeMap's dark style, free and keyless. Its tiles, fonts and sprites come
// from the same host.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'

// Ground elevation from the Copernicus 90 m terrain model, free and keyless.
export const ELEVATION_API_URL = 'https://api.open-meteo.com/v1/elevation'
export const ELEVATION_RETRY_MS = 60_000

// Numbers are formatted this way outside a component, and until the language
// is known.
export const DEFAULT_LANGUAGE = 'en-US'

export const LOCALE_COOKIE = 'locale'
export const LOCALE_COOKIE_MAX_AGE_SECS = 365 * 86_400

export const REPOSITORY_URL = 'https://github.com/8Thomas8/meshcore-vitals-app'

export const SM_AND_DOWN_QUERY = '(max-width: 959.98px)'

export const NAV_ITEMS = [
  { title: 'nav.repeaters', to: '/', icon: mdiRadioTower },
  { title: 'nav.history', to: '/history', icon: mdiHistory },
  { title: 'nav.companion', to: '/companion', icon: mdiAccessPoint }
]

export const THEME_COLORS = {
  'background': '#0c121d',
  'surface': '#131c2b',
  'on-background': '#ffffff',
  'on-surface': '#ffffff',
  'primary': '#7cc4ff',
  'on-primary': '#0c121d',
  'success': '#5be49b',
  'warning': '#ffc857',
  'error': '#ff6b6b',
  'info': '#7cc4ff'
}

// The companion protocol version meshcore.js itself announces on connect.
export const APP_PROTOCOL_VERSION = 3

export const PUSH_LOG_RX_DATA = 0x88
export const ADV_TYPE_REPEATER = 2

// Companion protocol codes meshcore.js 1.15 does not know about.
export const RESP_OK = 0
export const RESP_ERR = 1
export const ERR_UNSUPPORTED_CMD = 1
export const CMD_SEND_CONTROL_DATA = 55
export const PUSH_CONTROL_DATA = 0x8e
export const CTL_NODE_DISCOVER_REQ = 0x80
export const CTL_NODE_DISCOVER_RESP = 0x90

// Repeaters delay their answer by up to a few seconds so they do not collide.
export const DISCOVER_WINDOW_MS = 30_000

// Half the 4 requests every 2 minutes each repeater answers, leaving the rest
// to everyone else scanning around.
export const AUTO_SCAN_INTERVAL_MS = 60_000

// Enough for an hour at one packet every 30 s.
export const MAX_RX_HISTORY = 120

// Whether the screen is kept on, remembered on this device. Off by default,
// it costs battery.
export const WAKE_LOCK_STORAGE_KEY = 'keep-screen-on'

export const LIST_MAX_HEIGHT_SHARE = 0.45

export const LIST_HIDDEN_STORAGE_KEY = 'repeaters-list-hidden'

export const LIST_FULL_STORAGE_KEY = 'repeaters-list-full'

export const HISTORY_DB_NAME = 'history'
export const HISTORY_STORE = 'sessions'
export const HISTORY_MAX_SESSIONS = 20
export const HISTORY_SAVE_MS = 10_000
export const SESSION_GAP_MS = 30 * 60_000
export const REMOVE_CONFIRM_MS = 4_000

// Where the coverage card ends before it is measured, app bar included.
export const MAP_TOP_FALLBACK = 200

// Room kept between the cards and what the map frames.
export const MAP_EDGE_MARGIN = 40

// Room kept on each side of what the map frames, for the labels.
export const MAP_SIDE_MARGIN = 60

export const MAP_TAP_RADIUS = 20

// Relayed and out-of-range repeaters, whose signal is not current.
export const MAP_MUTED_COLOR = '#8a94a6'

// How long the map attribution shows in full before it folds to its button.
// OpenStreetMap's guidelines allow folding it after five seconds.
export const MAP_ATTRIBUTION_FOLD_MS = 5_000

export const MAP_MIN_FRAME_HEIGHT = 60

// Room kept between a map label and its dot, and around every dot, which no
// label may cover. The largest dot reaches 11 px from its centre.
export const MAP_LABEL_GAP = 14
export const MAP_DOT_CLEARANCE = 11

// At a scan, the GPS gets as long as the scan to improve its fix, or less once
// it is this accurate.
export const LOCATE_WINDOW_MS = DISCOVER_WINDOW_MS
export const LOCATE_PRECISE_M = 20

// How fast a kept fix loses accuracy, a brisk walk.
export const FIX_DRIFT_M_PER_S = 1.5

// The map animations: one frame at most this often, a pulse around direct
// repeaters this long, and a band of light this long to run in along each link,
// this wide (in line lengths) and this bright at its centre.
export const MAP_ANIMATION_FRAME_MS = 33
export const MAP_PULSE_MS = 2_000
export const MAP_FLOW_MS = 1_800
export const MAP_FLOW_WIDTH = 0.18
export const MAP_FLOW_OPACITY = 0.75

// How far you move before the map redraws and reframes around you, above GPS drift.
export const MAP_FOLLOW_DISTANCE_M = 25

// How often an open app looks for a newer deployment, on top of each time it
// comes back to the foreground.
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60_000

// The deployment this tab last reloaded by itself for, so it does not loop.
export const RELOADED_FOR_STORAGE_KEY = 'app-update-reloaded-for'

export const CONNECT_TIMEOUT_MS = 20_000

export const RECONNECT_DELAY_MS = 2_000
export const RECONNECT_ATTEMPTS = 5

// A request normally gets its answer within a second over Bluetooth.
export const REQUEST_TIMEOUT_MS = 5_000

// The contact list streams one frame per contact.
export const CONTACTS_TIMEOUT_MS = 30_000

// A Li-ion cell, empty and full.
export const BATTERY_EMPTY_MV = 3000
export const BATTERY_FULL_MV = 4200

// Each tone starts at its threshold: at or above OK is fine, below LOW is bad.
export const BATTERY_OK_LEVEL = 0.5
export const BATTERY_LOW_LEVEL = 0.2

export const MARGIN_GAUGE_FULL_DB = 20

// Only repeaters heard directly this recently count towards coverage.
export const COVERAGE_RECENT_MS = 10 * 60_000

export const COVERAGE_GOOD_USABLE = 2

export const COVERAGE_TONES = { good: 'success', fair: 'warning', weak: 'error', none: 'error' } as const

export const MARGIN_COMFORTABLE_DB = 10
export const MARGIN_FAIR_DB = 5

export const ERROR_RATE_WARNING = 0.1
export const ERROR_RATE_BAD = 0.25

export const CLOCK_DRIFT_WARNING_SECS = 60
export const CLOCK_DRIFT_BAD_SECS = 3600

// Session rates over a shorter span are mostly noise.
export const MIN_SESSION_MINUTES = 1

export const TERRAIN_SAMPLES = 100
export const TERRAIN_SPACING_M = 160
export const TERRAIN_MARGIN_M = 15
export const EARTH_K = 4 / 3
export const FRESNEL_CLEAR_SHARE = 0.6
export const DEFAULT_YOUR_ANTENNA_M = 1.5
export const DEFAULT_REPEATER_ANTENNA_M = 5
export const MAX_ANTENNA_M = 300
export const ANTENNA_HEIGHTS_STORAGE_KEY = 'antenna-heights'
