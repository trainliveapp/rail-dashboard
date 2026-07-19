import { ArrowLeft, Clock, ArrowRightLeft, Footprints } from 'lucide-react'

function OptionPill({ option, isBest, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 flex flex-col items-center justify-center min-w-[76px] px-3 py-2 rounded-2xl border transition-colors ${
        selected
          ? isBest
            ? 'bg-violet-600 border-violet-600 text-white'
            : 'bg-blue-700 border-blue-700 text-white'
          : 'bg-white border-slate-200 text-slate-700'
      }`}
    >
      <span className="text-sm font-bold">{option.totalMin} min</span>
      <span className={`text-[10px] mt-0.5 ${selected ? 'text-white/80' : 'text-slate-400'}`}>
        {isBest ? 'Best' : option.changes === 0 ? 'Direct' : `${option.changes} change${option.changes > 1 ? 's' : ''}`}
      </span>
    </button>
  )
}

export default function JourneyResults({ journey, selectedIndex, onSelectIndex, onBack }) {
  const option = journey.options[selectedIndex]

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} aria-label="Back to search" className="text-slate-400 shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {journey.origin} → {journey.destination}
          </p>
          <p className="text-xs text-slate-400">{journey.options.length} route{journey.options.length > 1 ? 's' : ''} found</p>
        </div>
      </div>

      {journey.options.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1">
          {journey.options.map((opt, i) => (
            <OptionPill
              key={opt.id}
              option={opt}
              isBest={i === 0}
              selected={i === selectedIndex}
              onClick={() => onSelectIndex(i)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 bg-slate-50 rounded-2xl px-4 py-3 mb-4">
        <div>
          <p className="text-xl font-bold text-slate-900">{option.departTime}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Depart</p>
        </div>
        <div className="flex-1 flex items-center gap-2 text-slate-300">
          <span className="flex-1 h-px bg-slate-200" />
          <Clock size={14} />
          <span className="flex-1 h-px bg-slate-200" />
        </div>
        <div>
          <p className="text-xl font-bold text-slate-900">{option.arriveTime}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Arrive</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 px-1">
        <span>{option.totalMin} min total</span>
        <span className="flex items-center gap-1">
          <ArrowRightLeft size={12} />
          {option.changes === 0 ? 'Direct, no changes' : `${option.changes} change${option.changes > 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="space-y-3 mb-5">
        {option.legs.map((leg, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center pt-1">
              {leg.mode === 'walk' ? (
                <Footprints size={14} className="text-slate-400 shrink-0" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: leg.color }} />
              )}
              {i < option.legs.length - 1 && <span className="w-px flex-1 bg-slate-200 my-1" />}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{leg.label}</p>
                {leg.platform && <p className="text-xs text-slate-400">Platform {leg.platform}</p>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {leg.departTime} {leg.from} → {leg.arriveTime} {leg.to}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{leg.durationMin} min</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onBack}
        className="w-full bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 text-sm font-medium py-3 rounded-full"
      >
        Search again
      </button>
    </div>
  )
}
