const MESSAGE_BATCH_DELAY_MS = 40
const MESSAGE_BATCH_SIZE = 100

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

export function subscribeToChatMessages(client, channelId, { onMessageIds, onSubscribed, onStatus }) {
  let active = true
  let flushing = false
  let flushTimer = null
  const pendingIds = new Set()

  const flush = async () => {
    flushTimer = null
    if (!active || flushing || pendingIds.size === 0) return

    const ids = [...pendingIds].slice(0, MESSAGE_BATCH_SIZE)
    for (const id of ids) pendingIds.delete(id)
    flushing = true
    try {
      await onMessageIds(ids)
    } catch (error) {
      onStatus?.('MESSAGE_FETCH_ERROR', error)
    } finally {
      flushing = false
      if (active && pendingIds.size > 0) {
        flushTimer = setTimeout(flush, MESSAGE_BATCH_DELAY_MS)
      }
    }
  }

  const channel = client
    .channel(`chatter:${channelId}`, { config: { private: true } })
    .on('broadcast', { event: 'message_inserted' }, ({ payload }) => {
      if (!active || typeof payload?.id !== 'string' || payload.id.length > 80) return
      pendingIds.add(payload.id)
      if (flushTimer === null && !flushing) {
        flushTimer = setTimeout(flush, MESSAGE_BATCH_DELAY_MS)
      }
    })
    .subscribe((status, error) => {
      if (!active) return
      if (status === 'SUBSCRIBED') onSubscribed?.()
      onStatus?.(status, error)
    })

  return () => {
    if (!active) return
    active = false
    if (flushTimer !== null) clearTimeout(flushTimer)
    pendingIds.clear()
    return client.removeChannel(channel)
  }
}
