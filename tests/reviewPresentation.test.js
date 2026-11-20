import test from 'node:test'
import assert from 'node:assert/strict'
import { categoryRatingLabel, reviewCountLabel } from '../src/lib/reviewPresentation.js'

test('review summary displays the real zero, one, and multiple review counts', () => {
  assert.equal(reviewCountLabel(null), 'Loading reviews…')
  assert.equal(reviewCountLabel({ ratingCount: 0 }), 'No reviews yet')
  assert.equal(reviewCountLabel({ ratingCount: 1 }), 'Based on 1 review')
  assert.equal(reviewCountLabel({ ratingCount: 8 }), 'Based on 8 reviews')
})

test('missing category ratings stay blank and valid scores are formatted to one decimal', () => {
  assert.equal(categoryRatingLabel(null), '—')
  assert.equal(categoryRatingLabel(undefined), '—')
  assert.equal(categoryRatingLabel(Number.NaN), '—')
  assert.equal(categoryRatingLabel(4), '4.0')
  assert.equal(categoryRatingLabel(3.25), '3.3')
})
