import { useEffect, useState } from 'react'
import { Info, MapPin, Check, Loader2 } from 'lucide-react'
import { stationReportCategories } from '../data/mockData'
import { getStationUpdates, postReport } from '../lib/stationUpdates'
import { useAuth } from '../lib/AuthContext'

// The category-picker that opens after tapping "Report Issue" on a
// station's summary card. Deliberately simpler than the full
// ReportIssueModal, the station is already known from the map, so there's
// no location search here, just pick what's happening and confirm.
export default function StationQuickReportModal({ station, onClose }) {
  const { user } = useAuth()
  const [selected, setSelected] = useState(null)
  const [counts, setCounts] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getStationUpdates([station.name]).then((rows) => {
      const next = {}
      for (const cat of stationReportCategories) next[cat.key] = 0
      for (const r of rows) {
        if (r.kind === 'report' && next[r.category] !== undefined) next[r.category] += 1
      }
      setCounts(next)
    })
  }, [station.name])

  const handleConfirm = async () => {
    if (!selected) return
    if (!user) {
      setError('Sign in to submit a report.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await postReport({
        stationName: station.name,
        category: selected.key,
        label: selected.label.toUpperCase(),
        tone: selected.tone,
        message: `${selected.label} reported at ${station.name}.`,
        whereOn: null,
      })
      setSubmitted(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err.message || 'Could not submit that report, try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[380px] p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Check size={26} className="text-white" strokeWidth={3} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Report submitted</h2>
          <p className="text-sm text-slate-500">Riders heading to {station.name} will see it now.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[420px] p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center shrink-0">
            <Info size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">Report — {station.name}</h2>
            <p className="text-sm text-slate-400 flex items-center gap-1">
              {selected ? (
                <>
                  <span>{selected.emoji}</span> {selected.label} selected
                </>
              ) : (
                'Select a category below'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 py-2.5 mb-4 text-sm text-slate-600">
          <MapPin size={14} className="text-slate-400 shrink-0" />
          {station.name}
        </div>

        <div className="space-y-2.5 mb-5">
          {stationReportCategories.map((cat) => {
            const isSelected = selected?.key === cat.key
            return (
              <button
                type="button"
                key={cat.key}
                onClick={() => setSelected(cat)}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-blue-100 bg-white'}`}
              >
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-base shrink-0">{cat.emoji}</span>
                  <span>
                    <span className={`block text-sm font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{cat.label}</span>
                    <span className="block text-xs text-slate-400">{counts[cat.key] ?? 0} reported</span>
                  </span>
                </span>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-600' : 'border-2 border-blue-200'}`}>
                  {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-4 text-xs text-red-700">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-full"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected || submitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-colors text-white font-semibold py-3 rounded-full flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            Confirm Report
          </button>
        </div>
      </div>
    </div>
  )
}
