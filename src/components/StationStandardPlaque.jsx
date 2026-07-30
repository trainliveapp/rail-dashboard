import { Star } from 'lucide-react'

const CATEGORY_LABELS = {
  staffFriendliness: 'Friendliness',
  accessibility: 'Accessibility',
  staffVisibility: 'Staff visibility',
  cleanliness: 'Cleanliness',
  facilities: 'Facilities',
}

export default function StationStandardPlaque({ stationName, score, ratingCount, categoryScores }) {
  const isUnrated = ratingCount === 0 || score === null

  return (
    <div className="w-full max-w-[280px] bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Station Standard</p>
      <p className="text-sm font-semibold text-slate-900 mb-3">{stationName}</p>

      {isUnrated ? (
        <p className="text-sm text-slate-400">No ratings yet, be the first.</p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Star size={22} className="fill-amber-400 text-amber-400" />
            <span className="text-2xl font-bold text-slate-900">{score.toFixed(1)}</span>
            <span className="text-xs text-slate-400">({ratingCount} rating{ratingCount === 1 ? '' : 's'})</span>
          </div>

          {categoryScores && (
            <div className="space-y-1.5">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const value = categoryScores[key]
                if (value === null || value === undefined) return null
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-700">{value.toFixed(1)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}