import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Clock } from 'lucide-react'

const TYPE_LABELS = {
  delay: 'Delay',
  report: 'Community report',
  crowding: 'Crowding',
}

export default function DisruptionPopup({ marker }) {
  const [confirmations, setConfirmations] = useState(marker.confirmations)
  const [voted, setVoted] = useState(null)

  const vote = (type) => {
    if (voted) return
    setVoted(type)
    if (type === 'confirm') setConfirmations((c) => c + 1)
  }

  return (
    <div className="w-full max-w-[240px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: marker.color }} />
        <span className="text-[10px] font-bold tracking-wide uppercase" style={{ color: marker.color }}>
          {TYPE_LABELS[marker.type]}
        </span>
      </div>
      <p className="text-sm font-semibold text-slate-900 mb-1">{marker.title}</p>
      <p className="text-xs text-slate-500 mb-2">{marker.description}</p>
      <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-3">
        <Clock size={11} /> Reported {marker.reportedAgo} · {confirmations} confirmed
      </p>

      {voted ? (
        <p className="text-xs text-emerald-600 font-medium">
          {voted === 'confirm' ? 'Thanks, marked as still happening.' : 'Thanks, we\'ll note that.'}
        </p>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => vote('confirm')}
            className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700 text-xs font-medium py-2 rounded-full"
          >
            <ThumbsUp size={13} /> Still there
          </button>
          <button
            type="button"
            onClick={() => vote('clear')}
            className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700 text-xs font-medium py-2 rounded-full"
          >
            <ThumbsDown size={13} /> Cleared
          </button>
        </div>
      )}
    </div>
  )
}