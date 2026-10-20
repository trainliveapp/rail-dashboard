import { useState } from 'react'
import {
  X, Clock3, Ban, Construction, Users, Ticket, Accessibility, Sparkles,
  ShieldAlert, ShieldCheck, Megaphone, CloudRain, CircleHelp,
  TrainFront as TrainIcon, MapPin, ArrowRight,
} from 'lucide-react'
import { reportCategories, stations } from '../data/mockData'
import { postReport } from '../lib/stationUpdates'

const icons = { Clock3, Ban, Construction, Users, Ticket, Accessibility, Sparkles, ShieldAlert, ShieldCheck, Megaphone, CloudRain, CircleHelp }

// Category -> badge styling shown on the report in JourneyResults. Most
// categories are informational (blue), a few carry more weight and get the
// amber/rose treatment already used elsewhere in the app for warnings.
const categoryTone = {
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

  const stationMatches =
    stationQuery.trim().length > 0
      ? stations.filter((s) => s.name.toLowerCase().includes(stationQuery.trim().toLowerCase())).slice(0, 6)
      : []

  const matchedStation = stations.find((station) => station.name.toLowerCase() === stationQuery.trim().toLowerCase())

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

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40">
      <form onSubmit={handleSubmit} className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-[620px] max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">What Is Happening?</h2>
            <p className="text-slate-500 text-sm">Report Issue</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-500 shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="mb-6">
          <label htmlFor="report-station" className="text-sm font-semibold text-slate-800 mb-2 block">Search Station</label>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-3">
            <MapPin size={15} className="text-slate-400 shrink-0" aria-hidden="true" />
            <input
              id="report-station"
              list="report-stations"
              value={stationQuery}
              onChange={(e) => {
                setStationQuery(e.target.value)
                setError('')
              }}
              placeholder="Search Station"
              required
              autoComplete="off"
              className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
            />
            <datalist id="report-stations">
              {stationMatches.map((station) => <option key={station.id} value={station.name} />)}
            </datalist>
          </div>
          {stationQuery.trim() && !matchedStation && stationMatches.length === 0 && (
            <p className="text-xs text-slate-500 mt-2">No stations found. Try another station name.</p>
          )}
        </div>

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
                className={`flex flex-col items-center justify-center text-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium ${active ? 'border-brand-amber bg-amber-50 text-brand-ink' : 'border-brand-line bg-white text-brand-slate'}`}
              >
                <Icon size={20} className="text-amber-700" />
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
            className={`flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium ${where === 'train' ? 'border-brand-amber bg-amber-50 text-brand-ink' : 'border-brand-line bg-white text-brand-slate'}`}
          >
            <TrainIcon size={16} /> On Train
          </button>
          <button
            type="button"
            onClick={() => setWhere('station')}
            className={`flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium ${where === 'station' ? 'border-brand-amber bg-amber-50 text-brand-ink' : 'border-brand-line bg-white text-brand-slate'}`}
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
          className="w-full bg-brand-primary hover:bg-brand-primary-dark disabled:bg-slate-300 disabled:text-slate-500 transition-colors text-white font-medium py-3.5 rounded-full flex items-center justify-center gap-2"
        >
          {submitting ? 'Submitting…' : 'Submit report'} {!submitting && <ArrowRight size={16} />}
        </button>
      </form>
    </div>
  )
}
