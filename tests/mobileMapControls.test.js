import test from 'node:test'
import assert from 'node:assert/strict'
import { attachCooperativeMapGestures } from '../src/lib/cooperativeMapGestures.js'
import { requestMapLocation, locationErrorMessage } from '../src/lib/mapLocation.js'

function fixture() {
  const listeners = new Map()
  let enabled = true
  const hint = []
  let interacted = 0
  const container = {
    classList: { add() {}, remove() {} },
    addEventListener(type, handler, options) { assert.equal(options.passive, true); assert.equal(options.capture, true); listeners.set(type, handler) },
    removeEventListener(type, handler) { assert.equal(listeners.get(type), handler); listeners.delete(type) },
  }
  const pinch = { enabled: () => true }
  const map = { getContainer: () => container, dragging: { enabled: () => enabled, disable() { enabled = false }, enable() { enabled = true } }, touchZoom: pinch, touchRotate: pinch }
  const cleanup = attachCooperativeMapGestures(map, { onInteraction: () => interacted++, onHint: visible => hint.push(visible) })
  const emit = (type, points, popup = false) => listeners.get(type)({ target: { closest: () => popup }, touches: points.map(([clientX, clientY]) => ({ clientX, clientY })) })
  return { map, emit, cleanup, hint, listeners, enabled: () => enabled, interacted: () => interacted }
}

test('one-finger gestures leave page scrolling available and restore mouse dragging on release', () => {
  const f = fixture()
  f.emit('touchstart', [[0, 0]])
  assert.equal(f.enabled(), false)
  assert.deepEqual(f.hint, [true])
  f.emit('touchend', [])
  assert.equal(f.enabled(), true)
  f.cleanup()
  assert.equal(f.listeners.size, 0)
})

test('two-finger gestures retain pinch/rotation and stop automatic follow', () => {
  const f = fixture()
  f.emit('touchstart', [[0, 0]])
  f.emit('touchstart', [[0, 0], [30, 30]])
  assert.equal(f.interacted(), 1)
  assert.equal(f.map.touchZoom.enabled(), true)
  assert.equal(f.map.touchRotate.enabled(), true)
  assert.equal(f.enabled(), false)
  f.cleanup()
})

test('popup interactions are untouched and unmount restores mouse dragging', () => {
  const f = fixture()
  f.emit('touchstart', [[0, 0]], true)
  assert.equal(f.enabled(), true)
  f.emit('touchstart', [[0, 0]])
  f.cleanup()
  assert.equal(f.enabled(), true)
})

test('Locate requests a fix once, returns validated coordinates and accuracy', async () => {
  let calls = 0
  const result = await requestMapLocation({ getCurrentPosition(success, error, options) {
    calls++
    assert.deepEqual(options, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 })
    success({ coords: { latitude: 51.5, longitude: -0.12, heading: null, accuracy: 20 } })
  } }, true)
  assert.equal(calls, 1)
  assert.deepEqual(result, { lat: 51.5, lng: -0.12, heading: 0, accuracy: 20 })
})

test('insecure, unavailable, invalid and denied/timeout requests produce retryable errors', async () => {
  await assert.rejects(requestMapLocation(null, false), /HTTPS/)
  await assert.rejects(requestMapLocation(null, true), /not available/)
  await assert.rejects(requestMapLocation({ getCurrentPosition(success) { success({ coords: { latitude: NaN, longitude: 0 } }) } }, true), /valid location/)
  for (const code of [1, 2, 3]) {
    await assert.rejects(requestMapLocation({ getCurrentPosition(success, failure) { failure({ code }) } }, true), error => error.code === code)
    assert.match(locationErrorMessage({ code }), /retry/i)
  }
})

// Exercise the installed rotation plugin, not a replacement gesture algorithm.
test('installed leaflet-rotate two-finger handler pans at constant distance and supports pinch/rotation', async () => {
  const { readFile } = await import('node:fs/promises')
  const { runInNewContext } = await import('node:vm')
  class Point {
    constructor(x, y) { this.x = x; this.y = y }
    subtract(p) { return new Point(this.x - p.x, this.y - p.y) }
    _subtract(p) { this.x -= p.x; this.y -= p.y; return this }
    add(p) { return new Point(this.x + p.x, this.y + p.y) }
    _add(p) { this.x += p.x; this.y += p.y; return this }
    _divideBy(n) { this.x /= n; this.y /= n; return this }
    distanceTo(p) { return Math.hypot(this.x - p.x, this.y - p.y) }
    rotate(a) { return new Point(this.x * Math.cos(a) - this.y * Math.sin(a), this.x * Math.sin(a) + this.y * Math.cos(a)) }
  }
  const events = { on() { return this }, off() { return this }, preventDefault(e) { e.prevented = true } }
  const L = {
    Map: { mergeOptions() {}, addInitHook() {} },
    Handler: { extend: proto => proto }, DomEvent: events,
    DomUtil: { RAD_TO_DEG: 180 / Math.PI, DEG_TO_RAD: Math.PI / 180 },
    Util: { cancelAnimFrame() {}, requestAnimFrame(fn) { fn(); return 1 } },
  }
  runInNewContext(await readFile(new URL('../node_modules/leaflet-rotate/src/map/handler/TouchGestures.js', import.meta.url), 'utf8'), { L, document: {} })
  let bearing = 0
  let moved
  const map = {
    options: { touchRotate: true, touchZoom: true, bounceAtZoomLimits: true, zoomAnimation: false },
    getSize: () => new Point(320, 400), mouseEventToContainerPoint: t => new Point(t.clientX, t.clientY),
    containerPointToLatLng: p => p, project: p => p, unproject: p => p,
    getBearing: () => bearing, setBearing(value) { bearing = value },
    getZoom: () => 16, getScaleZoom: (scale, zoom) => zoom + Math.log2(scale),
    _stop() {}, _moveStart() {}, _move(center, zoom) { moved = { center, zoom } },
    _limitZoom: zoom => zoom, _resetView() {},
  }
  const handler = Object.create(L.Map.TouchGestures)
  handler.initialize(map)
  const touch = (x, y) => ({ clientX: x, clientY: y })
  const start = { touches: [touch(100, 100), touch(140, 100)] }
  handler._onTouchStart(start)
  assert.equal(start.prevented, true)
  const pan = { touches: [touch(120, 130), touch(160, 130)] }
  handler._onTouchMove(pan)
  assert.equal(pan.prevented, true)
  assert.equal(moved.zoom, 16)
  assert.equal(moved.center.x, 140)
  assert.equal(moved.center.y, 170)
  handler._onTouchMove({ touches: [touch(100, 100), touch(180, 100)] })
  assert.equal(moved.zoom, 17)
  handler._onTouchMove({ touches: [touch(100, 100), touch(100, 140)] })
  assert.notEqual(bearing, 0)
  handler._onTouchEnd()
})


test('gesture hint appears once, dismisses automatically and never blocks two-finger interaction', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const f = fixture()
  f.emit('touchstart', [[0, 0]])
  assert.deepEqual(f.hint, [true])
  t.mock.timers.tick(3500)
  assert.deepEqual(f.hint, [true, false])
  f.emit('touchend', [])
  f.emit('touchstart', [[0, 0]])
  assert.deepEqual(f.hint, [true, false])
  f.emit('touchstart', [[0, 0], [30, 30]])
  assert.equal(f.hint.at(-1), false)
  assert.equal(f.interacted(), 1)
  f.cleanup()
})
