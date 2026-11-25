export function mergeChatMessages(...groups) {
  const byId = new Map()
  for (const message of groups.flat()) {
    if (!message?.id) continue
    const previous = byId.get(message.id)
    byId.set(message.id, previous ? { ...previous, ...message } : message)
  }
  return [...byId.values()].sort((a, b) => {
    const time = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return time || String(a.id).localeCompare(String(b.id))
  })
}

export function mergeChannelMessage(current, message, channelId) {
  return message?.channel_id === channelId ? mergeChatMessages(current, [message]) : current
}

export function publicChatMessage(message) {
  const visibleMessage = { ...message }
  delete visibleMessage.author_id
  delete visibleMessage.client_message_id
  return visibleMessage
}

export function subscribeToChatMessages(client, channelId, { onMessage, onSubscribed, onStatus }) {
  let active = true
  const channel = client
    .channel(`chat-messages-${channelId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `channel_id=eq.${channelId}`,
      },
      (payload) => {
        if (!active) return
        const message = payload.new
        if (message?.channel_id !== channelId) return
        onMessage(payload)
      }
    )
    .subscribe((status, error) => {
      if (!active) return
      if (status === "SUBSCRIBED") onSubscribed?.()
      onStatus?.(status, error)
    })

  return () => {
    if (!active) return
    active = false
    client.removeChannel(channel)
  }
}
