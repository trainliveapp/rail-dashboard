import { Star } from 'lucide-react'

export default function RatingStars({ value, size = 14 }) {
  const rating = value != null && Number.isFinite(Number(value)) ? Math.max(0, Math.min(5, Number(value))) : null
  return <span className="inline-flex shrink-0" aria-label={rating == null ? 'Not rated' : `${rating.toFixed(1)} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => <span key={n} className="relative inline-flex">
      <Star size={size} className="text-slate-300" />
      {rating != null && <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, rating - n + 1)) * 100}%` }}><Star size={size} className="fill-amber-400 text-amber-400" /></span>}
    </span>)}
  </span>
}
