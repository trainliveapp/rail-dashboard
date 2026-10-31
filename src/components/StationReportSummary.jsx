import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Loader2, Star } from 'lucide-react'
import ReportCategoryImage from './ReportCategoryImage'
import { stationReportCategories, lines } from '../data/mockData'
import { getStationUpdates, postReport, undoReport, subscribeToStationUpdates, UPDATE_VISIBILITY_WINDOW_MS } from '../lib/stationUpdates'
import useReportCooldown from '../lib/useReportCooldown'
import { getStationScore, subscribeToStationReviews, ratingCategories } from '../lib/stationRatings'

export function RatingStars({ value, size = 14 }) {
  return <span className="inline-flex shrink-0" aria-label={value == null ? 'Not rated' : `${Number(value).toFixed(1)} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => <span key={n} className="relative inline-flex">
      <Star size={size} className="text-slate-300" />
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, (value || 0) - n + 1)) * 100}%` }}><Star size={size} className="fill-amber-400 text-amber-400" /></span>
    </span>)}
  </span>
}

export default function StationReportSummary({ station, onRate, onViewReviews, reviewView, reviewContent }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState(null)
  const [reportError, setReportError] = useState(false)
  const [scoreError, setScoreError] = useState(false)
  const [revision, setRevision] = useState(0)
  const [submittingCategory, setSubmittingCategory] = useState(null)
  const [submitNotice, setSubmitNotice] = useState('')
  const [submitError, setSubmitError] = useState('')
  const cooldown = useReportCooldown()
  const submittingRef = useRef(false)
  const currentStationRef = useRef(station.id)
  currentStationRef.current = station.id
  const bodyRef = useRef(null)
  const reviewRef = useRef(null)

  useEffect(() => {
    if (reviewView && bodyRef.current && reviewRef.current) {
      bodyRef.current.scrollTop = reviewRef.current.offsetTop - 12
    }
  }, [reviewView])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    setSubmitNotice('')
    setSubmitError('')
  }, [station.id])

  const reportIssue = async (category) => {
    if (submittingRef.current) return
    const undoing = cooldown.canUndo(station.name, category.key)
    if (cooldown.blocked && !undoing) return
    submittingRef.current = true
    setSubmittingCategory(category.key)
    setSubmitNotice('')
    setSubmitError('')
    const stationId = station.id
    try {
      const savedReport = undoing ? await undoReport() : await postReport({
        stationName: station.name,
        category: category.key,
        label: category.label.toUpperCase(),
        tone: category.tone,
        message: `${category.label} reported at ${station.name}.`,
        whereOn: 'station',
      })
      if (currentStationRef.current !== stationId) return
      setReports((current) => [savedReport, ...current.filter((report) => report.id !== savedReport.id)])
      setSubmitNotice(undoing ? 'Report removed. You can report again after the 30-minute wait.' : `${category.label} reported. Tap the same issue again to undo.`)
    } catch (error) {
      if (currentStationRef.current === stationId) setSubmitError(error.message || 'Could not save your report. Tap the issue to try again.')
    } finally {
      submittingRef.current = false
      setSubmittingCategory(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    let reportRequest = 0
    let scoreRequest = 0
    setLoading(true)
    setReports([])
    setScore(null)
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
  const scoreLabel = score == null ? 'Loading…' : score.overallScore == null ? 'Not rated yet' : Number(score.overallScore).toFixed(1)
  const reviewActionClass = 'flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors [&>svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600'

  return <div className="station-summary w-[min(27.5rem,calc(100vw-3rem))] overflow-hidden rounded-xl bg-white text-slate-900 shadow-xl">
    <header className="shrink-0 bg-gradient-to-r from-blue-900 to-blue-600 px-4 py-3 pr-14">
      <h3 className="break-words text-lg font-bold leading-tight text-white">{station.name}</h3>
      <div className="mt-1.5 flex flex-wrap gap-1">{stationLines.map((line) => <span key={line.name} className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: line.color }}>{line.name}</span>)}</div>
    </header>
    <div ref={bodyRef} className="station-summary-body relative min-h-0 max-h-[min(65dvh,560px)] overflow-y-auto overscroll-contain p-3">
      <div className="mb-2 grid grid-cols-1 gap-2">
        <button type="button" onClick={onViewReviews} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-left">
          <Star size={27} className="shrink-0 fill-amber-400 text-amber-400" /><span className="min-w-0 flex-1"><strong className={`block leading-tight ${score?.overallScore == null ? 'text-sm' : 'text-xl'}`}>{scoreError ? '—' : scoreLabel}{score?.overallScore != null && <span className="text-sm font-normal">/5</span>}</strong><span className="block text-[11px] text-slate-500">{scoreError ? 'Reviews unavailable' : 'Station reviews'}</span></span><ChevronRight size={16} />
        </button>
      </div>
      <h4 className="mb-1 text-sm font-bold">Report an issue</h4>
      <p className="!mt-0 !mb-3 text-xs text-slate-600">Tap an issue to report it at {station.name}.</p>
      <p role="status" className="!mt-0 !mb-3 text-xs text-slate-600">{cooldown.notice}</p>
      {submitNotice && <p role="status" className="!my-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">{submitNotice}</p>}
      {submitError && <p role="alert" className="!my-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{submitError}</p>}
      <div className="mb-2 grid grid-cols-2 sm:grid-cols-3 gap-3" aria-busy={Boolean(submittingCategory)}>
        {stationReportCategories.map((cat) => <button type="button" key={cat.key} onClick={() => reportIssue(cat)} disabled={Boolean(submittingCategory) || (cooldown.blocked && !cooldown.canUndo(station.name, cat.key))} aria-pressed={cooldown.canUndo(station.name, cat.key)} aria-label={`${cooldown.canUndo(station.name, cat.key) ? 'Undo' : 'Report'} ${cat.label} at ${station.name}`} className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-brand-line bg-white px-3 py-4 text-center text-sm font-medium text-brand-slate transition-colors hover:border-brand-blue hover:bg-blue-50 aria-pressed:border-emerald-500 aria-pressed:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-not-allowed disabled:opacity-60">
          <ReportCategoryImage category={cat.key} className="h-16 w-16 sm:h-20 sm:w-20" />
          {cooldown.canUndo(station.name, cat.key) && <span className="text-xs font-semibold text-emerald-700">Reported · Tap to undo</span>}
          <span className="flex min-h-10 items-center break-words leading-tight">{cat.label}</span>{submittingCategory === cat.key ? <span role="status" className="flex items-center gap-1 text-xs"><Loader2 size={14} className="animate-spin" /> Saving…</span> : <strong className={`text-sm ${counts[cat.key] > 0 ? 'text-red-600' : 'text-slate-500'}`}>{loading || reportError ? '—' : counts[cat.key]}</strong>}
        </button>)}
      </div>
      <div ref={reviewRef}>
      {reviewContent || <>
      <h4 className="mb-1 text-xs font-bold">Station reviews</h4>
      <p className="!my-1 text-[11px] text-slate-500">Passenger ratings and experiences.</p>
      {scoreError ? <p role="alert" className="!my-2 text-xs text-slate-500">Reviews could not be loaded. <button type="button" onClick={() => setRevision((n) => n + 1)} className="font-semibold text-blue-700">Try again</button></p> : <div className="mb-3 grid grid-cols-1 gap-3">
        <div className="border-b border-slate-200 pb-2"><div className={`${score?.overallScore == null ? 'text-base' : 'text-3xl'} font-bold leading-tight`}>{scoreLabel}{score?.overallScore != null && <span className="text-lg font-normal">/5</span>}</div><RatingStars value={score?.overallScore} size={22} /><p className="!my-1 text-xs leading-snug text-slate-500">{score == null ? 'Loading reviews…' : score.ratingCount ? `Based on ${score.ratingCount} passenger reviews` : 'Be the first to review this station'}</p></div>
        <div className="min-w-0 space-y-2">{ratingCategories.map((cat) => { const value = score?.categoryScores?.[cat.key]; return <div key={cat.key} className="flex items-center justify-between gap-2 text-xs"><span className="min-w-0 flex-1 break-words">{cat.label}</span><RatingStars value={value} size={14} /><span className="w-5 shrink-0 text-right tabular-nums">{value == null ? '—' : Number(value).toFixed(1)}</span></div> })}</div>
      </div>}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2"><button type="button" onClick={onViewReviews} className={`${reviewActionClass} border border-slate-300 hover:bg-slate-50`}><span className="flex-1 text-center">Read reviews</span><ChevronRight size={12} /></button><button type="button" onClick={onRate} className={`${reviewActionClass} bg-yellow-400 hover:bg-yellow-300`}><Star size={16} /><span className="flex-1 text-center">Write a review</span><ChevronRight size={12} /></button></div>
      </>}
      </div>
    </div>
  </div>
}
