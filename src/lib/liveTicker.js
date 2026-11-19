export const LIVE_PREFERENCES_KEY = 'stationlive-live-preferences-v2'
const LEGACY_LIVE_PREFERENCES_KEY = 'stationlive-live-preferences-v1'
export const ALL_UPDATES = { mode: 'all', ids: [] }
export function validatePreferences(value, metadata) {
  if (!value || value.mode !== 'stations') return ALL_UPDATES
  const valid = new Set((metadata?.stations || []).map(item => item.id))
  const ids = [...new Set(Array.isArray(value.ids) ? value.ids : [])].filter(id => valid.has(id)).slice(0, 3)
  return ids.length ? { mode: 'stations', ids } : ALL_UPDATES
}
export function matchesPreference(item, preference) {
  // Ticker sources currently have no explicit network-wide critical flag.
  // In station mode, include only rows linked to a selected canonical station.
  return !preference || preference.mode === 'all' || Boolean(item.stationId && preference.ids?.includes(item.stationId))
}
export function readPreferences(storage, metadata) {
  try {
    const current = storage.getItem(LIVE_PREFERENCES_KEY)
    const saved = current ?? storage.getItem(LEGACY_LIVE_PREFERENCES_KEY)
    return validatePreferences(saved ? JSON.parse(saved) : ALL_UPDATES, metadata)
  } catch {
    return ALL_UPDATES
  }
}
export function savePreferences(storage, preference, metadata) {
  const validated = validatePreferences(preference, metadata)
  try { storage.setItem(LIVE_PREFERENCES_KEY, JSON.stringify(validated)) } catch { /* The current session still uses the selected stations. */ }
  return validated
}
export function toggleStationSelection(ids, id) {
  const selected = [...new Set(Array.isArray(ids) ? ids : [])]
  return selected.includes(id) ? selected.filter(value => value !== id)
    : selected.length < 3 ? [...selected, id] : selected
}
function normalizeStationName(name) {
  return String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}
export function enrichUpdates(rows, metadata, reports) {
  // Prefer a canonical station ID when legacy metadata has the same name.
  const canonicalIds = new Set((metadata.stations || []).filter(s => !String(s.id).startsWith('legacy-')).map(s => s.id))
  const sortedStations = [...(metadata.stations || [])].sort((a, b) =>
    Number(canonicalIds.has(b.id)) - Number(canonicalIds.has(a.id)) || a.name.localeCompare(b.name))
  const stations = new Map()
  for (const station of sortedStations) {
    const key = normalizeStationName(station.name)
    if (key && !stations.has(key)) stations.set(key, station)
  }
  const canonical = new Map(reports.map(r => [r.id, r]))
  return [...new Map(rows.map(row => {
    const report = canonical.get(row.id)
    const stationId = report?.station_id || stations.get(normalizeStationName(row.station_name))?.id
    const lineIds = report ? report.report_lines.map(l => l.line_id)
      : metadata.links.filter(l => l.station_id === stationId).map(l => l.line_id)
    return [row.id, { ...row, stationId, lineIds: [...new Set(lineIds)] }]
  })).values()]
}
export function safeLineColor(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color || '')) return '#17233f'
  const rgb = color.slice(1).match(/../g).map(c => parseInt(c, 16))
  const luminance = channels => channels.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
  // The existing Tailwind bg-yellow-400 banner resolves to #facc15.
  while ((luminance([250, 204, 21]) + .05) / (luminance(rgb) + .05) < 4.5) {
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
