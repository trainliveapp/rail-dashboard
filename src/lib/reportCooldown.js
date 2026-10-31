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
  return cached
}

export function saveReportSubmission(state) {
  cached = state
  try { window.localStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* Use memory. */ }
  window.dispatchEvent(new Event('report-submission-changed'))
}

export function reportCooldownRemaining(state, now = Date.now()) {
  return Math.max(0, (Number(state?.nextAllowedAt) || 0) - now)
}

export function canUndoReport(state, stationName, category, now = Date.now()) {
  return reportCooldownRemaining(state, now) > 0 && !state.undone &&
    state.report?.stationName === stationName && state.report?.category === category
}
