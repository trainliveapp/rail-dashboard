import { useState } from 'react'
import { ArrowLeft, Star, Check } from 'lucide-react'
import { submitStationRating, ratingCategories } from '../lib/stationRatings'

const CATEGORIES = ratingCategories

function StarRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex gap-1" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            aria-pressed={n === value}
            onClick={() => onChange(n === value ? undefined : n)}
            className="p-0.5"
          >
            <Star
              size={20}
              className={n <= (value ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export default function StationRatingForm({ stationName, stationId, onSubmitted, onCancel }) {
  const [values, setValues] = useState({})
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const ratedCount = Object.values(values).filter((v) => v !== undefined).length
  const canSubmit = ratedCount > 0 || review.trim().length > 0

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError('')

    const payload = {}
    for (const cat of CATEGORIES) {
      if (values[cat.key] !== undefined) payload[cat.dbKey] = values[cat.key]
    }
    if (review.trim()) payload.review_text = review.trim()

    try {
      await submitStationRating(stationId, payload)
      setDone(true)
    } catch {
      setError('Something went wrong submitting that, try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="w-[min(27.5rem,calc(100vw-3rem))] rounded-xl bg-white flex flex-col items-center text-center py-6 px-4">
        <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <Check size={22} className="text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-slate-900">Thanks for reviewing {stationName}</p>
        <p className="text-xs text-slate-500 mt-1">Your feedback helps other commuters.</p>
        <button type="button" onClick={onSubmitted} className="mt-3 text-sm font-semibold text-blue-700">Read station reviews</button>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-4 w-[min(27.5rem,calc(100vw-3rem))] max-h-[65dvh] overflow-y-auto">
      <button type="button" onClick={onCancel} disabled={submitting} className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-3"><ArrowLeft size={14} /> Back to station</button>
      <p className="text-sm font-semibold text-slate-900 mb-1">Review {stationName}</p>
      <p className="text-xs text-slate-500 mb-2">Share your experience and rate any categories you like.</p>

      <div className="divide-y divide-slate-100">
        {CATEGORIES.map((cat) => (
          <StarRow
            key={cat.key}
            label={cat.label}
            value={values[cat.key]}
            onChange={(v) => setValues((prev) => ({ ...prev, [cat.key]: v }))}
          />
        ))}
      </div>

      <label className="block mt-3">
        <span className="text-sm font-medium text-slate-700">Share your experience</span>
        <textarea
          value={review}
          onChange={(event) => setReview(event.target.value)}
          maxLength={500}
          rows={3}
          placeholder={`How was your experience at ${stationName}?`}
          className="w-full mt-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        <span className="block text-right text-[11px] text-slate-400 mt-0.5">{review.length}/500</span>
      </label>

      {error && <p className="text-xs text-amber-700 mt-2">{error}</p>}

      <button
        type="button"
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
        className="w-full mt-3 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-slate-200 disabled:text-slate-400 transition-colors text-white text-sm font-medium py-2.5 rounded-full"
      >
        {submitting ? 'Submitting…' : 'Submit review'}
      </button>
    </div>
  )
}
