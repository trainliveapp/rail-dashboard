import test from 'node:test'
import assert from 'node:assert/strict'
import { ensureChatIdentity, updateChatDisplayName, validateChatDisplayName } from '../src/lib/chatIdentity.js'

function fakeClient({ session = null, profile = { handle: 'guest123456789abc', display_name: 'Guest 9ABC' } } = {}) {
  const calls = []
  let currentSession = session
  const client = {
    calls,
    auth: {
      async getSession() {
        calls.push('getSession')
        return { data: { session: currentSession }, error: null }
      },
      async signInAnonymously() {
        calls.push('signInAnonymously')
        currentSession = { user: { id: 'guest-user' } }
        return { data: { session: currentSession }, error: null }
      },
    },
    async rpc(name, args) {
      calls.push({ name, args })
      if (name === 'set_chat_display_name') return { data: [{ ...profile, display_name: args.p_display_name }], error: null }
      return { data: [profile], error: null }
    },
  }
  return client
}

test('anonymous identity restores a persisted session rather than signing in again', async () => {
  const client = fakeClient({ session: { user: { id: 'persisted-user' } } })
  const identity = await ensureChatIdentity(client)

  assert.equal(identity.user.id, 'persisted-user')
  assert.equal(identity.profile.handle, 'guest123456789abc')
  assert.deepEqual(client.calls, ['getSession', { name: 'get_my_chat_profile', args: undefined }])
})

test('a guest session is reused on subsequent opens', async () => {
  const client = fakeClient()
  const first = await ensureChatIdentity(client)
  const reopened = await ensureChatIdentity(client)

  assert.equal(first.user.id, reopened.user.id)
  assert.equal(client.calls.filter((call) => call === 'signInAnonymously').length, 1)
})

test('concurrent identity requests create only one anonymous session', async () => {
  const client = fakeClient()
  const [first, second] = await Promise.all([
    ensureChatIdentity(client),
    ensureChatIdentity(client),
  ])

  assert.equal(first.user.id, second.user.id)
  assert.equal(client.calls.filter((call) => call === 'signInAnonymously').length, 1)
})

test('display names allow duplicates but reject invalid and reserved names', () => {
  assert.equal(validateChatDisplayName('  London   Commuter  '), 'London Commuter')
  assert.equal(validateChatDisplayName('London Commuter'), validateChatDisplayName('London Commuter'))
  for (const value of ['', 'A', 'x'.repeat(33), 'admin', 'SYSTEM', 'bad\nname', null]) {
    assert.throws(() => validateChatDisplayName(value))
  }
})

test('display-name update sends only the editable field and retains the handle', async () => {
  const client = fakeClient()
  const profile = await updateChatDisplayName(client, 'A commuter')
  const request = client.calls.find((call) => call?.name === 'set_chat_display_name')

  assert.deepEqual(request.args, { p_display_name: 'A commuter' })
  assert.equal(profile.handle, 'guest123456789abc')
  assert.equal(profile.display_name, 'A commuter')
})
