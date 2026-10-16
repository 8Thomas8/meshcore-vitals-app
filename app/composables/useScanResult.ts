import { useNow } from '@vueuse/core'

export function useScanResult() {
  const { repeaters, selfInfo, contacts, lastFullScan } = useRepeaters()
  const { position: here } = useDevicePosition()
  const { t } = useI18n()
  const { ago, hops, formatNumber, formatDistance } = useFormat()
  const clock = useNow({ interval: 1000 })
  const now = computed(() => clock.value.getTime())

  const repeaterContacts = computed(() => contacts.value
    .filter(contact => contact.type === ADV_TYPE_REPEATER)
    .map(contact => ({ id: toHex(contact.publicKey), contact })))

  // A path hash can match several contacts, then none is picked.
  function contactFor(id: string) {
    const matches = repeaterContacts.value.filter(entry => entry.id.startsWith(id))
    return matches.length === 1 ? matches[0]!.contact : null
  }

  function margin(sample: LinkSample | null) {
    return sample && selfInfo.value ? linkMargin(sample.snr, selfInfo.value.radioSf) : null
  }

  function weaker(rx: LinkMargin | null, tx: LinkMargin | null) {
    return rx && tx && tx.value < rx.value ? tx : rx ?? tx
  }

  function nameOf(id: string): string {
    const heard = repeaters.value.find(repeater => repeater.id.startsWith(id))
    return heard?.name ?? contactFor(heard?.id ?? id)?.advName ?? t('repeaters.unnamed', { id: id.slice(0, 8).toUpperCase() })
  }

  const rows = computed(() => repeaters.value
    .map((repeater): RepeaterRow => {
      const contact = contactFor(repeater.id)
      const position = repeater.position ?? (contact && toPosition(contact.advLat, contact.advLon))
      const distance = here.value && position ? distanceMeters(here.value, position) : null
      const altitude = position ? elevationAt(position) : null
      const viaName = repeater.via && nameOf(repeater.via)
      const rx = margin(repeater.rx)
      const tx = margin(repeater.tx)
      const outOfRange = isOutOfRange(repeater, repeaters.value, lastFullScan.value)
      const route = outOfRange
        ? t('repeaters.outOfRange')
        : repeater.hops ? t('repeaters.via', { hops: hops(repeater.hops), name: viaName ?? t('repeaters.unknown') }) : t('repeaters.direct')
      const details = [
        distance !== null && formatDistance(distance),
        typeof altitude === 'number' && t('repeaters.altitude', { altitude: formatNumber(altitude) })
      ]
      return {
        repeater,
        name: nameOf(repeater.id),
        viaName,
        heard: ago(repeater.lastHeard, now.value),
        // The route may wrap, each other part stays whole.
        details: [route, ...details.filter(part => typeof part === 'string').map(part => part.replaceAll(' ', '\u00a0'))],
        position,
        altitude,
        distance,
        bearing: here.value && position ? bearingDegrees(here.value, position) : null,
        // A repeater out of range keeps its last values, not their colors.
        rx: outOfRange ? null : rx,
        tx: outOfRange ? null : tx,
        link: outOfRange ? null : weaker(rx, tx),
        outOfRange
      }
    })
    // Direct ones by link quality, then the closest relayed ones, the ones out
    // of range last.
    .sort((a, b) => Number(a.outOfRange) - Number(b.outOfRange)
      || a.repeater.hops - b.repeater.hops
      || (b.link?.value ?? -Infinity) - (a.link?.value ?? -Infinity)
      || b.repeater.lastHeard - a.repeater.lastHeard))

  const inRange = computed(() => rows.value.filter(row => !row.outOfRange))
  const direct = computed(() => inRange.value.filter(row => !row.repeater.hops))

  const coverage = computed(() => {
    if (!inRange.value.length) return null
    const links = direct.value.flatMap(({ repeater, rx, tx }) =>
      rx && repeater.rx && now.value - repeater.rx.at < COVERAGE_RECENT_MS ? [{ rx: rx.value, tx: tx?.value ?? null }] : [])
    const assessment = assessCoverage(links)
    const { reason, usable, confirmed, solid, unconfirmed } = assessment
    return {
      ...assessment,
      tone: COVERAGE_TONES[assessment.level],
      label: t(`coverage.level.${assessment.level}`),
      reason: reason === 'confirmed' && unconfirmed
        ? `${t('coverage.reason.confirmed', { confirmed, solid }, solid)} ${t('coverage.reason.unscanned', unconfirmed)}`
        : t(`coverage.reason.${reason}`, { usable, confirmed, solid, minutes: COVERAGE_RECENT_MS / 60_000, fair: MARGIN_FAIR_DB }, solid)
    }
  })

  return { rows, inRange, direct, coverage }
}
