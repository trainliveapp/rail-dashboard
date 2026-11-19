import { AlertTriangle, Megaphone, Users, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { stations as bundledStations } from '../data/mockData'
import LiveTickerPreferences from './LiveTickerPreferences'
import { ALL_UPDATES, matchesPreference, enrichUpdates, safeLineColor, resolveOperatorLines, readPreferences, savePreferences, validatePreferences } from '../lib/liveTicker'

async function readAll(table, columns, order = 'id') {
  const rows = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from(table).select(columns).order(order).order(order === 'station_id' ? 'line_id' : order).range(offset, offset + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

const feedIcons = { AlertTriangle, Users, Wrench, Megaphone }

const TFL_SYNC_INTERVAL = 24 * 60 * 60 * 1000
const TFL_SYNC_STORAGE_KEY = 'trainlive-tfl-last-sync'
const TFL_INITIAL_DELAY = 12 * 1000

function formatAge(createdAt) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 min ago'
  if (minutes < 60) return `${minutes} mins ago`
  const hours = Math.round(minutes / 60)
  return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`
}

export default function TopPromoBar() {
  const [trending, setTrending] = useState([])
  const [metadata, setMetadata] = useState({
    stations: bundledStations.map(({ id, name }) => ({ id, name })),
    lines: [],
    links: [],
  })
  const [preference, setPreference] = useState(ALL_UPDATES)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [metadataReady, setMetadataReady] = useState(false)
  const [feedError, setFeedError] = useState(false)
  useEffect(() => {
    let active = true
    Promise.allSettled([readAll('stations', 'id, name'), readAll('lines', 'id, name, colour'),
      readAll('station_lines', 'station_id, line_id, valid_from, valid_to', 'station_id')]).then(([stationResult, lineResult, linkResult]) => {
      if (!active) return
      // The map already ships with the canonical TfL station catalogue. Keep
      // that list available in the preferences panel if the metadata endpoint
      // is offline or its public read policy is misconfigured, then overlay
      // database rows so newly added canonical stations appear as well.
      const stationsById = new Map(bundledStations.map(({ id, name }) => [id, { id, name }]))
      if (stationResult.status === 'fulfilled') {
        stationResult.value.forEach(station => {
          if (station?.id && station?.name) stationsById.set(station.id, station)
        })
      }
      const stations = [...stationsById.values()]
      const lines = lineResult.status === 'fulfilled' ? lineResult.value : []
      const links = linkResult.status === 'fulfilled' ? linkResult.value : []
      const today = new Date().toISOString().slice(0, 10)
      const next = { stations: stations.sort((a, b) => a.name.localeCompare(b.name)), lines: lines.sort((a, b) => a.name.localeCompare(b.name)), links: links.filter(l => (!l.valid_from || l.valid_from <= today) && (!l.valid_to || l.valid_to >= today)) }
      setMetadata(next)
      try { setPreference(readPreferences(window.localStorage, next)) } catch { /* Use All updates if storage is unavailable. */ }
      setMetadataReady(true)
    }).catch(() => { /* The live feed remains available without metadata. */ })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true

    const syncTfLIfStale = async () => {
      let lastSync = 0
      try {
        lastSync = Number(window.localStorage.getItem(TFL_SYNC_STORAGE_KEY)) || 0
      } catch {
        // Syncing still works when browser storage is unavailable.
      }

      if (Date.now() - lastSync < TFL_SYNC_INTERVAL) return

      const { error } = await supabase.functions.invoke('sync-tfl-disruptions')
      if (!error) {
        try {
          window.localStorage.setItem(TFL_SYNC_STORAGE_KEY, String(Date.now()))
        } catch {
          // The next page load can retry when storage is unavailable.
        }
      }
    }

    const loadTrending = async ({ includeTfL = false } = {}) => {
      try {
        const data = []
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        for (let offset = 0; ; offset += 500) {
          const result = await supabase.from('station_updates')
            .select('id, station_name, kind, message, label, confirms, created_at, status')
            .in('status', ['ACTIVE', 'CONFIRMED']).gte('created_at', since)
            .order('confirms', { ascending: false }).order('created_at', { ascending: false }).order('id')
            .range(offset, offset + 499)
          if (result.error) throw result.error
          data.push(...result.data)
          if (result.data.length < 500) break
        }
        let tflData = []
        let tflError = null
        if (includeTfL) {
          await syncTfLIfStale()
          const result = await supabase
            .from('tfl_disruptions')
            .select('source_key, line_names, severity, status_description, reason, last_seen_at')
            .is('resolved_at', null)
            .gte('last_seen_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('severity', { ascending: true })
            .order('last_seen_at', { ascending: false })
            .limit(1000)
          tflData = result.data || []
          tflError = result.error
        }

        const reportRows = []
        const reportIds = (data || []).filter(row => row.kind !== 'chat').map(row => row.id)
        for (let offset = 0; offset < reportIds.length; offset += 100) {
          const result = await supabase.from('reports').select('id, station_id, report_lines(line_id)')
            .in('id', reportIds.slice(offset, offset + 100))
          if (!result.error) reportRows.push(...result.data)
        }
        if (!active) return
        if (!(includeTfL && tflError)) {
          const official = (tflData || []).map((item) => ({
            id: `tfl-${item.source_key}`,
            kind: 'tfl',
            station_name: item.line_names.join(', '),
            message: item.reason,
            label: item.status_description,
            confirms: null,
            created_at: item.last_seen_at,
            lineIds: resolveOperatorLines(item.line_names, metadata.lines),
          }))
          const community = enrichUpdates(data || [], metadata, reportRows)
          setTrending(current => [...(includeTfL ? official : current.filter(item => item.kind === 'tfl')), ...community])
          setFeedError(false)
        } else { setFeedError(true) }
      } catch {
        if (active) setFeedError(true)
        // Keep the current ticker updates if a refresh fails.
      }
    }

    loadTrending()
    const initialTfLTimer = window.setTimeout(() => {
      loadTrending({ includeTfL: true })
    }, TFL_INITIAL_DELAY)

    const channel = supabase
      .channel('trending-station-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'station_updates' }, loadTrending)
      .subscribe()
    const refreshTimer = window.setInterval(() => {
      loadTrending({ includeTfL: true })
    }, 90 * 1000)

    return () => {
      active = false
      window.clearTimeout(initialTfLTimer)
      window.clearInterval(refreshTimer)
      supabase.removeChannel(channel)
    }
  }, [metadata])

  const track = trending.length > 0
    ? trending.filter(item => matchesPreference(item, preference)).map((item) => ({
      color: item.kind === 'report' && item.lineIds?.length === 1 ? safeLineColor(metadata.lines.find(line => line.id === item.lineIds[0])?.colour) : '#17233f',
      details: item.kind === 'tfl' ? `TfL operator information: ${item.message}` : item.kind === 'chat' ? 'Community message (unverified).' : `Passenger report (unverified). Lines: ${(item.lineIds || []).map(id => metadata.lines.find(line => line.id === id)?.name || id).join(', ') || 'Unknown'}`,
      icon: item.kind === 'chat' ? 'Users' : 'AlertTriangle',
      text: item.kind === 'tfl'
        ? `TfL ${item.station_name}: ${item.label || 'Service disruption'}`
        : item.kind === 'chat'
          ? `Community message - ${item.station_name}: ${item.message || 'Travel update'}`
          : `Passenger report - ${item.station_name}${item.lineIds?.length ? ' (' + item.lineIds.map(id => metadata.lines.find(line => line.id === id)?.name || id).join(', ') + ')' : ''}: ${item.message || item.label || 'Travel update'}`,
      time: formatAge(item.created_at),
    }))
    : []

  return (
    <div className="relative z-[1200] bg-yellow-400 text-brand-ink text-sm py-2.5 flex items-center gap-3">
      <div
        className="ml-3 flex shrink-0 items-center gap-2 border-r border-brand-ink/30 pr-3 font-bold sm:ml-4"
      >
        <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-red-600 bg-white">
          <span className="h-3 w-3 rounded-full bg-red-600" />
        </span>
        <span className="normal-case">LIVE</span>
      </div>
      {/* min-w-0 is the important part here: without it, a flex child is never
          allowed to shrink below its content size, so the wide scrolling
          track underneath would force this whole bar (and the page) wider
          than the screen on mobile. This is what broke last time. */}
      <div className="live-ticker-viewport flex-1 min-w-0 overflow-hidden" tabIndex={0} aria-label="Live travel updates">
        <div className="live-ticker-track flex gap-8 marquee-track w-max whitespace-nowrap">
          {track.length > 0 ? track.concat(track).map((item, i) => {
            const Icon = feedIcons[item.icon] || AlertTriangle
            return (
            <span key={i} title={item.details} aria-hidden={i >= track.length ? true : undefined} className="flex items-center gap-2 shrink-0">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-ink/10">
                <Icon size={12} />
              </span>
              <span className="font-semibold" style={{ color: item.color }}>{item.text}<span className="sr-only">. {item.details}</span></span>
              <span className="text-brand-ink/60">{item.time}</span>
            </span>
            )
          }) : (
            <span className="shrink-0 font-semibold">{feedError ? 'Live updates temporarily unavailable' : preference.mode === 'all' ? 'Live travel updates from the community' : 'No reports for your selected stations right now'}</span>
          )}
        </div>
      </div>
      <button type="button" aria-label="Personalise LIVE updates" aria-haspopup="dialog" aria-expanded={preferencesOpen} onClick={() => setPreferencesOpen(true)} className="relative -my-2.5 mr-1 flex h-11 w-11 shrink-0 items-center justify-center text-black focus-visible:outline-2 focus-visible:outline-offset-[-3px]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 7h5m6 0h7M3 17h11m6 0h1" /><circle cx="11" cy="7" r="3" /><circle cx="17" cy="17" r="3" /></svg>
      </button>
      {preferencesOpen && <LiveTickerPreferences preference={preference} metadata={metadata} onClose={() => setPreferencesOpen(false)} onApply={next => {
        const validated = validatePreferences(next, metadata)
        try { savePreferences(window.localStorage, validated, metadata) } catch { /* Keep current-session preferences when storage is blocked. */ }
        setPreference(validated)
        setPreferencesOpen(false)
      }} metadataReady={metadataReady} />}
      {!metadataReady && <span className="sr-only">Personalisation metadata is loading or unavailable.</span>}
    </div>
  )
}
