import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarCountdown, parseLaunchTimestamp } from '../src/lib/flavioCountdown.js'
const c = (now, target) => calendarCountdown(new Date(now), new Date(target))
test('calendar months respect month ends and leap years', () => {
  assert.deepEqual(c('2027-01-31T00:00:00Z', '2027-02-28T00:00:00Z'), { months: 1, days: 0, hours: 0, minutes: 0 })
  assert.deepEqual(c('2028-01-31T00:00:00Z', '2028-02-29T00:00:00Z'), { months: 1, days: 0, hours: 0, minutes: 0 })
  assert.deepEqual(c('2026-11-10T00:00:00Z', '2027-05-10T00:00:00Z'), { months: 6, days: 0, hours: 0, minutes: 0 })
})
test('partial months, hours and minutes retain UTC precision', () => {
  assert.deepEqual(c('2027-01-31T10:15:00Z', '2027-03-01T11:17:00Z'), { months: 1, days: 1, hours: 1, minutes: 2 })
  assert.deepEqual(c('2027-02-01T00:01:00Z', '2027-03-01T00:00:00Z'), { months: 0, days: 27, hours: 23, minutes: 59 })
})
test('countdown stops at zero for launch and all later dates', () => {
  for (const now of ['2027-05-10T00:00:00Z', '2029-06-01T01:00:00Z']) assert.deepEqual(c(now, '2027-05-10T00:00:00Z'), { months: 0, days: 0, hours: 0, minutes: 0 })
})
test('configuration requires one explicit valid UTC timestamp', () => {
  for (const value of [undefined, '', 'soon', '2027-05-10', '2027-05-10T00:00:00', '2027-99-10T00:00:00Z', '2027-02-31T00:00:00Z']) assert.equal(parseLaunchTimestamp(value), null)
  assert.equal(parseLaunchTimestamp('2027-05-10T00:00:00Z').toISOString(), '2027-05-10T00:00:00.000Z')
})
