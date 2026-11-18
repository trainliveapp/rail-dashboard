import test from 'node:test'
import assert from 'node:assert/strict'
import { ALL_UPDATES, validatePreferences, matchesPreference, enrichUpdates, safeLineColor, resolveOperatorLines } from '../src/lib/liveTicker.js'
const metadata = { stations: [{ id: 's', name: 'Interchange' }], lines: ['a', 'b', 'c', 'd'].map(id => ({ id })), links: [{ station_id: 's', line_id: 'a' }, { station_id: 's', line_id: 'b' }] }
test('preferences validate identifiers, modes, duplicates and selection limit', () => {
  assert.deepEqual(validatePreferences({ mode: 'lines', ids: ['a', 'a', 'unknown', 'b', 'c', 'd'] }, metadata), { mode: 'lines', ids: ['a', 'b', 'c'] })
  assert.deepEqual(validatePreferences({ mode: 'stations', ids: ['unknown'] }, metadata), ALL_UPDATES)
  assert.deepEqual(validatePreferences({ mode: 'bad', ids: ['a'] }, metadata), ALL_UPDATES)
})
test('interchange reports retain all lines without duplicate ticker items', () => {
  const row = { id: 'r', station_name: 'Interchange' }
  const rows = enrichUpdates([row, row], metadata, [])
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0].lineIds, ['a', 'b'])
  assert.ok(matchesPreference(rows[0], { mode: 'lines', ids: ['b'] }))
  assert.ok(!matchesPreference(rows[0], { mode: 'stations', ids: ['other'] }))
  const specific = enrichUpdates([row], metadata, [{ id: 'r', station_id: 's', report_lines: [{ line_id: 'a' }] }])[0]
  assert.ok(!matchesPreference(specific, { mode: 'lines', ids: ['b'] }))
})
test('operator and unattributed notices always survive personalisation', () => {
  for (const row of [{ kind: 'tfl' }, { lineIds: [] }]) assert.ok(matchesPreference(row, { mode: 'stations', ids: ['s'] }))
})
test('light line colours darken; invalid colours use neutral text', () => {
  assert.notEqual(safeLineColor('#ffd300'), '#ffd300')
  assert.equal(safeLineColor('#000000'), '#000000')
  assert.equal(safeLineColor('invalid'), '#17233f')
})

test('operator attribution stays neutral for unknown, partial or ambiguous line matches', () => {
  const lines = [{ id: 'central', name: 'Central' }, { id: 'district', name: 'District' }]
  assert.deepEqual(resolveOperatorLines(['Central line'], lines), ['central'])
  assert.deepEqual(resolveOperatorLines(['Central', 'Unknown'], lines), [])
  assert.deepEqual(resolveOperatorLines(['Central', 'District'], lines), ['central', 'district'])
  assert.deepEqual(resolveOperatorLines(['Central'], [...lines, { id: 'other', name: 'Central Line' }]), [])
})
