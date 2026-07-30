import { Map, ArrowRight } from 'lucide-react'

export default function MapPlaceholder({ onOpen }) {
  return (
    <div className="h-64 lg:h-full min-h-[280px] bg-slate-100 flex flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-600">
        <Map size={24} />
      </span>
      <div>
        <p className="font-semibold text-slate-800">Live map</p>
        <p className="text-sm text-slate-500 max-w-xs">Search a station, or tap below, to see the live map and disruptions.</p>
      </div>
      <button
        onClick={onOpen}
        className="mt-1 bg-blue-700 hover:bg-blue-800 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-full flex items-center gap-2"
      >
        View live map <ArrowRight size={15} />
      </button>
    </div>
  )
}
