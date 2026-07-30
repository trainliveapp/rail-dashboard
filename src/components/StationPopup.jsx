import { useState } from 'react'
import StationReportSummary from './StationReportSummary'
import StationRatingForm from './StationRatingForm'

// What renders inside a station marker's popup on the map. Defaults to the
// report summary (what's being reported here right now, and a way to
// report something new); "Rate this station" switches to the existing
// star-rating form without losing that feature.
export default function StationPopup({ stationId, stationName, stationLines, onReportIssue, onGetDirections }) {
  const [view, setView] = useState('summary')

  if (view === 'rating') {
    return (
      <StationRatingForm
        stationId={stationId}
        stationName={stationName}
        onSubmitted={() => setTimeout(() => setView('summary'), 1400)}
      />
    )
  }

  return (
    <StationReportSummary
      station={{ id: stationId, name: stationName, lines: stationLines }}
      onReportIssue={onReportIssue}
      onGetDirections={onGetDirections}
      onRate={() => setView('rating')}
    />
  )
}
