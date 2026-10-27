import { useEffect, useState } from 'react'
import { Info, MapPin, Check, Loader2 } from 'lucide-react'
import ReportCategoryImage from './ReportCategoryImage'
import { stationReportCategories } from '../data/mockData'
import { getStationUpdates, postReport } from '../lib/stationUpdates'

// The category-picker that opens after tapping "Report Issue" on a
// station's summary card. Deliberately simpler than the full
// ReportIssueModal, the station is already known from the map, so there's
// no location search here, just pick what's happening and confirm.
export default function StationQuickReportModal({ station, onClose, onReportSubmitted }) {
  const [selected, setSelected] = useState(null)
  const [counts, setCounts] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getStationUpdates([station.name], { all: true }).then((rows) => {
      const next = {}
      for (const cat of stationReportCategories) next[cat.key] = 0
      for (const r of rows) {
        if (r.kind === 'report' && ['ACTIVE', 'CONFIRMED'].includes(r.status) && next[r.category] !== undefined) next[r.category] += 1
      }
      if (!cancelled) setCounts(next)
    }).catch(() => { if (!cancelled) setCounts({}) })
    return () => { cancelled = true }
  }, [station.name])

  const handleConfirm = async () => {
    if (!selected || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const savedReport = await postReport({
        stationName: station.name,
        category: selected.key,
        label: selected.label.toUpperCase(),
        tone: selected.tone,
        message: `${selected.label} reported at ${station.name}.`,
        whereOn: null,
      })
      onReportSubmitted?.(savedReport)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not submit that report, try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-[620px] max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-8">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-secondary flex items-center justify-center shrink-0">
            <Info size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">Report — {station.name}</h2>
            <p className="text-sm text-slate-400 flex items-center gap-1">
              {selected ? (
                <>
                  <ReportCategoryImage category={selected.key} className="h-5 w-5" /> {selected.label} selected
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

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {stationReportCategories.map((cat) => {
            const isSelected = selected?.key === cat.key
            return (
              <button
                type="button"
                disabled={submitting}
                key={cat.key}
                onClick={() => setSelected(cat)}
                aria-pressed={isSelected}
                className={`relative flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${isSelected ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-brand-line bg-white text-brand-slate hover:border-brand-blue hover:bg-blue-50'}`}
              >
                <ReportCategoryImage category={cat.key} className="h-16 w-16 sm:h-20 sm:w-20" />
                <span className="flex min-h-10 items-center break-words leading-tight">{cat.label}</span>
                <span className="text-xs text-slate-400">{counts[cat.key] ?? 0} reported</span>
                {isSelected && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue"><Check size={12} className="text-white" strokeWidth={3} /></span>}
              </button>
            )
          })}
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-4 text-xs text-amber-700">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-full"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected || submitting}
            className="flex-1 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-slate-300 transition-colors text-white font-semibold py-3 rounded-full flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            Confirm Report
          </button>
        </div>
      </div>
    </div>
  )
}
