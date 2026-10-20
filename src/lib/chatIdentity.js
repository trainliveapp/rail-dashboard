let visitorId

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
