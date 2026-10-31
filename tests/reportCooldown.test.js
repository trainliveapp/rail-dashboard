import assert from 'node:assert/strict'
import test from 'node:test'
import { canUndoReport, getIconSubmission, readReportSubmission, reportCooldownRemaining, REPORT_COOLDOWN_MS, saveReportSubmission } from '../src/lib/reportCooldown.js'

test('undo keeps the original cooldown, including after reopening', () => {
  const storage = new Map()
  globalThis.window = {
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    dispatchEvent() {},
  }
  try {
    const now = Date.now()
    const state = { report: { id: 'report', stationName: 'Victoria', category: 'delays' }, nextAllowedAt: now + REPORT_COOLDOWN_MS, undone: false }
    saveReportSubmission(state)
    assert.equal(reportCooldownRemaining(getIconSubmission(readReportSubmission(), 'Victoria', 'delays'), now), REPORT_COOLDOWN_MS)
    assert.equal(canUndoReport(readReportSubmission(), 'Victoria', 'delays', now), true)
    assert.equal(canUndoReport(state, 'Euston', 'delays', now), false)
    assert.equal(canUndoReport(state, 'Victoria', 'police', now), false)
    saveReportSubmission({ ...state, undone: true })
    assert.equal(canUndoReport(readReportSubmission(), 'Victoria', 'delays', now), false)
    assert.equal(reportCooldownRemaining(getIconSubmission(readReportSubmission(), 'Victoria', 'delays'), now + 5 * 60000), 25 * 60000)
    const corrected = { ...state, report: { id: 'corrected', stationName: 'Victoria', category: 'police' } }
    saveReportSubmission([{ ...state, undone: true }, corrected])
    assert.equal(canUndoReport(readReportSubmission(), 'Victoria', 'police', now), true)
    assert.equal(canUndoReport(readReportSubmission(), 'Victoria', 'delays', now), false)
    assert.equal(canUndoReport(readReportSubmission(), 'Euston', 'police', now), false)
    // Restoring one icon keeps the other icon's selection.
    saveReportSubmission([state, corrected])
    assert.equal(canUndoReport(readReportSubmission(), 'Victoria', 'delays', now), true)
    assert.equal(canUndoReport(readReportSubmission(), 'Victoria', 'police', now), true)
    assert.equal(reportCooldownRemaining(state, now + REPORT_COOLDOWN_MS), 0)
    assert.equal(canUndoReport(state, 'Victoria', 'delays', now + REPORT_COOLDOWN_MS), false)
  } finally { delete globalThis.window }
})

test('blocked browser storage retains cooldown and undo state in memory', () => {
  globalThis.window = {
    localStorage: { getItem() { throw Error('Blocked') }, setItem() { throw Error('Blocked') } },
    dispatchEvent() {},
  }
  try {
    saveReportSubmission({ nextAllowedAt: Date.now() + REPORT_COOLDOWN_MS, undone: true })
    assert.ok(reportCooldownRemaining(readReportSubmission()[0]) > 0)
    assert.equal(readReportSubmission()[0].undone, true)
  } finally { delete globalThis.window }
})
