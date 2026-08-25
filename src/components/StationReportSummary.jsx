import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'
import { X, Navigation } from 'lucide-react'
import { stationReportCategories, lines } from '../data/mockData'
import { getStationUpdates, subscribeToStationUpdates } from '../lib/stationUpdates'

function tallyByCategory(reports) {
  const counts = {}
  for (const cat of stationReportCategories) counts[cat.key] = 0
  for (const r of reports) {
    if (r.kind === 'report' && ['ACTIVE', 'CONFIRMED'].includes(r.status) && counts[r.category] !== undefined) counts[r.category] += 1
  }
  return counts
}

// The header card that appears when you tap a station on the map: what's
// currently being reported there, right now, plus the way in to reporting
// something new. Counts come from the same station_updates table the
// journey planner's live feed reads from, so a report made here is the
// same report someone travelling through this station would see there.
export default function StationReportSummary({ station, onReportIssue, onGetDirections, onRate }) {
  const map = useMap()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getStationUpdates([station.name])
      .then((rows) => {
        if (!cancelled) setReports(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const unsubscribe = subscribeToStationUpdates([station.name], (row) => {
      setReports((prev) => [row, ...prev])
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [station.name])

  const counts = tallyByCategory(reports)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const stationLines = (station.lines || []).map((name) => lines.find((l) => l.name === name)).filter(Boolean)

  return (
    <div className="-m-3 w-72">
      <div className="rounded-t-xl px-4 pt-4 pb-3 bg-gradient-to-br from-blue-900 to-blue-600">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-white font-bold text-lg leading-tight truncate">{station.name}</h3>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {stationLines.map((line) => (
                <span key={line.name} className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: `${line.color}cc` }}>
                  {line.name}
                </span>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => map.closePopup()} aria-label="Close" className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white shrink-0">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 bg-white">
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className={`w-2 h-2 rounded-full shrink-0 ${total === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-slate-600">
            {loading ? 'Checking for reports\u2026' : total === 0 ? 'No active reports' : `${total} active report${total > 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          {stationReportCategories.map((cat) => (
            <div key={cat.key} className="flex items-center justify-between">
              <span className="flex items-center gap-2.5 text-sm text-slate-700">
                <span className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-sm shrink-0">{cat.emoji}</span>
                {cat.label}
              </span>
              <span className="font-bold text-red-500">{counts[cat.key]}</span>
            </div>
          ))}
        </div>

        {onGetDirections && (
          <button
            type="button"
            onClick={() => onGetDirections(station)}
            className="w-full flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-950 transition-colors text-white text-sm font-semibold py-2.5 rounded-full mb-2"
          >
            <Navigation size={14} /> Get Directions
          </button>
        )}
        <button
          type="button"
          onClick={() => onReportIssue(station)}
          className="w-full bg-red-600 hover:bg-red-700 transition-colors text-white text-sm font-semibold py-2.5 rounded-full mb-2"
        >
          Report Issue
        </button>
        <button type="button" onClick={onRate} className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors">
          Rate this station
        </button>
      </div>
    </div>
  )
}
