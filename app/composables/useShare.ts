export type ShareContent = Omit<ShareScan, 'more' | 'tagline'>

interface ShareSessionRow {
  repeater: SessionRepeater
  name: string
  route: string
  rx: LinkMargin | null
  tx: LinkMargin | null
  link: LinkMargin | null
}

function useShareFormat() {
  const format = useFormat()
  return {
    ...format,
    way: (snr: number | null | undefined, margin: LinkMargin | null) =>
      typeof snr === 'number' ? { text: format.formatNumber(snr, 1, 0), color: margin ? THEME_COLORS[margin.tone] : null } : null,
    day: (at: number) => format.date(at).replace(/^./, letter => letter.toUpperCase())
  }
}

export function useScanShare() {
  const { t } = useI18n()
  const { hops, formatDistance, time, way, day } = useShareFormat()
  const { position: here } = useDevicePosition()
  const { scannedAt } = useRepeaters()

  return (rows: RepeaterRow[], coverage: { level: CoverageLevel, usable: number, label: string }, withPosition: boolean): ShareContent => {
    const at = scannedAt.value ?? Date.now()
    const direct = rows.filter(row => !row.repeater.hops).length
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
      level: coverage.level,
      usable: coverage.usable,
      title: coverage.label,
      subtitle: t(rows.length > direct ? 'repeaters.counts' : 'repeaters.directOnly', { direct, relayed: t('repeaters.relayed', rows.length - direct) }),
      date: `${day(at)} · ${time(at)}`
    }
  }
}

export function useSessionShare() {
  const { t } = useI18n()
  const { formatDistance, time, duration, way, day } = useShareFormat()

  return (session: Session, rows: ShareSessionRow[], withPosition: boolean): ShareContent => {
    const level = mainLevel(session.scans) ?? 'none'
    const shown = withPosition && session.scans.some(scan => scan.position)
    return {
      here: null,
      track: shown ? session.scans.flatMap(scan => scan.position ? [{ position: scan.position, color: THEME_COLORS[COVERAGE_TONES[scan.level]] }] : []) : [],
      repeaters: rows.map(row => ({
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
      usable: rows.filter(row => !row.repeater.hops && row.link && row.link.value >= MARGIN_FAIR_DB).length,
      title: t(`coverage.level.${level}`),
      subtitle: [
        duration(Math.round((session.endedAt - session.startedAt) / 1000)),
        shown && formatDistance(sessionDistance(session.scans)),
        t('repeaters.count', rows.length)
      ].filter(Boolean).join(' · '),
      date: `${day(session.startedAt)} · ${time(session.startedAt)} – ${time(session.endedAt)}`
    }
  }
}
