import assert from 'node:assert/strict'
import test from 'node:test'
import nationalRail from '../src/data/nationalRailStations.json' with { type: 'json' }
import { stations } from '../src/data/mockData.js'
import { findReportStations, reportStations, resolveReportStation } from '../src/lib/reportStations.js'

test('the browse list contains every downloaded station and existing map station', () => {
  assert.ok(nationalRail.stations.length > 2600)
  assert.equal(findReportStations('').length, reportStations.length)
  for (const station of nationalRail.stations) {
    assert.equal(resolveReportStation(station.code)?.code, station.code)
  }
  for (const station of stations) {
    assert.equal(resolveReportStation(station.name)?.name, station.name)
  }
  assert.equal(new Set(reportStations.map((s) => s.searchName)).size, reportStations.length)
  assert.deepEqual(reportStations.map((s) => s.name), reportStations.map((s) => s.name).sort((a, b) => a.localeCompare(b, 'en-GB')))
})

test('search finds stations across Great Britain and prioritizes exact codes', () => {
  for (const [query, code] of [['Birmingham New', 'BHM'], ['Cardiff Central', 'CDF'], ['Glasgow Central', 'GLC'], ['Edinburgh', 'EDB'], ['Penzance', 'PNZ']]) {
    assert.ok(findReportStations(query).some((station) => station.code === code))
  }
  assert.equal(findReportStations(' vic ')[0].code, 'VIC')
  assert.equal(resolveReportStation('bhm').name, 'Birmingham New Street')
  assert.equal(resolveReportStation("London King's Cross").code, 'KGX')
})

test('partial or unknown station names cannot be submitted', () => {
  assert.equal(resolveReportStation(''), undefined)
  assert.equal(resolveReportStation('London'), undefined)
  assert.equal(resolveReportStation('not a real station'), undefined)
  assert.deepEqual(findReportStations('not a real station'), [])
})
