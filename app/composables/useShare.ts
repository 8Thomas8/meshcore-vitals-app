import type { MaybeRefOrGetter } from 'vue'

function useShareText() {
  const { t } = useI18n()
  const { formatNumber, date } = useFormat()
  return {
    way: (snr: number | null | undefined, margin: LinkMargin | null) =>
      typeof snr === 'number' ? { text: formatNumber(snr, 1, 0), color: margin ? THEME_COLORS[margin.tone] : null } : null,
    day: (at: number) => date(at).replace(/^./, letter => letter.toUpperCase()),
    more: (count: number) => count > SHARE_ROWS ? t('share.more', count - SHARE_ROWS) : null,
    tagline: t('share.tagline')
  }
}

export function useScanShare() {
  const { t } = useI18n()
  const { hops, formatDistance, time } = useFormat()
  const { way, day, more, tagline } = useShareText()
  const { inRange, direct, coverage } = useScanResult()
  const { position: here } = useDevicePosition()
  const { scannedAt } = useRepeaters()

  return {
    title: computed(() => t('share.scanTitle')),
    disabled: computed(() => !coverage.value),
    build: (withPosition: boolean): ShareScan => {
      const at = scannedAt.value ?? Date.now()
      const rows = inRange.value
      return {
        here: withPosition ? copyPosition(here.value) : null,
        track: [],
        repeaters: rows.map(row => ({
          id: row.repeater.id,
          name: row.name,
          route: [
            row.repeater.hops ? t('repeaters.via', { hops: hops(row.repeater.hops), name: row.viaName ?? t('repeaters.unknown') }) : t('repeaters.direct'),
            withPosition && row.distance !== null && formatDistance(row.distance)
          ].filter(Boolean).join(' · '),
          position: copyPosition(row.position),
          hops: row.repeater.hops,
          via: row.repeater.via,
          color: linkColor(!!row.repeater.hops, row.link?.tone),
          rx: row.repeater.hops ? null : way(row.repeater.rx?.snr, row.rx),
          tx: row.repeater.hops ? null : way(row.repeater.tx?.snr, row.tx)
        })),
        level: coverage.value!.level,
        ring: { text: String(coverage.value!.usable), share: Math.min(coverage.value!.usable, COVERAGE_GOOD_USABLE) / COVERAGE_GOOD_USABLE },
        title: coverage.value!.label,
        subtitle: t(rows.length > direct.value.length ? 'repeaters.counts' : 'repeaters.directOnly', { direct: direct.value.length, relayed: t('repeaters.relayed', rows.length - direct.value.length) }),
        date: `${day(at)} · ${time(at)}`,
        more: more(rows.length),
        tagline
      }
    }
  }
}

export function useSessionShare(source: MaybeRefOrGetter<Session>) {
  const { t } = useI18n()
  const { formatDistance, time, duration } = useFormat()
  const { way, day, more, tagline } = useShareText()
  const rows = useSessionRows(source)

  return {
    title: computed(() => t('share.sessionTitle')),
    disabled: computed(() => false),
    build: (withPosition: boolean): ShareScan => {
      const session = toValue(source)
      const level = mainLevel(session.scans) ?? 'none'
      const shown = withPosition && session.scans.some(scan => scan.position)
      const covered = session.scans.filter(scan => scan.level === 'good' || scan.level === 'fair').length / Math.max(1, session.scans.length)
      return {
        here: null,
        track: shown ? session.scans.flatMap(scan => scan.position ? [{ position: scan.position, color: THEME_COLORS[COVERAGE_TONES[scan.level]] }] : []) : [],
        repeaters: rows.value.map(row => ({
          id: row.repeater.id,
          name: row.name,
          route: row.route,
          position: row.repeater.position,
          hops: row.repeater.hops,
          via: row.repeater.via,
          color: row.link ? linkColor(!!row.repeater.hops, row.link.tone) : MAP_MUTED_COLOR,
          rx: row.repeater.hops ? null : way(row.repeater.rx, row.rx),
          tx: row.repeater.hops ? null : way(row.repeater.tx, row.tx)
        })),
        level,
        ring: { text: `${Math.round(covered * 100)}%`, share: covered },
        title: t(`coverage.level.${level}`),
        subtitle: [
          duration(Math.round((session.endedAt - session.startedAt) / 1000)),
          shown && formatDistance(sessionDistance(session.scans)),
          t('repeaters.count', rows.value.length)
        ].filter(Boolean).join(' · '),
        date: `${day(session.startedAt)} · ${time(session.startedAt)} – ${time(session.endedAt)}`,
        more: more(rows.value.length),
        tagline
      }
    }
  }
}
