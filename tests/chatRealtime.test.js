import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mergeChatMessages,
  mergeChannelMessage,
  publicChatMessage,
  subscribeToChatMessages,
} from '../src/lib/chatRealtime.js'

function fakeSupabase() {
  const state = { name: null, filter: null, onMessage: null, onStatus: null, removed: [] }
  const channel = {
    on(_type, filter, callback) {
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
    channel(name) {
      state.name = name
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

test('the subscription scopes events and catches up on each subscribe after reconnect', () => {
  const client = fakeSupabase()
  const received = []
  let catchUps = 0
  const cleanup = subscribeToChatMessages(client, 'underground_central', {
    onMessage: (payload) => received.push(payload.new),
    onSubscribed: () => { catchUps += 1 },
  })

  assert.equal(client.state.name, 'chat-messages-underground_central')
  assert.equal(client.state.filter.event, 'INSERT')
  assert.equal(client.state.filter.filter, 'channel_id=eq.underground_central')
  client.state.onStatus('SUBSCRIBED')
  client.state.onStatus('CLOSED')
  client.state.onStatus('SUBSCRIBED')
  client.state.onMessage({ eventType: 'INSERT', new: message('other', 'underground_jubilee') })
  client.state.onMessage({ eventType: 'INSERT', new: message('current', 'underground_central') })

  assert.equal(catchUps, 2)
  assert.deepEqual(received.map((item) => item.id), ['current'])
  cleanup()
  client.state.onMessage({ eventType: 'INSERT', new: message('late', 'underground_central') })
  client.state.onStatus('SUBSCRIBED')
  assert.equal(received.length, 1)
  assert.equal(catchUps, 2)
  assert.equal(client.state.removed.length, 1)
})

test('messages from other channels are isolated', () => {
  const client = fakeSupabase()
  const received = []
  subscribeToChatMessages(client, 'underground_central', {
    onMessage: (payload) => received.push(payload),
    onSubscribed: () => {},
  })
  client.state.onMessage({
    eventType: 'INSERT',
    new: message('foreign', 'underground_jubilee'),
  })

  assert.deepEqual(received, [])
})
