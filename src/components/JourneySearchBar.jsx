import { Search } from 'lucide-react'

// This is the only piece that still sits on top of the map, it's what was
// explicitly asked to stay put. Everything else (the actual form and
// results) now lives in JourneyPlannerPanel, rendered below the map instead
// of over it.
export default function JourneySearchBar({ fromStation, toStation, onExpand }) {
  return (
    <div className="absolute bottom-3 left-3 right-3 z-[1100]">
      <button
        onClick={onExpand}
        className="w-full bg-white rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-3 text-left"
      >
        <span className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
          <Search size={16} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-medium text-slate-800">
            {fromStation || toStation ? `${fromStation?.name || '...'} → ${toStation?.name || '...'}` : 'Where to?'}
          </span>
          <span className="block text-xs text-slate-400">Search a station or plan a journey</span>
        </span>
      </button>
    </div>
  )
}
