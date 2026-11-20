import RatingStars from './RatingStars'
import { reviewCountLabel } from '../lib/reviewPresentation'

export default function StationReviewSummaryCard({ score }) {
  const hasScore = score?.ratingCount > 0 && score?.overallScore != null
  return (
    <section className="station-review-summary-card" aria-label="Station rating summary">
      <strong className="station-review-summary-score">{hasScore ? Number(score.overallScore).toFixed(1) : '—'}<span>{hasScore ? '/5' : ''}</span></strong>
      <RatingStars value={hasScore ? score.overallScore : null} size={20} />
      <p>{reviewCountLabel(score)}</p>
    </section>
  )
}
