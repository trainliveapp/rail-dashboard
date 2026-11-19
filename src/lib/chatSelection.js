import { CHAT_CHANNELS } from '../data/chatChannels.js'

export const CHAT_SELECTION_KEY = 'stationlive.chatter.selectedChannel'
export const CHAT_FAVOURITES_KEY = 'stationlive.chatter.favouriteChannels'
const validChannelIds = new Set(CHAT_CHANNELS.map(({ id }) => id))

function validFavourites(ids) {
  return Array.isArray(ids) ? [...new Set(ids.filter(id => validChannelIds.has(id)))] : []
}

export function readChatFavourites(storage) {
  try { return validFavourites(JSON.parse(storage.getItem(CHAT_FAVOURITES_KEY))) } catch { return [] }
}

export function saveChatFavourites(storage, ids) {
  try { storage.setItem(CHAT_FAVOURITES_KEY, JSON.stringify(validFavourites(ids))) } catch { /* Favourites still work for this session. */ }
}

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
