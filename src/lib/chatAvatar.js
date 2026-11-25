const AVATAR_COLORS = [
  '#1d4ed8',
  '#047857',
  '#6d28d9',
  '#be123c',
  '#0e7490',
  '#b45309',
  '#4338ca',
  '#334155',
  '#0f766e',
  '#a21caf',
  '#c2410c',
  '#166534',
]

function hashString(value) {
  let hash = 2166136261
  for (const character of value) {
    hash = Math.imul(hash ^ character.codePointAt(0), 16777619)
  }
  return hash >>> 0
}

export function getChatAvatar(displayName, handle = '') {
  const nameParts = String(displayName || 'Guest').trim().split(/\s+/).filter(Boolean)
  const firstInitial = [...(nameParts[0] || 'G')][0]
  const lastInitial = nameParts.length > 1 ? [...nameParts[nameParts.length - 1]][0] : null
  const initials = `${firstInitial}${lastInitial || [...(nameParts[0] || 'G')][1] || ''}`.toUpperCase()
  const identity = handle || nameParts.join(' ').toLowerCase()

  return {
    initials,
    backgroundColor: AVATAR_COLORS[hashString(identity) % AVATAR_COLORS.length],
  }
}
