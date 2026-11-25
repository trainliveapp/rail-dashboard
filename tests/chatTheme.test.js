import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHAT_THEME_KEY,
  DEFAULT_CHAT_THEME,
  readChatTheme,
  saveChatTheme,
} from '../src/lib/chatTheme.js'

function storage() {
  const entries = new Map()
  return {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
  }
}

test('Chat appearance defaults to light and persists only supported themes', () => {
  const saved = storage()
  assert.equal(CHAT_THEME_KEY, 'stationlive.chatter.theme')
  assert.equal(DEFAULT_CHAT_THEME, 'light')
  assert.equal(readChatTheme(saved), 'light')

  for (const theme of ['light', 'dark', 'artwork']) {
    assert.equal(saveChatTheme(saved, theme), true)
    assert.equal(readChatTheme(saved), theme)
  }

  assert.equal(saveChatTheme(saved, 'custom'), false)
  assert.equal(readChatTheme(saved), 'artwork')
})

test('invalid saved themes and unavailable storage safely fall back to light', () => {
  const saved = storage()
  saved.setItem(CHAT_THEME_KEY, 'sepia')
  assert.equal(readChatTheme(saved), 'light')

  const blocked = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
  }
  assert.equal(readChatTheme(blocked), 'light')
  assert.equal(saveChatTheme(blocked, 'dark'), false)
  assert.equal(saveChatTheme(blocked, 'invalid'), false)
})
