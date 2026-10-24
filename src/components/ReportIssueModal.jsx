import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Clock3, Ban, Construction, Users, Ticket, Accessibility, Sparkles,
  ShieldAlert, ShieldCheck, Megaphone, CloudRain, CircleHelp,
  TrainFront as TrainIcon, MapPin, ArrowRight, GripHorizontal,
} from 'lucide-react'
import { reportCategories } from '../data/mockData'
import { postReport } from '../lib/stationUpdates'
import { resolveReportStation } from '../lib/reportStations'
import ReportStationSearch from './ReportStationSearch'
import useDraggablePanel from '../lib/useDraggablePanel'

const icons = { Clock3, Ban, Construction, Users, Ticket, Accessibility, Sparkles, ShieldAlert, ShieldCheck, Megaphone, CloudRain, CircleHelp }

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
  const [where, setWhere] = useState(initialStation ? 'station' : 'train')
  const [stationQuery, setStationQuery] = useState(initialStation?.name || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { panelRef, style, dragging, handleProps } = useDraggablePanel()

  const matchedStation = resolveReportStation(stationQuery)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    if (!matchedStation) {
      setError('Please select a station from the search results.')
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
        message: `${cat.label} reported ${where === 'train' ? 'on the train' : 'at the station'}.`,
        whereOn: where,
      }
      const savedReport = await postReport(report)
      onReportSubmitted?.(savedReport)
      onClose()
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
      <form ref={panelRef} style={style} role="dialog" aria-modal="true" aria-labelledby="report-title" onSubmit={handleSubmit} className="viewport-panel flex min-w-0 flex-col bg-slate-50 rounded-3xl shadow-2xl w-full max-w-[620px] overflow-hidden p-4 sm:p-8">
        <div className="flex shrink-0 items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="report-title" className="text-xl font-bold text-slate-900">Seen Something?</h2>
            <p className="text-slate-500 text-sm">Report Issue</p>
            <button type="button" {...handleProps} aria-label="Move reporting box. Drag or use arrow keys. Double-click to centre."
              className={`mt-2 flex touch-none select-none items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600 ${dragging ? 'cursor-grabbing' : '!cursor-grab'}`}>
              <GripHorizontal size={16} aria-hidden="true" /> Drag to move
            </button>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-slate-500 shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="no-scrollbar min-h-0 overflow-y-auto overscroll-contain">
        <ReportStationSearch value={stationQuery} onChange={(value) => {
          setStationQuery(value)
          setError('')
        }} />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {reportCategories.map((cat) => {
            const Icon = icons[cat.icon]
            const active = category === cat.key
            return (
              <button
                type="button"
                key={cat.key}
                onClick={() => {
                  setCategory(cat.key)
                  setError('')
                }}
                aria-pressed={active}
                className={`flex flex-col items-center justify-center text-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${active ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-brand-line bg-white text-brand-slate hover:border-brand-blue hover:bg-blue-50'}`}
              >
                <Icon size={20} className="text-brand-blue" />
                {cat.label}
              </button>
            )
          })}
        </div>

        <h3 className="text-sm font-semibold text-slate-800 mb-2">Where Are You</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setWhere('train')}
            aria-pressed={where === 'train'}
            className={`flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${where === 'train' ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-brand-line bg-white text-brand-slate hover:border-brand-blue hover:bg-blue-50'}`}
          >
            <TrainIcon size={16} /> On Train
          </button>
          <button
            type="button"
            onClick={() => setWhere('station')}
            aria-pressed={where === 'station'}
            className={`flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${where === 'station' ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-brand-line bg-white text-brand-slate hover:border-brand-blue hover:bg-blue-50'}`}
          >
            <MapPin size={16} /> At Station
          </button>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-4 text-xs text-amber-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand-blue hover:bg-brand-secondary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:bg-slate-300 disabled:text-slate-500 transition-colors text-white font-medium py-3.5 rounded-full flex items-center justify-center gap-2"
        >
          {submitting ? 'Submitting…' : 'Submit report'} {!submitting && <ArrowRight size={16} />}
        </button>
        </div>
      </form>
    </div>,
    document.body
  )
}
