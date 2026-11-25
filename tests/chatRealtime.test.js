import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mergeChatMessages,
  mergeChannelMessage,
  publicChatMessage,
  subscribeToChatMessages,
} from '../src/lib/chatRealtime.js'

function fakeSupabase() {
  const state = { name: null, options: null, event: null, filter: null, onMessage: null, onStatus: null, removed: [] }
  const channel = {
    on(event, filter, callback) {
      state.event = event
      state.filter = filter
      state.onMessage = callback
      return this
    },
    subscribe(callback) {
      state.onStatus = callback
      return this
    },
  }
  return {
    state,
    channel(name, options) {
      state.name = name
      state.options = options
      return channel
    },
    removeChannel(removedChannel) {
      state.removed.push(removedChannel)
    },
  }
}

const message = (id, channel_id, created_at = '2026-11-25T10:00:00.000Z', text = id) => ({
  id,
  channel_id,
  created_at,
  message: text,
})

test('history arriving after a realtime insert merges without losing the live message', () => {
  const realtime = message('live', 'underground_central', '2026-11-25T10:02:00.000Z')
  const history = [message('old', 'underground_central'), realtime]
  const afterLiveEvent = mergeChannelMessage([], realtime, 'underground_central')
  const merged = mergeChatMessages(afterLiveEvent, history)

  assert.deepEqual(merged.map((item) => item.id), ['old', 'live'])
})

test('repeated delivery and history overlap deduplicate by message ID', () => {
  const item = message('same-id', 'underground_central')
  const merged = mergeChatMessages(
    mergeChannelMessage([], item, 'underground_central'),
    [item],
    [item]
  )

  assert.equal(merged.length, 1)
  assert.equal(merged[0].id, 'same-id')
})

test('message order breaks equal server timestamps by primary ID', () => {
  const timestamp = '2026-11-25T10:00:00.000Z'
  const merged = mergeChatMessages([
    message('b', 'underground_central', timestamp),
    message('a', 'underground_central', timestamp),
  ])
  assert.deepEqual(merged.map((item) => item.id), ['a', 'b'])
})

test('public message data omits the internal author and idempotency IDs', () => {
  const visible = publicChatMessage({
    ...message('one', 'underground_central'),
    author_id: 'auth-uuid',
    client_message_id: 'client-uuid',
  })
  assert.equal('author_id' in visible, false)
  assert.equal('client_message_id' in visible, false)
})

test('the private room subscription batches message IDs and catches up after reconnect', async () => {
  const client = fakeSupabase()
  const received = []
  let catchUps = 0
  const cleanup = subscribeToChatMessages(client, 'underground_central', {
    onMessageIds: async (ids) => received.push(...ids),
    onSubscribed: () => { catchUps += 1 },
  })

  assert.equal(client.state.name, 'chatter:underground_central')
  assert.deepEqual(client.state.options, { config: { private: true } })
  assert.equal(client.state.event, 'broadcast')
  assert.deepEqual(client.state.filter, { event: 'message_inserted' })
  client.state.onStatus('SUBSCRIBED')
  client.state.onStatus('CLOSED')
  client.state.onStatus('SUBSCRIBED')
  client.state.onMessage({ payload: { id: 'one', message: 'content is ignored' } })
  client.state.onMessage({ payload: { id: 'two' } })
  client.state.onMessage({ payload: { id: 'one' } })
  await new Promise((resolve) => setTimeout(resolve, 60))

  assert.equal(catchUps, 2)
  assert.deepEqual(received, ['one', 'two'])
  cleanup()
  client.state.onMessage({ payload: { id: 'late' } })
  client.state.onStatus('SUBSCRIBED')
  await new Promise((resolve) => setTimeout(resolve, 60))
  assert.equal(received.length, 2)
  assert.equal(catchUps, 2)
  assert.equal(client.state.removed.length, 1)
})

test('broadcast callbacks expose only message IDs and stop after disposal', async () => {
  const client = fakeSupabase()
  const received = []
  const cleanup = subscribeToChatMessages(client, 'underground_central', {
    onMessageIds: async (ids) => received.push(...ids),
  })
  client.state.onMessage({ payload: { id: 'current' } })
  client.state.onMessage({ payload: { id: 'invalid', content: message('foreign', 'underground_jubilee') } })
  await new Promise((resolve) => setTimeout(resolve, 60))
  cleanup()
  client.state.onMessage({ payload: { id: 'late' } })
  await new Promise((resolve) => setTimeout(resolve, 60))

  assert.deepEqual(received, ['current', 'invalid'])
})
