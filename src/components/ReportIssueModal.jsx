import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ArrowRight } from 'lucide-react'
import { reportCategories, stations } from '../data/mockData'
import { postReport, undoReport } from '../lib/stationUpdates'
import useReportCooldown from '../lib/useReportCooldown'
import { resolveReportStation } from '../lib/reportStations'
import ReportStationSearch from './ReportStationSearch'
import ReportCategoryImage from './ReportCategoryImage'

// Category -> badge styling shown on the report in JourneyResults. Most
// categories are informational (blue), a few carry more weight and get the
// amber/rose treatment already used elsewhere in the app for warnings.
const categoryTone = {
  delays: 'amber',
  police: 'amber',
  revenue: 'amber',
  antisocial: 'amber',
  harassment_violence: 'amber',
  fare_dodgers: 'amber',
  safety: 'amber',
}


export default function ReportIssueModal({ initialStation = null, onClose, onReportSubmitted }) {
  const [category, setCategory] = useState('')
  const [stationQuery, setStationQuery] = useState(initialStation?.name || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [scope, setScope] = useState('station_wide')
  const [affectedLineIds, setAffectedLineIds] = useState([])
  const cooldown = useReportCooldown()

  const matchedStation = resolveReportStation(stationQuery)
  const mappedStation = matchedStation && stations.find((station) => station.id === matchedStation.canonicalId)
  const stationLines = mappedStation?.lines || []
  const canUndo = cooldown.canUndo(matchedStation?.name, category)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    if (!matchedStation) {
      setError('Please select a station from the search results.')
      return
    }
    if (scope === 'line_specific' && affectedLineIds.length === 0) {
      setError('Select at least one affected line.')
      return
    }
    const cat = reportCategories.find((c) => c.key === category)
    if (!cat) {
      setError('Please select an issue to report.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const report = {
        stationName: matchedStation.name,
        category,
        label: cat.label.toUpperCase(),
        tone: categoryTone[category] || 'blue',
        message: `${cat.label} reported at ${matchedStation.name}.`,
        whereOn: null,
        scope,
        affectedLineIds,
      }
      const savedReport = canUndo ? await undoReport(cooldown.reportId(matchedStation.name, category)) : await postReport(report)
      onReportSubmitted?.(savedReport)
    } catch (err) {
      setError(err.message || 'Could not submit that report, try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="viewport-overlay fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      <form role="dialog" aria-modal="true" aria-labelledby="report-title" onSubmit={handleSubmit} className="viewport-panel flex min-w-0 flex-col bg-slate-50 rounded-3xl shadow-2xl w-full max-w-[620px] overflow-hidden p-4 sm:p-8">
        <div className="flex shrink-0 items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="report-title" className="text-xl font-bold text-slate-900">Seen Something?</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-slate-500 shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="no-scrollbar min-h-0 overflow-y-auto overscroll-contain">
        <ReportStationSearch value={stationQuery} onChange={(value) => {
          setStationQuery(value)
          setScope('station_wide')
          setAffectedLineIds([])
          setError('')
        }} />

        {matchedStation && (
          <fieldset className="mb-5 rounded-xl border border-slate-200 bg-white p-3">
            <legend className="px-1 text-xs font-semibold text-slate-700">Where does this affect?</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="radio" name="report-scope" checked={scope === 'station_wide'} onChange={() => { setScope('station_wide'); setAffectedLineIds([]) }} /> Whole station</label>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="radio" name="report-scope" checked={scope === 'line_specific'} onChange={() => setScope('line_specific')} /> Specific line(s)</label>
            </div>
            {scope === 'line_specific' && <div className="mt-3 flex flex-wrap gap-2">
              {stationLines.map((line) => {
                const lineId = line.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                const checked = affectedLineIds.includes(lineId)
                return <label key={line} className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700"><input type="checkbox" checked={checked} onChange={() => setAffectedLineIds((current) => checked ? current.filter((id) => id !== lineId) : [...current, lineId])} />{line}</label>
              })}
            </div>}
          </fieldset>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {reportCategories.map((cat) => {
            const active = category === cat.key
            return (
              <button
                type="button"
                key={cat.key}
                disabled={submitting}
                onClick={() => {
                  setCategory(cat.key)
                  setError('')
                }}
                aria-pressed={active}
                className={`flex flex-col items-center justify-center text-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${active ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-brand-line bg-white text-brand-slate hover:border-brand-blue hover:bg-blue-50'}`}
              >
                <ReportCategoryImage category={cat.key} className="h-16 w-16 sm:h-20 sm:w-20" />
                {cat.label}
                {cooldown.canUndo(matchedStation?.name, cat.key) && <span className="text-xs text-emerald-700">Reported</span>}
              </button>
            )
          })}
        </div>

        <p role="status" className="mb-4 text-xs text-slate-600">{canUndo && 'Reported. Use Undo report if this was accidental. '}{cooldown.notice}</p>

        {error && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-4 text-xs text-amber-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-700 hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:bg-slate-300 disabled:text-slate-500 transition-colors text-white font-medium py-3.5 rounded-full flex items-center justify-center gap-2"
        >
          {submitting ? 'Saving…' : canUndo ? 'Undo report' : 'Submit report'} {!submitting && <ArrowRight size={16} />}
        </button>
        </div>
      </form>
    </div>,
    document.body
  )
}
