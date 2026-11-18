export const LIVE_PREFERENCES_KEY = 'stationlive-live-preferences-v1'
export const ALL_UPDATES = { mode: 'all', ids: [] }
export function validatePreferences(value, metadata) {
  if (!value || !['lines', 'stations'].includes(value.mode)) return ALL_UPDATES
  const valid = new Set(metadata[value.mode].map(item => item.id))
  const ids = [...new Set(Array.isArray(value.ids) ? value.ids : [])].filter(id => valid.has(id)).slice(0, 3)
  return ids.length ? { mode: value.mode, ids } : ALL_UPDATES
}
export function matchesPreference(item, preference) {
  // The source has no trustworthy network-safety classification. Keep operator
  // notices and unattributed reports visible rather than infer safety from prose.
  if (preference.mode === 'all' || item.kind === 'tfl' || !item.stationId) return true
  return preference.mode === 'stations' ? preference.ids.includes(item.stationId)
    : item.lineIds.length === 0 || item.lineIds.some(id => preference.ids.includes(id))
}
export function enrichUpdates(rows, metadata, reports) {
  const stations = new Map(metadata.stations.map(s => [s.name, s]))
  const canonical = new Map(reports.map(r => [r.id, r]))
  return [...new Map(rows.map(row => {
    const report = canonical.get(row.id)
    const stationId = report?.station_id || stations.get(row.station_name)?.id
    const lineIds = report ? report.report_lines.map(l => l.line_id)
      : metadata.links.filter(l => l.station_id === stationId).map(l => l.line_id)
    return [row.id, { ...row, stationId, lineIds: [...new Set(lineIds)] }]
  })).values()]
}
export function safeLineColor(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color || '')) return '#17233f'
  const rgb = color.slice(1).match(/../g).map(c => parseInt(c, 16))
  const luminance = channels => channels.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
  while ((luminance([255, 223, 61]) + .05) / (luminance(rgb) + .05) < 4.5) {
    for (let i = 0; i < 3; i++) rgb[i] = Math.floor(rgb[i] * .9)
  }
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('')
}

// A partial match cannot establish a single-line attribution.
export function resolveOperatorLines(names, lines) {
  const normalize = name => name.trim().toLowerCase().replace(/ line$/, '')
  const ids = []
  for (const name of names || []) {
    const matches = lines.filter(line => normalize(line.name) === normalize(name))
    if (matches.length !== 1) return []
    ids.push(matches[0].id)
  }
  return [...new Set(ids)]
}
