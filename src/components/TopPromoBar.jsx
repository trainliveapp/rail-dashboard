import { AlertTriangle, ArrowRight, Megaphone, Users, Wrench, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const feedIcons = { AlertTriangle, Users, Wrench, Megaphone }

const iconByKind = {
  chat: Users,
  report: AlertTriangle,
}

function formatAge(createdAt) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 min ago'
  if (minutes < 60) return `${minutes} mins ago`
  const hours = Math.round(minutes / 60)
  return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`
}

export default function TopPromoBar() {
  const [visible, setVisible] = useState(true)
  const [trendingOpen, setTrendingOpen] = useState(false)
  const [trending, setTrending] = useState([])
  const [trendingLoading, setTrendingLoading] = useState(false)
  const [trendingError, setTrendingError] = useState('')

  useEffect(() => {
    let active = true
    const loadTrending = async () => {
      setTrendingLoading(true)
      setTrendingError('')

      const { data, error } = await supabase
        .from('station_updates')
        .select('id, station_name, kind, message, label, confirms, created_at, status')
        .in('status', ['ACTIVE', 'CONFIRMED'])
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('confirms', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6)

      const { data: tflData, error: tflError } = await supabase
        .from('tfl_disruptions')
        .select('source_key, line_names, severity, status_description, reason, last_seen_at')
        .is('resolved_at', null)
        .gte('last_seen_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('severity', { ascending: true })
        .order('last_seen_at', { ascending: false })
        .limit(6)

      if (!active) return
      if (error && tflError) {
        setTrendingError('Trending is temporarily unavailable.')
      } else {
        const official = (tflData || []).map((item) => ({
          id: `tfl-${item.source_key}`,
          kind: 'tfl',
          station_name: item.line_names.join(', '),
          message: item.reason,
          label: item.status_description,
          confirms: null,
          created_at: item.last_seen_at,
        }))
        setTrending([...official, ...(data || [])].slice(0, 6))
      }
      setTrendingLoading(false)
    }

    loadTrending()

    const channel = supabase
      .channel('trending-station-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'station_updates' }, loadTrending)
      .subscribe()
    const refreshTimer = window.setInterval(loadTrending, 90 * 1000)

    return () => {
      active = false
      window.clearInterval(refreshTimer)
      supabase.removeChannel(channel)
    }
  }, [])

  if (!visible) return null

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
    <div className="relative bg-yellow-400 text-brand-ink text-sm py-2.5 flex items-center gap-3 overflow-hidden">
      {/* min-w-0 is the important part here: without it, a flex child is never
          allowed to shrink below its content size, so the wide scrolling
          track underneath would force this whole bar (and the page) wider
          than the screen on mobile. This is what broke last time. */}
      <div className="flex-1 min-w-0 overflow-hidden pl-4">
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

      <div className="flex items-center gap-3 shrink-0 pr-4">
        <button
          type="button"
          onClick={() => setTrendingOpen((open) => !open)}
          aria-expanded={trendingOpen}
          className="bg-brand-ink text-white hover:bg-slate-800 transition-colors rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1 whitespace-nowrap"
        >
          Trending <ArrowRight size={12} />
        </button>
        <button onClick={() => setVisible(false)} aria-label="Dismiss banner" className="text-brand-ink/70 hover:text-brand-ink">
          <X size={16} />
        </button>
      </div>

      {trendingOpen && (
        <div className="absolute right-4 top-12 z-[2100] w-[min(380px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">Trending updates</h2>
              <p className="text-xs text-slate-400">Official TfL disruptions and community reports</p>
            </div>
            <button type="button" onClick={() => setTrendingOpen(false)} aria-label="Close trending updates" className="text-slate-400 hover:text-slate-700">
              <X size={16} />
            </button>
          </div>

          {trendingLoading && <p className="py-4 text-center text-sm text-slate-500">Loading updates...</p>}
          {!trendingLoading && trendingError && <p className="py-4 text-center text-sm text-red-600">{trendingError}</p>}
          {!trendingLoading && !trendingError && trending.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">No active network updates yet.</p>
          )}
          {!trendingLoading && !trendingError && trending.length > 0 && (
            <div className="space-y-2">
              {trending.map((item) => {
                const Icon = iconByKind[item.kind] || AlertTriangle
                return (
                  <div key={item.id} className="flex gap-3 rounded-lg bg-slate-50 p-3">
                    <Icon size={16} className="mt-0.5 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.station_name || 'Network update'}</p>
                      <p className="text-sm text-slate-600">{item.message || item.label || 'Travel update'}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.kind === 'tfl' ? 'Official TfL update' : `${item.confirms || 0} confirmations`} · {formatAge(item.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
