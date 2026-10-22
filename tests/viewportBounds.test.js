import assert from 'node:assert/strict'
import test from 'node:test'
import { visibleViewportBounds } from '../src/lib/viewportBounds.js'
import { constrainPanelPosition } from '../src/lib/panelPosition.js'

test('falls back to the layout viewport when the visual viewport API is unavailable', () => {
  assert.deepEqual(visibleViewportBounds({ width: 320, height: 568 }), { left: 0, top: 0, width: 320, height: 568 })
})

test('uses the visible height and offsets when the mobile keyboard opens or the page is zoomed', () => {
  assert.deepEqual(visibleViewportBounds({ width: 390, height: 844 },
    { width: 260, height: 330, offsetLeft: 42, offsetTop: 180 }),
  { width: 260, height: 330, left: 42, top: 180 })
})

test('report panels stay inside narrow, rotated, keyboard-resized, and zoomed viewports', () => {
  const viewports = [
    { width: 320, height: 568, left: 0, top: 0 },
    { width: 360, height: 640, left: 0, top: 0 },
    { width: 390, height: 844, left: 0, top: 0 },
    { width: 430, height: 932, left: 0, top: 0 },
    { width: 844, height: 390, left: 0, top: 0 },
    { width: 390, height: 300, left: 0, top: 160 },
    { width: 260, height: 330, left: 42, top: 180 },
  ]
  for (const viewport of viewports) {
    const size = { width: Math.min(620, viewport.width - 24), height: Math.min(680, viewport.height - 24) }
    const origin = { left: 12, top: 12 }
    for (const attempted of [{ x: -2000, y: -2000 }, { x: 2000, y: 2000 }]) {
      const position = constrainPanelPosition(attempted, origin, size, viewport)
      assert.ok(origin.left + position.x >= viewport.left + 12)
      assert.ok(origin.top + position.y >= viewport.top + 12)
      assert.ok(origin.left + position.x + size.width <= viewport.left + viewport.width - 12)
      assert.ok(origin.top + position.y + size.height <= viewport.top + viewport.height - 12)
    }
  }
})
