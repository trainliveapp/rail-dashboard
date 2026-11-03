import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalStationId, summarizeUniqueReports, REPORT_EXPIRY_MS } from '../src/lib/canonicalReports.js'

test('canonical station ids match the seeded station ids', () => {
  assert.equal(canonicalStationId('Acton Town'), 'acton-town')
  assert.equal(canonicalStationId('Hammersmith & City'), 'hammersmith-city')
})

test('line summaries count each report once, including station-wide reports on multiple lines', () => {
  const rows = [
    { id: 'station-wide', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 'station-wide', status: 'ACTIVE', createdAt: new Date().toISOString() },
    { id: 'line-specific', status: 'CONFIRMED', createdAt: new Date().toISOString() },
    { id: 'expired', status: 'ACTIVE', createdAt: new Date(Date.now() - REPORT_EXPIRY_MS - 1).toISOString() },
    { id: 'resolved', status: 'RESOLVED', createdAt: new Date().toISOString() },
  ]
  assert.equal(summarizeUniqueReports(rows), 2)
})
