import { CHAT_CHANNELS } from '../data/chatChannels.js'

export const CHAT_SELECTION_KEY = 'stationlive.chatter.selectedChannel'
const validChannelIds = new Set(CHAT_CHANNELS.map(({ id }) => id))

export function readChatSelection(storage) {
  try {
    const id = storage.getItem(CHAT_SELECTION_KEY)
    return validChannelIds.has(id) ? id : null
  } catch { return null }
}

export function saveChatSelection(storage, id) {
  if (!validChannelIds.has(id)) return false
  try { storage.setItem(CHAT_SELECTION_KEY, id) } catch { /* Selection still works for this session. */ }
  return true
}
