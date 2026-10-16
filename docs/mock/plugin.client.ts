import { defineNuxtPlugin, useMeshCore, useRepeaters } from '#imports'
import { HISTORY_DB_NAME, HISTORY_STORE } from '../../app/utils/constants'
import { HERE, pastSession } from './data'

export default defineNuxtPlugin((nuxtApp) => {
  const coords = { latitude: HERE.lat, longitude: HERE.lon, accuracy: 8, altitude: null, altitudeAccuracy: null, heading: null, speed: null }
  const report = (success: PositionCallback) => setTimeout(() => success({ coords, timestamp: Date.now() } as GeolocationPosition), 100)
  Object.defineProperty(navigator, 'geolocation', { value: { watchPosition: (success: PositionCallback) => (report(success), 1), getCurrentPosition: report, clearWatch() {} } })
  Object.defineProperty(navigator, 'bluetooth', { value: { getDevices: async () => [] } })

  const request = indexedDB.open(HISTORY_DB_NAME, 1)
  request.onupgradeneeded = () => request.result.createObjectStore(HISTORY_STORE, { keyPath: 'startedAt' })
  request.onsuccess = () => {
    const store = request.result.transaction(HISTORY_STORE, 'readwrite').objectStore(HISTORY_STORE)
    store.clear()
    store.put(pastSession())
  }

  nuxtApp.hook('app:mounted', async () => {
    await useMeshCore().connect()
    setTimeout(() => useRepeaters().scan(), 500)
  })
})
