import { Search, Heart } from 'lucide-react'
import { departureBoards } from '../data/mockData'

export default function DepartureBoards() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Your Departure Boards</h2>
      <p className="text-sm text-slate-500 mb-4">Save up to 3 stations for live departures, platforms, and status at a glance.</p>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-3 mb-5 max-w-md">
        <Search size={16} className="text-slate-400" />
        <input placeholder="Search for station to save......" className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {departureBoards.map((board) => (
          <div key={board.station} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-start justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">{board.station}</h3>
                <p className="text-xs text-slate-400">{board.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> LIVE
                </span>
                <Heart size={16} className="text-slate-300" />
              </div>
            </div>
            <div className="px-4 pt-3 flex items-center justify-between text-[11px] font-semibold text-slate-400 tracking-wide">
              <span>DEPARTURES</span>
              <span>18:48:58</span>
            </div>
            <div className="px-4 pb-4">
              <div className="flex text-[11px] text-slate-400 pt-2 pb-1 border-b border-slate-100">
                <span className="w-14">TIME</span>
                <span className="flex-1">DESTINATION</span>
                <span className="w-8 text-right">PLT</span>
                <span className="w-16 text-right">STATUS</span>
              </div>
              {board.departures.map((dep, i) => (
                <div key={i} className="flex items-center py-2 border-b border-slate-50 last:border-0 text-sm">
                  <span className="w-14 font-medium text-slate-800">{dep.time}</span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                      <span className="truncate">{dep.destination}</span>
                    </span>
                    <span className="block text-xs text-slate-400 pl-3">{dep.operator}</span>
                  </span>
                  <span className="w-8 text-right text-slate-600">{dep.platform}</span>
                  <span className={`w-16 text-right text-xs font-medium ${dep.statusColor}`}>{dep.status}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
