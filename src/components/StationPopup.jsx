import { useCallback, useEffect, useState } from 'react'
import StationReportSummary from './StationReportSummary'
import StationReviewDialog from './StationReviewDialog'

export default function StationPopup({ stationId, stationName, stationLines }) {
  const [reviewView, setReviewView] = useState(null)
  const closeReviews = useCallback(() => setReviewView(null), [])

  useEffect(() => { setReviewView(null) }, [stationId])

  // Review controls replace the clicked button during the same event. Stop the
  // event here so Leaflet cannot mistake that detached target for a map click.
  return <div
    onClick={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()}
    onPointerDown={(event) => event.stopPropagation()}
  >
    <StationReportSummary
      station={{ id: stationId, name: stationName, lines: stationLines }}
      onRate={() => setReviewView('rating')}
      onViewReviews={() => setReviewView('reviews')}
      reviewView={reviewView}
      reviewContent={reviewView && <StationReviewDialog key={`${stationId}-${reviewView}`} stationId={stationId} stationName={stationName} initialView={reviewView} onClose={closeReviews} embedded />}
    />
  </div>
}
