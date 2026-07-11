import { useState } from 'react'
import { Star, Check } from 'lucide-react'
import { submitStationRating } from '../lib/stationRatings'

const CATEGORIES = [
  { key: 'staffFriendliness', dbKey: 'staff_friendliness', label: 'Customer friendliness' },
  { key: 'accessibility', dbKey: 'accessibility', label: 'Accessibility' },
  { key: 'staffVisibility', dbKey: 'staff_visibility', label: 'Staff visibility' },
  { key: 'cleanliness', dbKey: 'cleanliness', label: 'Cleanliness' },
  { key: 'facilities', dbKey: 'facilities', label: 'Facilities' },
]

function StarRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
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

export default function StationRatingForm({ stationName, stationId, onSubmitted }) {
  const [values, setValues] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const ratedCount = Object.values(values).filter((v) => v !== undefined).length

  const handleSubmit = async () => {
    if (ratedCount === 0) return
    setSubmitting(true)
    setError('')

    const payload = {}
    for (const cat of CATEGORIES) {
      if (values[cat.key] !== undefined) payload[cat.dbKey] = values[cat.key]
    }

    try {
      await submitStationRating(stationId, payload)
      setDone(true)
      onSubmitted?.()
    } catch {
      setError('Something went wrong submitting that, try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center py-6 px-4">
        <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <Check size={22} className="text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-slate-900">Thanks for rating {stationName}</p>
        <p className="text-xs text-slate-500 mt-1">Your feedback helps other commuters.</p>
      </div>
    )
  }

  return (
    <div className="px-1 py-1 w-full max-w-[280px]">
      <p className="text-sm font-semibold text-slate-900 mb-1">Rate {stationName}</p>
      <p className="text-xs text-slate-500 mb-2">Tap as many or as few as you like.</p>

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

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      <button
        type="button"
        disabled={ratedCount === 0 || submitting}
        onClick={handleSubmit}
        className="w-full mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors text-white text-sm font-medium py-2.5 rounded-full"
      >
        {submitting ? 'Submitting…' : 'Submit rating'}
      </button>
    </div>
  )
}