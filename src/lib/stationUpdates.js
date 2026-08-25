import { supabase } from './supabaseClient'

// Real data layer for the report + live update feed shown in
// JourneyResults, backed by the station_updates table. Run
// supabase/station_updates.sql in your Supabase project's SQL editor once
// before any of this will return data.

function toneToColor(tone) {
  if (tone === 'rose') return '#be123c'
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
    minutesAgo: minutesAgo(row.created_at),
  }
}

function isVisibleUpdate(row) {
  return row.kind === 'chat' || row.status === 'ACTIVE' || row.status === 'CONFIRMED'
}

// Everything currently posted for the stations a journey option passes
// through, newest first. Called once when a journey is selected.
export async function getStationUpdates(stationNames) {
  if (!stationNames.length) return []

  const { data, error } = await supabase
    .from('station_updates')
    .select('*')
    .in('station_name', stationNames)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data.map(mapRow).filter(isVisibleUpdate)
}

// Keeps the feed live: any row inserted for one of these stations while the
// journey is open arrives here immediately via Supabase Realtime, no
// refresh or re-fetch needed. Call the returned function on unmount (or
// whenever the station list changes) to close the subscription.
export function subscribeToStationUpdates(stationNames, onInsert) {
  if (!stationNames.length) return () => {}
  const stationSet = new Set(stationNames)

  const channel = supabase
    .channel(`station-updates-${stationNames.join('-')}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'station_updates' },
      (payload) => {
        if (stationSet.has(payload.new.station_name)) {
          onInsert(mapRow(payload.new))
        }
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

// Used by ReportIssueModal. stationName is the resolved station from the
// picker if the person chose one, locationText is whatever they typed or
// "near <lat>,<lng>" if they used their current position and it didn't
// resolve to a known station, either can be null but not both.
export async function postReport({ stationName, locationText, category, label, tone, message, whereOn }) {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!stationName && !locationText) throw new Error('Add a location for this report.')

  const { data, error } = await supabase.from('station_updates').insert({
    station_name: stationName,
    kind: 'report',
    category,
    label,
    tone,
    message,
    where_on: whereOn,
    location_text: locationText || null,
    author_id: user?.id || null,
    author_initial: user ? (user.email || '?')[0] : 'A',
  }).select('*').single()

  if (error) throw error
  return mapRow(data)
}

// Used by a chat-style composer at a station, short freeform updates for
// other riders, the "live chat" feature. Kept separate from postReport
// since a chat message has no category/severity, just station + text.
export async function postChatMessage({ stationName, message }) {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!user) throw new Error('Sign in to post an update.')

  const { error } = await supabase.from('station_updates').insert({
    station_name: stationName,
    kind: 'chat',
    message,
    tone: 'blue',
    author_id: user.id,
    author_initial: (user.email || '?')[0],
  })

  if (error) throw error
}

// The tap-to-confirm ("confirmed by N riders") action on a report.
export async function confirmUpdate(id) {
  const { error } = await supabase.rpc('increment_confirms', { update_id: id })
  if (error) throw error
}
