import assert from 'node:assert/strict'
import test from 'node:test'
import { getReportInteraction, rememberReportInteraction } from '../src/lib/reportInteractions.js'

test('report ownership and confirmation survive reopening and stay scoped to the viewer', () => {
  const storage = new Map()
  globalThis.window = { localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } }
  const report = { id: 'report-1', authorId: 'author' }
  assert.equal(getReportInteraction(report, 'author').isOwn, true)
  assert.deepEqual(getReportInteraction(report, 'passenger'), { isOwn: false, hasConfirmed: false })
  rememberReportInteraction(report.id, 'confirmed', 'passenger')
  assert.equal(getReportInteraction({ ...report }, 'passenger').hasConfirmed, true)
  assert.equal(getReportInteraction(report, 'another-passenger').hasConfirmed, false)
  assert.equal(getReportInteraction({ id: 'different-report' }, 'passenger').hasConfirmed, false)
  rememberReportInteraction('guest-report', 'submitted')
  assert.equal(getReportInteraction({ id: 'guest-report' }).isOwn, true)
  assert.equal(getReportInteraction({ id: 'guest-report' }, 'passenger').isOwn, false)

  const originalNow = Date.now
  try {
    Date.now = () => originalNow() + 25 * 60 * 60 * 1000
    assert.equal(getReportInteraction(report, 'passenger').hasConfirmed, false)
  } finally {
    Date.now = originalNow
    delete globalThis.window
  }
})

test('blocked storage still remembers interactions during this session', () => {
  globalThis.window = { localStorage: {
    getItem: () => { throw new Error('Storage blocked') },
    setItem: () => { throw new Error('Storage blocked') },
  } }
  try {
    rememberReportInteraction('private-report', 'submitted')
    assert.equal(getReportInteraction({ id: 'private-report' }).isOwn, true)
  } finally { delete globalThis.window }
})
