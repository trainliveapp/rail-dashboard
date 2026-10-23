export const REVIEW_MAX_LENGTH = 500
export const REVIEW_RATING_KEYS = ['staff_friendliness', 'accessibility', 'staff_visibility', 'cleanliness', 'facilities']

let visitorToken
export function getReviewVisitorToken() {
  if (visitorToken) return visitorToken
  const key = 'rail-dashboard-review-token'
  try {
    const stored = window.localStorage.getItem(key)
    if (/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(stored || '')) visitorToken = stored
    else {
      visitorToken = crypto.randomUUID()
      window.localStorage.setItem(key, visitorToken)
    }
  } catch { visitorToken ||= crypto.randomUUID() }
  return visitorToken
}

export function validateStationReview(stationId, input = {}) {
  if (typeof stationId !== 'string' || !stationId.trim() || stationId.length > 200) throw new Error('Choose a valid station.')
  const payload = {}
  for (const key of REVIEW_RATING_KEYS) {
    const value = input[key]
    if (value == null) { payload[key] = null; continue }
    if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error('Ratings must be whole numbers from 1 to 5.')
    payload[key] = value
  }
  if (input.review_text != null && typeof input.review_text !== 'string') throw new Error('Enter a valid review.')
  payload.review_text = input.review_text?.trim() || null
  if (Array.from(payload.review_text || '').length > REVIEW_MAX_LENGTH) throw new Error('Keep your review within 500 characters.')
  if (!payload.review_text && !REVIEW_RATING_KEYS.some((key) => payload[key] != null)) throw new Error('Add a star rating or write a review before submitting.')
  return payload
}
