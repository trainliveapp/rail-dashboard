import { useEffect, useState } from 'react'
import { ChevronRight, MessageCircle, Siren, Star, TriangleAlert, X } from 'lucide-react'
import StationReportIcon from './StationReportIcon'
import StationReportCard from './StationReportCard'
import { stationReportCategories, lines } from '../data/mockData'
import { getStationUpdates, subscribeToStationUpdates, UPDATE_VISIBILITY_WINDOW_MS } from '../lib/stationUpdates'
import { getStationScore, subscribeToStationReviews, ratingCategories } from '../lib/stationRatings'

export function RatingStars({ value, size = 14 }) {
  return <span className="inline-flex shrink-0" aria-label={value == null ? 'Not rated' : `${Number(value).toFixed(1)} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => <span key={n} className="relative inline-flex">
      <Star size={size} className="text-slate-300" />
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, (value || 0) - n + 1)) * 100}%` }}><Star size={size} className="fill-amber-400 text-amber-400" /></span>
    </span>)}
  </span>
}

export default function StationReportSummary({ station, onReportIssue, onRate, onViewReviews }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [reportError, setReportError] = useState(false)
  const [scoreError, setScoreError] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let cancelled = false
    let reportRequest = 0
    let scoreRequest = 0
    setLoading(true)
    setReports([])
    setScore(null)
    setSelectedCategory(null)
    const refreshReports = async () => {
      const request = ++reportRequest
      try {
        const rows = await getStationUpdates([station.name], { all: true })
        if (!cancelled && request === reportRequest) { setReports(rows); setReportError(false) }
      } catch { if (!cancelled && request === reportRequest) setReportError(true) }
      finally { if (!cancelled && request === reportRequest) setLoading(false) }
    }
    const refreshScore = async () => {
      const request = ++scoreRequest
      try {
        const value = await getStationScore(station.id)
        if (!cancelled && request === scoreRequest) { setScore(value); setScoreError(false) }
      } catch { if (!cancelled && request === scoreRequest) setScoreError(true) }
    }
    refreshReports()
    refreshScore()
    const unsubscribe = subscribeToStationUpdates([station.name], refreshReports)
    const unsubscribeReviews = subscribeToStationReviews(station.id, refreshScore)
    const timer = setInterval(() => { refreshReports(); refreshScore() }, 30000)
    return () => { cancelled = true; clearInterval(timer); unsubscribe(); unsubscribeReviews() }
  }, [station.id, station.name, revision])

  const activeReports = reports.filter((r) => r.kind === 'report' && ['ACTIVE', 'CONFIRMED'].includes(r.status) && Date.now() - new Date(r.createdAt).getTime() < UPDATE_VISIBILITY_WINDOW_MS)
  const counts = Object.fromEntries(stationReportCategories.map((cat) => [cat.key, activeReports.filter((r) => r.category === cat.key).length]))
  const stationLines = (station.lines || []).map((name) => lines.find((line) => line.name === name) || { name, color: '#17428b' })
  const selectedReports = activeReports.filter((r) => selectedCategory === 'all' || r.category === selectedCategory)
  const scoreLabel = score?.overallScore == null ? 'New' : Number(score.overallScore).toFixed(1)
  const actionClass = 'flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs sm:text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600'

  return <div className="station-summary w-[min(27.5rem,calc(100vw-3rem))] overflow-hidden rounded-xl bg-white text-slate-900 shadow-xl">
    <header className="bg-gradient-to-r from-blue-900 to-blue-600 px-4 py-3 pr-11">
      <h3 className="text-lg font-bold leading-tight text-white">{station.name}</h3>
      <div className="mt-1.5 flex flex-wrap gap-1">{stationLines.map((line) => <span key={line.name} className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: line.color }}>{line.name}</span>)}</div>
    </header>
    <div className="max-h-[min(65dvh,560px)] overflow-y-auto p-3">
      <div className="mb-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setSelectedCategory('all')} className="flex items-center gap-2 rounded-lg bg-rose-50 px-2.5 py-2 text-left text-red-600">
          <Siren size={25} className="shrink-0" /><span className="min-w-0 flex-1"><strong className="block text-xl leading-tight">{loading ? '…' : reportError ? '—' : activeReports.length}</strong><span className="block text-[11px]">{reportError ? 'Reports unavailable' : 'Active reports'}</span></span><ChevronRight size={16} />
        </button>
        <button type="button" onClick={onViewReviews} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-left">
          <Star size={27} className="shrink-0 fill-amber-400 text-amber-400" /><span className="min-w-0 flex-1"><strong className="block text-xl leading-tight">{scoreError ? '—' : scoreLabel}{score?.overallScore != null && <span className="text-sm font-normal">/5</span>}</strong><span className="block text-[11px] text-slate-500">{scoreError ? 'Reviews unavailable' : score == null ? 'Loading reviews…' : `(${score.ratingCount} reviews)`}</span></span><ChevronRight size={16} />
        </button>
      </div>
      <div className="mb-2 grid grid-cols-4 gap-1">
        {stationReportCategories.map((cat) => <button type="button" key={cat.key} onClick={() => setSelectedCategory(cat.key)} aria-expanded={selectedCategory === cat.key} aria-label={`${cat.label}: ${counts[cat.key]} active reports`} className={`flex min-w-0 flex-col items-center rounded-lg px-0.5 py-2 text-center transition-colors hover:bg-blue-100 ${selectedCategory === cat.key ? 'bg-blue-100 ring-1 ring-blue-500' : 'bg-slate-50'}`}>
          <StationReportIcon category={cat.key} size={19} className={['revenue', 'fare_dodgers'].includes(cat.key) ? 'text-amber-500' : cat.key === 'antisocial' ? 'text-red-500' : 'text-teal-600'} />
          <span className="mt-1 flex min-h-8 items-center text-[8px] sm:text-[10px] leading-tight">{cat.label}</span><strong className={`text-sm ${counts[cat.key] > 0 ? 'text-red-600' : 'text-slate-500'}`}>{loading || reportError ? '—' : counts[cat.key]}</strong>
        </button>)}
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onReportIssue(station)} className={`${actionClass} bg-yellow-400 hover:bg-yellow-300`}><TriangleAlert size={20} />Seen something<ChevronRight size={16} className="ml-auto" /></button>
        <button type="button" onClick={() => setSelectedCategory('all')} className={`${actionClass} border border-slate-300 hover:bg-slate-50`}><MessageCircle size={20} />View reports<ChevronRight size={16} className="ml-auto" /></button>
      </div>
      {selectedCategory && <section className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3" aria-label="Live station reports">
        <p className="!mb-2 text-[11px] text-slate-500">Reports from the last 24 hours. Confirm only issues you have seen.</p>
        <div className="mb-2 flex items-center justify-between gap-2"><h4 className="text-xs font-bold">{selectedCategory === 'all' ? 'Live station' : stationReportCategories.find((cat) => cat.key === selectedCategory)?.label} reports</h4><button type="button" onClick={() => setSelectedCategory(null)} aria-label="Close reports" className="rounded p-1 hover:bg-slate-200"><X size={16} /></button></div>
        {loading ? <p role="status" className="text-xs text-slate-500">Loading reports…</p> : reportError ? <div role="alert" className="text-xs text-slate-600">Reports could not be loaded. <button type="button" onClick={() => setRevision((n) => n + 1)} className="font-bold text-blue-700">Try again</button></div> : selectedReports.length === 0 ? <p className="text-xs text-slate-500">No active reports in the last 24 hours.</p> : <div className="max-h-40 space-y-2 overflow-y-auto">{selectedReports.map((report) => <StationReportCard key={report.id} report={report} />)}</div>}
      </section>}
      <h4 className="mb-1 text-xs font-bold">Station reviews</h4>
      <p className="!my-1 text-[11px] text-slate-500">Passenger ratings and experiences. For current issues, use View reports above.</p>
      {scoreError ? <p role="alert" className="!my-2 text-xs text-slate-500">Reviews could not be loaded. <button type="button" onClick={() => setRevision((n) => n + 1)} className="font-semibold text-blue-700">Try again</button></p> : <div className="mb-3 grid grid-cols-[0.9fr_1.3fr] gap-3">
        <div className="border-r border-slate-200 pr-2"><div className="text-3xl font-bold leading-tight">{scoreLabel}{score?.overallScore != null && <span className="text-lg font-normal">/5</span>}</div><RatingStars value={score?.overallScore} size={22} /><p className="!my-1 text-[10px] leading-snug text-slate-500">{score == null ? 'Loading reviews…' : score.ratingCount ? `Based on ${score.ratingCount} passenger reviews` : 'Be the first to review this station'}</p></div>
        <div className="space-y-1">{ratingCategories.map((cat) => { const value = score?.categoryScores?.[cat.key]; return <div key={cat.key} className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px]"><span className="flex-1">{cat.label}</span><RatingStars value={value} size={11} /><span className="w-5 text-right tabular-nums">{value == null ? '—' : Number(value).toFixed(1)}</span></div> })}</div>
      </div>}
      <div className="grid grid-cols-2 gap-2"><button type="button" onClick={onViewReviews} className={`${actionClass} border border-slate-300 hover:bg-slate-50`}><MessageCircle size={20} />Read station reviews<ChevronRight size={16} className="ml-auto" /></button><button type="button" onClick={onRate} className={`${actionClass} bg-yellow-400 hover:bg-yellow-300`}><Star size={20} />Write a review<ChevronRight size={16} className="ml-auto" /></button></div>
    </div>
  </div>
}
