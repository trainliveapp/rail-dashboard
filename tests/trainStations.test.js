import assert from 'node:assert/strict'
import test from 'node:test'
import nationalRail from '../src/data/nationalRailStations.json' with { type: 'json' }
import northernIreland from '../src/data/northernIrelandStations.json' with { type: 'json' }
import { findTrainStations, resolveTrainStation, trainStations, trainSearchLink } from '../src/lib/trainStations.js'

test('train search includes every National Rail and Northern Ireland station without duplicate names', () => {
  for (const station of nationalRail.stations) {
    assert.equal(resolveTrainStation(station.code)?.code, station.code)
  }
  assert.equal(northernIreland.stations.length, 54)
  for (const name of northernIreland.stations) {
    assert.equal(resolveTrainStation(name)?.network, 'translink')
  }
  assert.equal(new Set(trainStations.map((station) => station.name)).size, trainStations.length)
  assert.equal(findTrainStations('').length, trainStations.length)
})

test('search disambiguates Bangor and handles names, codes, and unknown inputs', () => {
  assert.equal(findTrainStations(' bHm ')[0].code, 'BHM')
  assert.equal(findTrainStations('Bangor').length, 3)
  assert.equal(resolveTrainStation('Bangor (Northern Ireland)').network, 'translink')
  assert.equal(resolveTrainStation('BNG').network, 'national-rail')
  assert.equal(resolveTrainStation('London'), undefined)
  assert.equal(resolveTrainStation(''), undefined)
  assert.deepEqual(findTrainStations('no such station'), [])
})

test('train times go to the correct provider and cannot be opened for an invalid selection', () => {
  assert.equal(trainSearchLink(resolveTrainStation('BHM')), 'https://www.nationalrail.co.uk/live-trains/departures/BHM/')
  assert.equal(trainSearchLink(resolveTrainStation('Belfast Grand Central')), 'https://www.translink.co.uk/')
  assert.equal(trainSearchLink(undefined), null)
})
