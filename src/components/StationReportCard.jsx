import { useState } from 'react'
import { ThumbsUp } from 'lucide-react'
import { stationReportCategories } from '../data/mockData'
import { confirmUpdate } from '../lib/stationUpdates'
import { useAuth } from '../lib/AuthContext'
import { getReportInteraction } from '../lib/reportInteractions'

export default function StationReportCard({ report }) {
  const { user } = useAuth()
  const [confirmedReport, setConfirmedReport] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const current = confirmedReport && new Date(confirmedReport.updatedAt) > new Date(report.updatedAt) ? confirmedReport : report
  const label = stationReportCategories.find((category) => category.key === current.category)?.label || current.label
  const { isOwn, hasConfirmed } = getReportInteraction(current, user?.id)
  const confirmationSaved = confirmed || hasConfirmed

  const handleConfirm = async () => {
    if (submitting || confirmationSaved || isOwn) return
    setSubmitting(true)
    setError('')
    try {
      setConfirmedReport(await confirmUpdate(current.id))
      setConfirmed(true)
    } catch {
      setError('Could not confirm this report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return <article className="border-b border-slate-200 py-3 text-xs last:border-0">
    <div className="flex flex-wrap items-center gap-2"><strong className="text-slate-900">{label}</strong>{isOwn && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Your report</span>}</div>
    <p className="!my-1 text-slate-600">{current.whereOn === 'train' ? 'On train' : current.whereOn === 'station' ? 'At station' : 'Station report'}</p>
    <time dateTime={current.createdAt} className="text-[10px] text-slate-500">{Math.max(0, Math.floor((Date.now() - new Date(current.createdAt).getTime()) / 60000))}m ago · {current.status === 'CONFIRMED' ? 'Confirmed by passengers' : 'Reported'}</time>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <span className="text-slate-500">{current.confirms || 0} passenger confirmation{current.confirms === 1 ? '' : 's'}</span>
      {isOwn ? <span className="text-slate-500">{current.confirms ? 'Other passengers have confirmed your report.' : 'Waiting for other passengers to confirm.'}</span> : <button type="button" onClick={handleConfirm} disabled={submitting || confirmationSaved} className="flex min-h-11 items-center gap-1 px-2 font-semibold text-blue-700 disabled:opacity-50"><ThumbsUp size={14} />{submitting ? 'Saving…' : confirmationSaved ? 'You confirmed this' : 'I saw this too'}</button>}
    </div>
    {error && <p role="alert" className="!mt-2 text-amber-700">{error}</p>}
  </article>
}
