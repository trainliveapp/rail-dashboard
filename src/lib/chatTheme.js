export const CHAT_THEME_KEY = 'stationlive.chatter.theme'
export const CHAT_THEMES = ['light', 'dark', 'artwork']
export const DEFAULT_CHAT_THEME = 'light'

function isChatTheme(value) {
  return CHAT_THEMES.includes(value)
}

export function readChatTheme(storage) {
  try {
    const savedTheme = storage?.getItem(CHAT_THEME_KEY)
    return isChatTheme(savedTheme) ? savedTheme : DEFAULT_CHAT_THEME
  } catch {
    return DEFAULT_CHAT_THEME
  }
}

export function saveChatTheme(storage, theme) {
  if (!storage || !isChatTheme(theme)) return false
  try {
    storage?.setItem(CHAT_THEME_KEY, theme)
    return true
  } catch {
    return false
  }
}
