import type { MaybeRefOrGetter } from 'vue'

export function useSessionRows(source: MaybeRefOrGetter<Session>) {
  const { t } = useI18n()
  const { hops } = useFormat()

  return computed(() => {
    const session = toValue(source)
    const margin = (snr: number | null) => snr === null || session.spreadingFactor === null ? null : linkMargin(snr, session.spreadingFactor)
    const nameOf = (id: string) => session.repeaters.find(repeater => samePrefix(repeater.id, id))?.name ?? t('repeaters.unnamed', { id: id.slice(0, 8).toUpperCase() })
    return session.repeaters
      .map(repeater => ({
        repeater,
        name: repeater.name ?? t('repeaters.unnamed', { id: repeater.id.slice(0, 8).toUpperCase() }),
        route: repeater.hops ? t('repeaters.via', { hops: hops(repeater.hops), name: repeater.via ? nameOf(repeater.via) : t('repeaters.unknown') }) : t('repeaters.direct'),
        rx: margin(repeater.rx),
        tx: margin(repeater.tx),
        link: margin(repeater.rx === null ? null : Math.min(repeater.rx, repeater.tx ?? repeater.rx))
      }))
      .sort((a, b) => a.repeater.hops - b.repeater.hops || (b.link?.value ?? -Infinity) - (a.link?.value ?? -Infinity))
  })
}
