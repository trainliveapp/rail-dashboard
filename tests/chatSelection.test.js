import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { CHAT_SELECTION_KEY, readChatSelection, saveChatSelection, CHAT_FAVOURITES_KEY, readChatFavourites, saveChatFavourites } from '../src/lib/chatSelection.js'
import { CHAT_CHANNELS, NATIONAL_RAIL_CHANNELS, getChatChannel, searchChatChannels } from '../src/data/chatChannels.js'

function storage() {
  const entries = new Map()
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, String(value)) }
}

test('favourites persist stable line and operator IDs independently of selection', () => {
  const saved = storage()
  const ids = ['underground_northern', 'national_rail_northern']
  saveChatSelection(saved, 'underground_central')
  saveChatFavourites(saved, ids)
  assert.deepEqual(readChatFavourites(saved), ids)
  assert.equal(readChatSelection(saved), 'underground_central')
  saveChatFavourites(saved, ids.slice(1))
  assert.deepEqual(readChatFavourites(saved), ids.slice(1))
  saveChatFavourites(saved, [])
  assert.deepEqual(readChatFavourites(saved), [])
})

test('favourites discard stale IDs, duplicates, malformed data and tolerate blocked storage', () => {
  const saved = storage()
  for (const value of ['broken', '{}', 'null', '42']) {
    saved.setItem(CHAT_FAVOURITES_KEY, value)
    assert.deepEqual(readChatFavourites(saved), [])
  }
  saved.setItem(CHAT_FAVOURITES_KEY, JSON.stringify(['underground_central', 'Central Line', 'underground_central', null, 'retired']))
  assert.deepEqual(readChatFavourites(saved), ['underground_central'])
  const blocked = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } }
  assert.deepEqual(readChatFavourites(blocked), [])
  assert.doesNotThrow(() => saveChatFavourites(blocked, ['underground_central']))
})

test('first use and invalid persisted selections open without a channel', () => {
  const saved = storage()
  assert.equal(readChatSelection(saved), null)
  for (const id of ['0', 'Central Line', 'retired-channel', 'null']) {
    saved.setItem(CHAT_SELECTION_KEY, id)
    assert.equal(readChatSelection(saved), null)
    assert.equal(saveChatSelection(saved, id), false)
  }
})

test('every active stable ID survives a fresh read and can be changed', () => {
  const saved = storage()
  assert.equal(CHAT_SELECTION_KEY, 'stationlive.chatter.selectedChannel')
  for (const channel of CHAT_CHANNELS) {
    assert.equal(saveChatSelection(saved, channel.id), true)
    assert.equal(readChatSelection(saved), channel.id)
    assert.equal(getChatChannel(readChatSelection(saved)), channel)
  }
})

test('blocked storage permits session selection without crashing', () => {
  const blocked = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } }
  assert.equal(readChatSelection(blocked), null)
  assert.equal(saveChatSelection(blocked, 'underground_jubilee'), true)
})

test('operator search is scoped, case insensitive, and treats markup as text', () => {
  assert.deepEqual(searchChatChannels('nOrThErN', NATIONAL_RAIL_CHANNELS).map(c => c.id), ['national_rail_great_northern', 'national_rail_northern'])
  assert.deepEqual(searchChatChannels('Central Line', NATIONAL_RAIL_CHANNELS), [])
  assert.equal(searchChatChannels('cEnTrAl LiNe')[0].id, 'underground_central')
  assert.deepEqual(searchChatChannels('<img src=x onerror=alert(1)>'), [])
  assert.equal(getChatChannel('national_rail_great_western_railway').backgroundKey, 'great western railway')
})

test('database line mapping includes every London picker ID and matching report line', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261110000000_fix_hammersmith_channel_mapping.sql', import.meta.url), 'utf8')
  for (const channel of CHAT_CHANNELS.filter(c => c.reportLineId)) {
    assert.ok(migration.includes(`when '${channel.id}' then '${channel.reportLineId}'`), channel.id)
  }
})
