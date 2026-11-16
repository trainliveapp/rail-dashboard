import { AlertTriangle, Megaphone, Users, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

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
        const { data, error } = await supabase
          .from('station_updates')
          .select('id, station_name, kind, message, label, confirms, created_at, status')
          .in('status', ['ACTIVE', 'CONFIRMED'])
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('confirms', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(6)

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
            .limit(6)
          tflData = result.data || []
          tflError = result.error
        }

        if (!active) return
        if (!error && !(includeTfL && tflError)) {
          const official = (tflData || []).map((item) => ({
            id: `tfl-${item.source_key}`,
            kind: 'tfl',
            station_name: item.line_names.join(', '),
            message: item.reason,
            label: item.status_description,
            confirms: null,
            created_at: item.last_seen_at,
          }))
          setTrending([...(includeTfL ? official : []), ...(data || [])].slice(0, 6))
        }
      } catch {
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
  }, [])

  const track = trending.length > 0
    ? trending.slice(0, 4).map((item) => ({
      icon: item.kind === 'chat' ? 'Users' : 'AlertTriangle',
      text: item.kind === 'tfl'
        ? `TfL ${item.station_name}: ${item.label || 'Service disruption'}`
        : `${item.station_name}: ${item.message || item.label || 'Travel update'}`,
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
        <span>Live </span>
      </div>
      {/* min-w-0 is the important part here: without it, a flex child is never
          allowed to shrink below its content size, so the wide scrolling
          track underneath would force this whole bar (and the page) wider
          than the screen on mobile. This is what broke last time. */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex gap-8 marquee-track w-max whitespace-nowrap">
          {track.length > 0 ? track.concat(track).map((item, i) => {
            const Icon = feedIcons[item.icon] || AlertTriangle
            return (
            <span key={i} className="flex items-center gap-2 shrink-0">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-ink/10">
                <Icon size={12} />
              </span>
              <span className="font-semibold">{item.text}</span>
              <span className="text-brand-ink/60">{item.time}</span>
            </span>
            )
          }) : (
            <span className="shrink-0 font-semibold">Live travel updates from the community</span>
          )}
        </div>
      </div>

    </div>
  )
}
