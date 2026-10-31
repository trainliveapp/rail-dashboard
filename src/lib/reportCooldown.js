export const REPORT_COOLDOWN_MS = 30 * 60 * 1000
const storageKey = 'rail-dashboard-report-submission'
let cached = null
let token

export function getReportToken() {
  if (token) return token
  try {
    token = window.localStorage.getItem(`${storageKey}-token`)
    if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token || '')) {
      token = crypto.randomUUID()
      window.localStorage.setItem(`${storageKey}-token`, token)
    }
  } catch { token ||= crypto.randomUUID() }
  return token
}

export function readReportSubmission() {
  try { cached = JSON.parse(window.localStorage.getItem(storageKey) || 'null') }
  catch { /* Keep the in-memory state when storage is blocked. */ }
  // Accept the single-report cache from older app versions.
  return Array.isArray(cached) ? cached : cached ? [cached] : []
}

export function saveReportSubmission(state) {
  cached = Array.isArray(state) ? state : state ? [state] : []
  try { window.localStorage.setItem(storageKey, JSON.stringify(cached)) } catch { /* Use memory. */ }
  window.dispatchEvent(new Event('report-submission-changed'))
}

export function reportCooldownRemaining(state, now = Date.now()) {
  return Math.max(0, (Number(state?.nextAllowedAt) || 0) - now)
}

export function canUndoReport(state, stationName, category, now = Date.now()) {
  const submission = getIconSubmission(state, stationName, category)
  return reportCooldownRemaining(submission, now) > 0 && !submission.undone &&
    ['ACTIVE', 'CONFIRMED'].includes(submission.report?.status || 'ACTIVE')
}

export function getIconSubmission(state, stationName, category) {
  const entries = Array.isArray(state) ? state : state ? [state] : []
  return entries.find((entry) => entry.report?.stationName === stationName && entry.report?.category === category)
}
