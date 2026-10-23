import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronRight, MessageCircle, Send, Star, Check } from 'lucide-react'
import { getMyStationReview, submitStationRating, ratingCategories } from '../lib/stationRatings'
import { useAuth } from '../lib/AuthContext'
import { REVIEW_MAX_LENGTH } from '../lib/reviewRules'

const CATEGORIES = ratingCategories

function StarRow({ label, value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
      <span className="text-xs text-slate-700 sm:text-sm">{label}</span>
      <div className="flex shrink-0" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            aria-pressed={n === value}
            onClick={() => onChange(n === value ? undefined : n)}
            className="flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-blue-600"
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
  const { user, loading: authLoading } = useAuth()
  const [values, setValues] = useState({})
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loadingReview, setLoadingReview] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [existingReview, setExistingReview] = useState(null)
  const [retry, setRetry] = useState(0)
  const submitLock = useRef(false)

  useEffect(() => {
    let cancelled = false
    setValues({}); setReview(''); setDone(false); setError('')
    setExistingReview(null); setLoadError(false)
    if (authLoading) { setLoadingReview(false); return }
    setLoadingReview(true)
    getMyStationReview(stationId).then((saved) => {
      if (cancelled) return
      setExistingReview(saved)
      setValues(Object.fromEntries(CATEGORIES.map((cat) => [cat.key, saved?.[cat.dbKey] ?? undefined])))
      setReview(saved?.review_text || '')
    }).catch(() => { if (!cancelled) setLoadError(true) })
      .finally(() => { if (!cancelled) setLoadingReview(false) })
    return () => { cancelled = true }
  }, [stationId, user?.id, authLoading, retry])

  const ratedCount = Object.values(values).filter((v) => v !== undefined).length
  const canSubmit = !authLoading && !loadingReview && !loadError && (ratedCount > 0 || review.trim().length > 0)

  const handleSubmit = async () => {
    if (!canSubmit || submitLock.current || done) return
    submitLock.current = true
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
    } catch (err) {
      setError(err.message || 'Could not save your review. Please try again.')
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  if (authLoading || loadingReview) return <p role="status" className="p-4 text-xs text-slate-500">Loading your review…</p>
  if (loadError) return <div role="alert" className="space-y-2 p-4 text-xs text-slate-600">
    <p>Could not load your existing review.</p>
    <button type="button" onClick={() => setRetry((n) => n + 1)} className="min-h-11 font-semibold text-blue-700">Try again</button>
  </div>

  if (done) {
    return (
      <div className="w-full min-w-0 rounded-xl bg-white flex flex-col items-center text-center py-6 px-4">
        <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <Check size={22} className="text-emerald-600" />
        </div>
        <p role="status" className="text-sm font-semibold text-slate-900">{existingReview ? 'Review updated' : 'Review submitted'}</p>
        <button type="button" onClick={onSubmitted} className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"><MessageCircle size={16} className="shrink-0" /><span className="flex-1">Read reviews</span><ChevronRight size={12} className="shrink-0" /></button>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 rounded-xl bg-white p-4">
      <button type="button" onClick={onCancel} disabled={submitting} className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-3"><ArrowLeft size={14} /> Back to station</button>
      <p className="text-sm font-semibold text-slate-900 mb-1">{existingReview ? 'Edit your review' : `Review ${stationName}`}</p>
      <p className="text-xs text-slate-500 mb-2">{user ? 'One review per station. You can edit it later.' : 'No account needed. One review per station in this browser.'}</p>

      <div className="divide-y divide-slate-100">
        {CATEGORIES.map((cat) => (
          <StarRow
            key={cat.key}
            label={cat.label}
            value={values[cat.key]}
            disabled={submitting}
            onChange={(v) => setValues((prev) => ({ ...prev, [cat.key]: v }))}
          />
        ))}
      </div>

      <label className="block mt-3">
        <span className="text-sm font-medium text-slate-700">Share your experience</span>
        <textarea
          value={review}
          onChange={(event) => setReview(event.target.value)}
          maxLength={REVIEW_MAX_LENGTH}
          disabled={submitting}
          rows={3}
          placeholder={`How was your experience at ${stationName}?`}
          className="w-full mt-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        <span className="block text-right text-[11px] text-slate-400 mt-0.5">{review.length}/{REVIEW_MAX_LENGTH}</span>
      </label>

      {error && <p role="alert" className="text-xs text-amber-700 mt-2">{error}</p>}

      <button
        type="button"
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-yellow-400 px-3 py-2.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-yellow-300 disabled:bg-slate-200 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <Send size={16} className="shrink-0" aria-hidden="true" /><span className="flex-1">{submitting ? 'Saving…' : existingReview ? 'Update review' : 'Submit review'}</span><ChevronRight size={12} className="shrink-0" aria-hidden="true" />
      </button>
    </div>
  )
}
