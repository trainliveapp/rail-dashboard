import { useEffect, useState } from 'react'
import { canUndoReport, readReportSubmission, reportCooldownRemaining } from './reportCooldown'
import { refreshReportSubmission } from './stationUpdates'

export default function useReportCooldown() {
  const [state, setState] = useState(readReportSubmission)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const update = () => { setState(readReportSubmission()); setNow(Date.now()) }
    window.addEventListener('report-submission-changed', update)
    window.addEventListener('storage', update)
    const timer = setInterval(() => setNow(Date.now()), 1000)
    refreshReportSubmission().catch(() => { /* Submission still checks the server. */ })
    return () => {
      clearInterval(timer)
      window.removeEventListener('report-submission-changed', update)
      window.removeEventListener('storage', update)
    }
  }, [])
  const remaining = reportCooldownRemaining(state, now)
  const minutes = Math.ceil(remaining / 60000)
  return {
    state,
    blocked: remaining > 0,
    notice: remaining > 0 ? `You can report again in ${minutes} min. Undoing a report does not reset the 30-minute wait.` : 'One report every 30 minutes. Tap a reported issue again to undo an accidental report.',
    canUndo: (stationName, category) => canUndoReport(state, stationName, category, now),
  }
}
