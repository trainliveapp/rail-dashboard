import { useEffect, useState } from 'react'
import { canUndoReport, getIconSubmission, readReportSubmission } from './reportCooldown'
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
  return {
    state,
    notice: 'Tap an issue to report it; tap again to deselect. Each issue counts once per person within 30 minutes.',
    canUndo: (stationName, category) => canUndoReport(state, stationName, category, now),
    reportId: (stationName, category) => getIconSubmission(state, stationName, category)?.report?.id,
  }
}
