export function reviewCountLabel(score) {
  if (score == null) return 'Loading reviews…'
  const count = Number.isFinite(Number(score.ratingCount)) ? Math.max(0, Number(score.ratingCount)) : 0
  if (count === 0) return 'No reviews yet'
  return `Based on ${count} ${count === 1 ? 'review' : 'reviews'}`
}

export function categoryRatingLabel(value) {
  return value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toFixed(1)
}
