import { useEffect, useState } from 'react'
import StationStandardPlaque from './StationStandardPlaque'
import StationRatingForm from './StationRatingForm'
import { getStationScore } from '../lib/stationRatings'

export default function StationPopup({ stationId, stationName }) {
  const [score, setScore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(false)

  const load = () => {
    setLoading(true)
    getStationScore(stationId)
      .then(setScore)
      .finally(() => setLoading(false))
  }

  useEffect(load, [stationId])

  if (loading) {
    return <div className="text-xs text-slate-400 px-2 py-3">Loading rating…</div>
  }

  if (rating) {
    return (
      <StationRatingForm
        stationId={stationId}
        stationName={stationName}
        onSubmitted={() => {
          load()
          setTimeout(() => setRating(false), 1400)
        }}
      />
    )
  }

  return (
    <div>
      <StationStandardPlaque
        stationName={stationName}
        score={score.overallScore}
        ratingCount={score.ratingCount}
        categoryScores={score.categoryScores}
      />
      <button
        type="button"
        onClick={() => setRating(true)}
        className="w-full mt-2 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700 text-xs font-medium py-2 rounded-full"
      >
        Rate this station
      </button>
    </div>
  )
}