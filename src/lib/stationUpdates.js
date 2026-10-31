import { supabase, isSupabaseConfigured } from './supabaseClient'
import { getReportInteraction, rememberReportInteraction } from './reportInteractions'
import { getReportToken, readReportSubmission, saveReportSubmission } from './reportCooldown'

export const UPDATE_VISIBILITY_WINDOW_MS = 24 * 60 * 60 * 1000

function activeSinceIso() {
  return new Date(Date.now() - UPDATE_VISIBILITY_WINDOW_MS).toISOString()
}

// Real data layer for the report + live update feed shown in
// JourneyResults, backed by the station_updates table. Run the migration in
// supabase/migrations before enabling station reporting in production.

function isMissingStationUpdatesTable(error) {
  return error?.code === '42P01' || error?.code === 'PGRST205'
}

function toneToColor(tone) {
  if (tone === 'rose') return '#ca8a04'
  if (tone === 'amber') return '#b45309'
  return '#1d4ed8'
}

function minutesAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime()
  return Math.max(0, Math.round(diffMs / 60000))
}

function mapRow(row) {
  return {
    id: row.id,
    authorId: row.author_id,
    stationName: row.station_name,
    kind: row.kind,
    category: row.category,
    label: row.label,
    tone: row.tone,
    color: toneToColor(row.tone),
    description: row.message,
    whereOn: row.where_on,
    locationText: row.location_text,
    initial: (row.author_initial || '?').toUpperCase(),
    confirms: row.confirms,
    status: row.status || 'ACTIVE',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    minutesAgo: minutesAgo(row.created_at),
  }
}

// Everything currently posted for the stations a journey option passes
// through, newest first. Called once when a journey is selected.
export async function getStationUpdates(stationNames, { all = false } = {}) {
  if (!stationNames.length) return []
  if (!isSupabaseConfigured) throw new Error('Station reporting is currently unavailable.')

  const rows = []
  const pageSize = all ? 500 : 20
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('station_updates')
      .select('*')
      .in('station_name', stationNames)
      .gte('created_at', activeSinceIso())
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) throw error
    rows.push(...data)
    if (!all || data.length < pageSize) break
    offset += pageSize
  }
  return rows.map(mapRow).filter((row) => new Date(row.createdAt).getTime() >= Date.now() - UPDATE_VISIBILITY_WINDOW_MS && (row.kind === 'chat' || ['ACTIVE', 'CONFIRMED'].includes(row.status)))
}

