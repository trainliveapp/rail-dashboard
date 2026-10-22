import assert from 'node:assert/strict'
import test from 'node:test'
import { constrainPanelPosition } from '../src/lib/panelPosition.js'

test('allows movement within the viewport', () => {
  assert.deepEqual(constrainPanelPosition({ x: 40, y: -30 },
    { left: 200, top: 150 }, { width: 600, height: 500 }, { width: 1000, height: 800 }),
  { x: 40, y: -30 })
})

test('keeps every edge of the reporting box on screen', () => {
  const constrain = (position) => constrainPanelPosition(position,
    { left: 200, top: 150 }, { width: 600, height: 500 }, { width: 1000, height: 800 })
  assert.deepEqual(constrain({ x: -1000, y: -1000 }), { x: -188, y: -138 })
  assert.deepEqual(constrain({ x: 1000, y: 1000 }), { x: 188, y: 138 })
})

test('constrains a phone-sized panel after the viewport or form size changes', () => {
  assert.deepEqual(constrainPanelPosition({ x: 200, y: -200 },
    { left: 16, top: 16 }, { width: 358, height: 812 }, { width: 390, height: 844 }),
  { x: 4, y: -4 })
})
