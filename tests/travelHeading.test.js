import test from 'node:test'
import assert from 'node:assert/strict'
import { updateTravelHeading, animateHeadingUp, normalizeHeading, headingDelta } from '../src/lib/travelHeading.js'
const now = 100000
const fix = (lng, timestamp, extra = {}) => ({ lat: 51.495, lng, timestamp, accuracy: 5, speed: null, heading: null, ...extra })
test('Turnham Green eastbound, westbound and reversal keep actual travel at screen top', () => {
  let state = updateTravelHeading(null, fix(-0.257, now), now)
  state = updateTravelHeading(state, fix(-0.256, now + 10000), now + 10000)
  assert.ok(Math.abs(state.heading - 90) < 1)
  assert.equal(state.moving, true)
  state = updateTravelHeading(state, fix(-0.257, now + 20000), now + 20000)
  assert.ok(Math.abs(state.heading - 270) < 1)
  const callbacks = new Map()
  let id = 0, bearing = 270
  const scheduler = { requestAnimationFrame(fn) { callbacks.set(++id, fn); return id }, cancelAnimationFrame(i) { callbacks.delete(i) } }
  animateHeadingUp({ getBearing: () => bearing, setBearing(value) { bearing = value } }, state.heading, scheduler)
  const step = time => { const entries = [...callbacks.values()]; callbacks.clear(); entries.forEach(fn => fn(time)) }
  step(0); step(450)
  assert.ok(Math.abs(headingDelta(270, normalizeHeading(bearing))) <= 90)
  step(900)
  assert.ok(Math.abs(headingDelta(0, normalizeHeading(state.heading + bearing))) < 0.001)
})
test('stationary jitter, poor accuracy, stale fixes and outages cannot change heading', () => {
  let state = updateTravelHeading(null, fix(-0.257, now, { heading: 90, speed: 10 }), now)
  assert.equal(state.heading, 90)
  for (const extra of [{ speed: 0, heading: 270 }, { accuracy: 100, heading: 270, speed: 10 }, { timestamp: now - 20000, speed: 10, heading: 270 }]) {
    const next = updateTravelHeading(state, fix(-0.25699, now + 1000, extra), now + 1000)
    assert.equal(next.heading, 90)
    assert.equal(next.moving, false)
  }
  state = updateTravelHeading(state, fix(-0.25699, now + 1000), now + 1000)
  assert.equal(state.moving, false)
  assert.equal(state.heading, 90)
  assert.equal(headingDelta(359, 1), 2)
  assert.equal(headingDelta(1, 359), -2)
})
