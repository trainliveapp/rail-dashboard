import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import useReportDialog from '../lib/useReportDialog'
import { Info, MapPin, Check, Loader2, X } from 'lucide-react'
import ReportCategoryImage from './ReportCategoryImage'
import { stationReportCategories } from '../data/mockData'
import { getStationUpdates, postReport, undoReport } from '../lib/stationUpdates'
import useReportCooldown from '../lib/useReportCooldown'

// The category-picker that opens after tapping "Report Issue" on a
// station's summary card. Deliberately simpler than the full
// ReportIssueModal, the station is already known from the map, so there's
// no location search here, just pick what's happening and confirm.
export default function StationQuickReportModal({ station, onClose, onReportSubmitted }) {
  const panelRef = useReportDialog(onClose)
  const [selected, setSelected] = useState(null)
  const [counts, setCounts] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const cooldown = useReportCooldown()
  const canUndo = cooldown.canUndo(station.name, selected?.key)

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
      const savedReport = canUndo ? await undoReport(cooldown.reportId(station.name, selected.key)) : await postReport({
        stationName: station.name,
        category: selected.key,
        label: selected.label.toUpperCase(),
        tone: selected.tone,
        message: `${selected.label} reported at ${station.name}.`,
        whereOn: null,
      })
      onReportSubmitted?.(savedReport)
      await getStationUpdates([station.name], { all: true }).then((rows) => {
        setCounts(Object.fromEntries(stationReportCategories.map((cat) => [cat.key, rows.filter((row) => row.kind === 'report' && row.category === cat.key && ['ACTIVE', 'CONFIRMED'].includes(row.status)).length])))
      }).catch(() => { /* The selection was saved even if refreshing counts failed. */ })
    } catch (err) {
      setError(err.message || 'Could not submit that report, try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()} className="report-overlay viewport-overlay fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40">
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="quick-report-title" className="report-panel bg-slate-50 rounded-3xl shadow-2xl p-4 sm:p-8">
        <div className="flex items-start gap-3 mb-4 pr-10">
          <div className="w-10 h-10 rounded-xl bg-brand-secondary flex items-center justify-center shrink-0">
            <Info size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 id="quick-report-title" className="text-lg font-bold text-slate-900 truncate">Report — {station.name}</h2>
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

        <button type="button" onClick={onClose} aria-label="Close report" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-500"><X size={16} /></button>

        <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 py-2.5 mb-4 text-sm text-slate-600">
          <MapPin size={14} className="text-slate-400 shrink-0" />
          {station.name}
        </div>

        <div className="report-options mb-6">
          {stationReportCategories.map((cat) => {
            const isSelected = selected?.key === cat.key
            return (
              <button
                type="button"
                disabled={submitting}
                key={cat.key}
                onClick={() => setSelected(cat)}
                aria-pressed={isSelected}
                className={`report-option relative flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${isSelected ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-brand-line bg-white text-brand-slate hover:border-brand-blue hover:bg-blue-50'}`}
              >
                <ReportCategoryImage category={cat.key} className="report-category-image" />
                <span className="flex min-h-10 items-center break-words leading-tight">{cat.label}</span>
                <span className="text-xs text-slate-400">{counts[cat.key] ?? 0} reported</span>
                {cooldown.canUndo(station.name, cat.key) && <span className="text-xs text-emerald-700">Reported</span>}
                {isSelected && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue"><Check size={12} className="text-white" strokeWidth={3} /></span>}
              </button>
            )
          })}
        </div>

        <p role="status" className="mb-4 text-xs text-slate-600">{canUndo && 'Reported. Use Undo report if this was accidental. '}{cooldown.notice}</p>

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
            Close
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected || submitting}
            className="flex-1 bg-blue-700 hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:bg-slate-300 transition-colors text-white font-semibold py-3 rounded-full flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {canUndo ? 'Undo report' : 'Confirm Report'}
          </button>
        </div>
      </div>
    </div>, document.body
  )
}
