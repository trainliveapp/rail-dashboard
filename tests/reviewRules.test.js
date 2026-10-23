import assert from 'node:assert/strict'
import test from 'node:test'
import { getReviewVisitorToken, validateStationReview } from '../src/lib/reviewRules.js'

test('guests get a stable browser token without an auth account', () => {
  const storage = new Map()
  globalThis.window = { localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } }
  try {
    const token = getReviewVisitorToken()
    assert.match(token, /^[0-9a-f-]{36}$/)
    assert.equal(getReviewVisitorToken(), token)
    assert.equal(storage.get('rail-dashboard-review-token'), token)
  } finally { delete globalThis.window }
})

test('reject empty, whitespace-only, out-of-range and fractional reviews', () => {
  for (const input of [{}, { review_text: ' \n\t ' }, { cleanliness: 0 }, { facilities: 6 }, { accessibility: 2.5 }, { cleanliness: '5' }, { review_text: 123 }]) {
    assert.throws(() => validateStationReview('baker-street', input))
  }
  assert.throws(() => validateStationReview('', { cleanliness: 5 }))
  assert.throws(() => validateStationReview('baker-street', { review_text: 'a'.repeat(501) }))
})

test('accept partial stars or description; only allow review fields in the payload', () => {
  const result = validateStationReview('baker-street', {
    cleanliness: 4, review_text: '  Clean station  ', user_id: 'someone-else', overall_rating: 5,
  })
  assert.equal(result.cleanliness, 4)
  assert.equal(result.review_text, 'Clean station')
  assert.equal(result.staff_visibility, null)
  assert.equal(result.user_id, undefined)
  assert.equal(result.overall_rating, undefined)
  assert.equal(validateStationReview('baker-street', { review_text: 'Helpful staff' }).cleanliness, null)
  assert.equal(validateStationReview('baker-street', { cleanliness: 1 }).review_text, null)
})

test('an edited review can clear a previous category without creating an empty review', () => {
  const result = validateStationReview('baker-street', { cleanliness: null, facilities: 5, review_text: '' })
  assert.equal(result.cleanliness, null)
  assert.equal(result.facilities, 5)
  assert.equal(result.review_text, null)
})
