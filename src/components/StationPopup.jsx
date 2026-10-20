import { useCallback, useEffect, useState } from 'react'
import StationReportSummary from './StationReportSummary'
import StationReviewDialog from './StationReviewDialog'

export default function StationPopup({ stationId, stationName, stationLines, onReportIssue }) {
  const [reviewView, setReviewView] = useState(null)
  const closeReviews = useCallback(() => setReviewView(null), [])

  useEffect(() => { setReviewView(null) }, [stationId])

  return <>
    <StationReportSummary
      station={{ id: stationId, name: stationName, lines: stationLines }}
      onReportIssue={onReportIssue}
      onRate={() => setReviewView('rating')}
      onViewReviews={() => setReviewView('reviews')}
    />
    {reviewView && <StationReviewDialog key={stationId} stationId={stationId} stationName={stationName} initialView={reviewView} onClose={closeReviews} />}
  </>
}
