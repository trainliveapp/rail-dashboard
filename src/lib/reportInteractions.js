const storageKey = 'rail-dashboard-report-interactions'
const retentionMs = 24 * 60 * 60 * 1000
let cached = {}

function readInteractions() {
  try {
    cached = JSON.parse(window.localStorage.getItem(storageKey) || '{}') || {}
  } catch { /* Keep this session usable when storage is unavailable. */ }
  return cached
}

export function rememberReportInteraction(reportId, action, userId = null) {
  const entries = readInteractions()
  const now = Date.now()
  for (const key of Object.keys(entries)) {
    if (now - entries[key] > retentionMs) delete entries[key]
  }
  entries[`${userId || 'guest'}:${action}:${reportId}`] = now
  try { window.localStorage.setItem(storageKey, JSON.stringify(entries)) } catch { /* Use memory instead. */ }
}

export function getReportInteraction(report, userId = null) {
  const entries = readInteractions()
  const has = (action) => Date.now() - entries[`${userId || 'guest'}:${action}:${report.id}`] < retentionMs
  return {
    isOwn: Boolean((userId && report.authorId === userId) || has('submitted')),
    hasConfirmed: has('confirmed'),
  }
}
