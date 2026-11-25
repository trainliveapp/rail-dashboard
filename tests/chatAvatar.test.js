import test from 'node:test'
import assert from 'node:assert/strict'
import { getChatAvatar } from '../src/lib/chatAvatar.js'

test('avatar initials are readable and color remains stable for a guest handle', () => {
  const initial = getChatAvatar('London Commuter', 'guest0123456789ab')
  const renamed = getChatAvatar('Platform Observer', 'guest0123456789ab')

  assert.equal(initial.initials, 'LC')
  assert.equal(renamed.initials, 'PO')
  assert.equal(renamed.backgroundColor, initial.backgroundColor)
})

test('legacy contributors receive a deterministic badge without an account handle', () => {
  assert.deepEqual(
    getChatAvatar('Legacy · Northern Passenger'),
    getChatAvatar('Legacy · Northern Passenger')
  )
})