// Keeps the feed live: any row inserted for one of these stations while the
// journey is open arrives here immediately via Supabase Realtime, no
// refresh or re-fetch needed. Call the returned function on unmount (or
// whenever the station list changes) to close the subscription.
export function subscribeToStationUpdates(stationNames, onInsert) {
  if (!stationNames.length) return () => {}
  const stationSet = new Set(stationNames)
  const onLocalReport = (event) => { if (stationSet.has(event.detail.stationName)) onInsert(event.detail) }
  window.addEventListener('station-report-saved', onLocalReport)

  const channel = supabase
    .channel(`station-updates-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'station_updates' },
      (payload) => {
        if (stationSet.has(payload.new?.station_name)) {
          onInsert(mapRow(payload.new))
        }
      }
    )
    .subscribe()

  return () => {
    window.removeEventListener('station-report-saved', onLocalReport)
    supabase.removeChannel(channel)
  }
}

// Used by ReportIssueModal. stationName is the resolved station from the
// picker if the person chose one, locationText is whatever they typed or
// "near <lat>,<lng>" if they used their current position and it didn't
// resolve to a known station, either can be null but not both.
let reportMutationPending = false
let reportMutationRevision = 0

function saveSubmissionState(data) {
  const state = data ? {
    report: data.report ? mapRow(data.report) : null,
    nextAllowedAt: new Date(data.next_allowed_at).getTime(),
    undone: data.undone,
  } : null
  const previous = readReportSubmission()
  saveReportSubmission(state ? [state, ...previous.filter((entry) => entry.report?.stationName !== state.report?.stationName || entry.report?.locationText !== state.report?.locationText || entry.report?.category !== state.report?.category)] : previous)
  return state
}

export async function refreshReportSubmission() {
  if (!isSupabaseConfigured) return
  const revision = reportMutationRevision
  const { data, error } = await supabase.rpc('get_station_report_submission', { p_guest_token: getReportToken() })
  if (error) throw error
  // A refresh started before a tap must not overwrite that tap's state.
  if (!reportMutationPending && revision === reportMutationRevision) {
    const states = (Array.isArray(data) ? data : data ? [data] : []).map((entry) => ({
      report: entry.report ? mapRow(entry.report) : null,
      nextAllowedAt: new Date(entry.next_allowed_at).getTime(),
      undone: entry.undone,
    }))
    saveReportSubmission(states)
    return states
  }
}

export async function postReport(payload) {
  if (!isSupabaseConfigured) throw new Error('Station reporting is currently unavailable.')
  if (reportMutationPending) throw new Error('Your report is being saved. Please wait.')
  reportMutationPending = true
  reportMutationRevision += 1
  try { return await submitReport(payload) }
  finally { reportMutationPending = false }
}

async function submitReport({ stationName, locationText, category, label, tone, message, whereOn }) {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!stationName && !locationText) throw new Error('Add a location for this report.')

  const { data, error } = await supabase.rpc('submit_station_report', {
    p_guest_token: getReportToken(),
    p_report: { station_name: stationName, category, label, tone, message, where_on: whereOn, location_text: locationText || null },
  })

  if (error) {
    if (isMissingStationUpdatesTable(error) || error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('Station reporting is not configured yet. Run the station reporting migration in Supabase.')
    }
    throw error
  }
  const { report } = saveSubmissionState(data)
  rememberReportInteraction(report.id, 'submitted', user?.id)
  window.dispatchEvent(new CustomEvent('station-report-saved', { detail: report }))
  return report
}

export async function undoReport(reportId) {
  if (!reportId) throw new Error('Choose a reported issue to deselect.')
  if (reportMutationPending) throw new Error('Please wait for your report to finish saving.')
  reportMutationPending = true
  reportMutationRevision += 1
  try {
    const { data, error } = await supabase.rpc('undo_station_report', { p_guest_token: getReportToken(), p_report_id: reportId })
    if (error) throw error
    const { report } = saveSubmissionState(data)
    window.dispatchEvent(new CustomEvent('station-report-saved', { detail: report }))
    return report
  } finally { reportMutationPending = false }
}

// Used by a chat-style composer at a station, short freeform updates for
// other riders, the "live chat" feature. Kept separate from postReport
// since a chat message has no category/severity, just station + text.
export async function postChatMessage({ stationName, message }) {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!stationName || !message?.trim()) throw new Error('Choose a station and enter a message.')

  const { error } = await supabase.from('station_updates').insert({
    station_name: stationName,
    kind: 'chat',
    message: message.trim(),
    tone: 'blue',
    author_id: user?.id || null,
    author_initial: user ? (user.email || '?')[0] : 'G',
  })

  if (error) throw error
}

// The tap-to-confirm ("confirmed by N riders") action on a report.
export async function confirmUpdate(id) {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user?.id
  const { data: existing, error: lookupError } = await supabase.from('station_updates').select('*').eq('id', id).single()
  if (lookupError) throw lookupError
  const current = mapRow(existing)
  const interaction = getReportInteraction(current, userId)
  if (interaction.isOwn) throw new Error('Other passengers can confirm your report. You cannot confirm it yourself.')
  if (interaction.hasConfirmed) return current
  let visitorId = null
  if (typeof window !== 'undefined') {
    visitorId = window.localStorage.getItem('rail-dashboard-visitor-id')
    if (!visitorId) {
      visitorId = crypto.randomUUID()
      window.localStorage.setItem('rail-dashboard-visitor-id', visitorId)
    }
  }

  const { error } = await supabase.rpc('increment_confirms', {
    update_id: id,
    visitor_id: visitorId,
  })
  if (error) throw error
  rememberReportInteraction(id, 'confirmed', userId)
  const { data: updated, error: refreshError } = await supabase.from('station_updates').select('*').eq('id', id).single()
  if (refreshError) throw refreshError
  const report = mapRow(updated)
  window.dispatchEvent(new CustomEvent('station-report-saved', { detail: report }))
  return report
}
