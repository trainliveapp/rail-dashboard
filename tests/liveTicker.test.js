import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  ALL_UPDATES,
  LIVE_PREFERENCES_KEY,
  enrichUpdates,
  matchesPreference,
  readPreferences,
  safeLineColor,
  savePreferences,
  toggleStationSelection,
  validatePreferences,
} from '../src/lib/liveTicker.js'

const metadata = {
  stations: [{ id: 'interchange', name: 'Interchange' }, { id: 'central', name: 'Central' }],
  lines: [
    { id: 'line-a', name: 'Line A', colour: '#ffd300' },
    { id: 'line-b', name: 'Line B', colour: '#e32017' },
  ],
  links: [
    { station_id: 'interchange', line_id: 'line-a' },
    { station_id: 'interchange', line_id: 'line-b' },
    { station_id: 'central', line_id: 'line-a' },
  ],
}

function storage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  }
}

test('all is the default and persisted canonical station IDs survive a page reload', () => {
  const saved = storage()
  assert.deepEqual(readPreferences(saved, metadata), ALL_UPDATES)
  const chosen = { mode: 'stations', ids: ['interchange', 'central'] }
  savePreferences(saved, chosen, metadata)
  assert.deepEqual(JSON.parse(saved.getItem(LIVE_PREFERENCES_KEY)), chosen)
  assert.deepEqual(readPreferences(saved, metadata), chosen)
})

test('preferences remove stale/renamed IDs, duplicates, invalid mode and more than three IDs', () => {
  const threeStations = { stations: ['a', 'b', 'c', 'd'].map(id => ({ id })) }
  assert.deepEqual(validatePreferences({ mode: 'stations', ids: ['a', 'a', 'retired', 'b', 'c', 'd'] }, threeStations), { mode: 'stations', ids: ['a', 'b', 'c'] })
  assert.deepEqual(validatePreferences({ mode: 'stations', ids: ['old-station-id'] }, metadata), ALL_UPDATES)
  assert.deepEqual(validatePreferences({ mode: 'lines', ids: ['line-a'] }, metadata), ALL_UPDATES)
  assert.deepEqual(validatePreferences({ mode: 'unknown', ids: ['a'] }, metadata), ALL_UPDATES)
})

test('selection supports zero through three stations, rejects a fourth and prevents duplicates', () => {
  let ids = []
  ids = toggleStationSelection(ids, 'a')
  assert.deepEqual(ids, ['a'])
  ids = toggleStationSelection(ids, 'b')
  assert.deepEqual(ids, ['a', 'b'])
  ids = toggleStationSelection(ids, 'c')
  assert.deepEqual(ids, ['a', 'b', 'c'])
  assert.deepEqual(toggleStationSelection(ids, 'd'), ids)
  assert.deepEqual(toggleStationSelection(ids, 'b'), ['a', 'c'])
  assert.deepEqual(toggleStationSelection(['a', 'a'], 'a'), [])
  assert.deepEqual(toggleStationSelection([], 'a'), ['a'])
})

test('station mode includes genuine station-linked reports across operators only', () => {
  const row = { id: 'report-1', station_name: 'Interchange' }
  const [report] = enrichUpdates([row], metadata, [{ id: row.id, station_id: 'interchange', report_lines: [{ line_id: 'line-a' }, { line_id: 'line-b' }] }])
  assert.equal(report.stationId, 'interchange')
  assert.deepEqual(report.lineIds, ['line-a', 'line-b'])
  assert.ok(matchesPreference(report, { mode: 'stations', ids: ['interchange'] }))
  assert.ok(!matchesPreference(report, { mode: 'stations', ids: ['central'] }))
})

test('legacy station names with punctuation differences resolve to canonical station IDs', () => {
  const stationMetadata = {
    ...metadata,
    stations: [{ id: 'kings-cross', name: "King's Cross St Pancras" }, { id: 'legacy-old-kings-cross', name: "King's Cross St Pancras" }],
  }
  const [legacyReport] = enrichUpdates(
    [{ id: 'legacy-report', station_name: 'Kings Cross St Pancras' }],
    stationMetadata,
    [],
  )
  assert.equal(legacyReport.stationId, 'kings-cross')
  assert.ok(matchesPreference(legacyReport, { mode: 'stations', ids: ['kings-cross'] }))
})

test('no station match, missing canonical relationship and line-wide TfL notices stay out of station mode', () => {
  const selected = { mode: 'stations', ids: ['interchange'] }
  const [renamed] = enrichUpdates([{ id: 'old', station_name: 'Old Interchange Name' }], metadata, [{ id: 'old', station_id: 'retired-interchange', report_lines: [] }])
  assert.ok(!matchesPreference(renamed, selected))
  assert.ok(!matchesPreference({ id: 'unknown', lineIds: ['line-a'] }, selected))
  assert.ok(!matchesPreference({ kind: 'tfl', station_name: 'Central Line', lineIds: ['line-a'] }, selected))
  assert.ok(!matchesPreference({ stationId: 'central' }, selected))
  assert.ok(matchesPreference({ kind: 'tfl' }, ALL_UPDATES))
  assert.ok(matchesPreference({ id: 'unattributed' }, ALL_UPDATES))
})

test('duplicate report IDs are represented once in the ticker', () => {
  const row = { id: 'same-report', station_name: 'Interchange' }
  const reports = [{ id: row.id, station_id: 'interchange', report_lines: [{ line_id: 'line-a' }] }]
  const enriched = enrichUpdates([row, row], metadata, reports)
  assert.equal(enriched.length, 1)
})

test('malformed and blocked localStorage fall back to all updates without breaking the session', () => {
  const malformed = storage()
  malformed.setItem(LIVE_PREFERENCES_KEY, '{bad json')
  assert.deepEqual(readPreferences(malformed, metadata), ALL_UPDATES)
  const blocked = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  assert.deepEqual(readPreferences(blocked, metadata), ALL_UPDATES)
  assert.doesNotThrow(() => savePreferences(blocked, { mode: 'stations', ids: ['interchange'] }, metadata))
})

test('single-line colours are darkened for yellow; invalid and multi-line associations remain neutral', () => {
  const dark = safeLineColor(metadata.lines[0].colour)
  assert.notEqual(dark, metadata.lines[0].colour)
  assert.equal(safeLineColor('#000000'), '#000000')
  assert.equal(safeLineColor('invalid'), '#17233f')
  const luminance = hex => hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
  assert.ok((luminance('#facc15') + .05) / (luminance(dark) + .05) >= 4.5)
  const [multiLine] = enrichUpdates([{ id: 'multi', station_name: 'Interchange' }], metadata, [{ id: 'multi', station_id: 'interchange', report_lines: [{ line_id: 'line-a' }, { line_id: 'line-b' }] }])
  assert.notEqual(multiLine.lineIds.length, 1)
})

test('search panel has the approved station-only labels and reduced motion disables ticker animation', async () => {
  const [component, css] = await Promise.all([
    readFile(new URL('../src/components/LiveTickerPreferences.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/index.css', import.meta.url), 'utf8'),
  ])
  assert.match(component, /Personalise/)
  assert.match(component, /Choose up to 3 stations/)
  assert.match(component, /Search for a station\.\.\./)
  assert.match(component, /Apply \(\{selectedIds\.length\}\/3\)/)
  assert.doesNotMatch(component, /Railway lines|location-pin|train icon/i)
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?\.live-ticker-track \{ animation: none; \}/)
  assert.match(css, /\.live-preferences-results \{[^}]*overflow-y: auto/)
})
