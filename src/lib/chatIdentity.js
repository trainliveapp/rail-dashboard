let visitorId
const identityRequests = new WeakMap()

const RESERVED_CHAT_NAMES = new Set([
  'admin',
  'administrator',
  'moderator',
  'official',
  'station live',
  'station live guest',
  'station live moderator',
  'station live user',
  'trainlive',
  'trainlive guest',
  'trainlive staff',
  'trainlive user',
  'support',
  'system',
])

export const CHAT_TURNSTILE_SITE_KEY = import.meta.env?.VITE_TURNSTILE_SITE_KEY || ''

function containsControlCharacters(value) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0)
    return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)
  })
}

export function validateChatDisplayName(value) {
  if (typeof value !== 'string' || containsControlCharacters(value)) {
    throw new Error('Choose a valid display name.')
  }
  const displayName = value.trim().replace(/\s+/g, ' ')
  const characterCount = [...displayName].length
  if (
    characterCount < 2 ||
    characterCount > 32 ||
    RESERVED_CHAT_NAMES.has(displayName.toLowerCase())
  ) {
    throw new Error('Display names must be 2-32 characters and cannot use a reserved name.')
  }
  return displayName
}

export async function ensureChatIdentity(client, captchaToken = '') {
  let requests = identityRequests.get(client)
  const pendingRequest = requests?.get(captchaToken)
  if (pendingRequest) return pendingRequest

  const request = (async () => {
    const { data: sessionData, error: sessionError } = await client.auth.getSession()
    if (sessionError) throw sessionError

    let session = sessionData?.session
    if (!session) {
      if (CHAT_TURNSTILE_SITE_KEY && !captchaToken) {
        throw new Error('Complete the CAPTCHA to create your guest session.')
      }
      const { data, error } = await client.auth.signInAnonymously(
        captchaToken ? { options: { captchaToken } } : undefined
      )
      if (error) {
        if (error.message?.toLowerCase().includes('no captcha_token found')) {
          throw new Error(
            'Supabase CAPTCHA is enabled, but this app has no public Turnstile site key. Set VITE_TURNSTILE_SITE_KEY to the Site Key for the widget configured in Supabase (not its Secret Key), then restart Vite.'
          )
        }
        throw error
      }
      session = data?.session
    }
    if (!session?.user) throw new Error('Could not establish a Chatter guest session.')

    const { data, error } = await client.rpc('get_my_chat_profile')
    if (error) throw error
    const profile = Array.isArray(data) ? data[0] : data
    if (!profile?.handle || !profile?.display_name) {
      throw new Error('Your Chatter profile could not be loaded.')
    }
    return { user: session.user, profile }
  })()

  if (!requests) {
    requests = new Map()
    identityRequests.set(client, requests)
  }
  requests.set(captchaToken, request)
  try {
    return await request
  } finally {
    if (requests.get(captchaToken) === request) requests.delete(captchaToken)
    if (requests.size === 0) identityRequests.delete(client)
  }
}

export async function updateChatDisplayName(client, value) {
  const displayName = validateChatDisplayName(value)
  const { data, error } = await client.rpc('set_chat_display_name', {
    p_display_name: displayName,
  })
  if (error) throw error
  const profile = Array.isArray(data) ? data[0] : data
  if (!profile?.handle || !profile?.display_name) {
    throw new Error('Your Chatter profile could not be updated.')
  }
  return profile
}

// Keep guest reactions associated with this browser without creating an account.
export function getChatVisitorId() {
  if (visitorId) return visitorId
  try {
    visitorId = window.localStorage.getItem('rail-dashboard-chat-visitor-id')
    if (!visitorId) {
      visitorId = crypto.randomUUID()
      window.localStorage.setItem('rail-dashboard-chat-visitor-id', visitorId)
    }
  } catch {
    visitorId = crypto.randomUUID()
  }
  return visitorId
}
