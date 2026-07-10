import { Search, Heart } from 'lucide-react'
import { departureBoards } from '../data/mockData'

const glow = { textShadow: '0 0 6px rgba(251,191,36,0.55)' }
const boardFont = { fontFamily: 'var(--font-board)' }

function BigClock({ time }) {
  // Splits "18:23:55" so the colons can blink independently, like a real board.
  const parts = time.split(':')
  return (
    <p className="text-2xl font-bold text-amber-400 tracking-widest text-center py-3" style={{ ...boardFont, ...glow }}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span className="animate-blink">:</span>}
        </span>
      ))}
    </p>
  )
}

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
          // Outer bezel: the "case" around the screen, with corner screws for realism
          <div key={board.station} className="relative bg-neutral-800 rounded-2xl p-2.5 shadow-lg">
            {['top-1.5 left-1.5', 'top-1.5 right-1.5', 'bottom-1.5 left-1.5', 'bottom-1.5 right-1.5'].map((pos) => (
              <span key={pos} className={`absolute ${pos} w-1.5 h-1.5 rounded-full bg-neutral-600`} />
            ))}

            {/* The screen itself */}
            <div className="bg-black rounded-xl overflow-hidden">
              <div className="flex items-start justify-between p-4 border-b border-neutral-800">
                <div>
                  <h3 className="font-semibold text-amber-500 tracking-wide" style={boardFont}>{board.station.toUpperCase()}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> LIVE
                  </span>
                  <Heart size={16} className="text-neutral-600" />
                </div>
              </div>

              <div className="px-4 pt-3" style={boardFont}>
                <div className="flex text-[10px] text-amber-600/70 tracking-widest pt-1 pb-1.5 border-b border-neutral-800">
                  <span className="w-12">TIME</span>
                  <span className="flex-1">DESTINATION</span>
                  <span className="w-16">PLATFORM</span>
                  <span className="w-16 text-right">EXPECTED</span>
                </div>
                {board.departures.map((dep, i) => (
                  <div key={i} className="flex items-center py-2 border-b border-neutral-900 last:border-0 text-xs">
                    <span className="w-12 font-bold text-amber-400" style={glow}>{dep.time}</span>
                    <span className="flex-1 min-w-0 truncate text-amber-400" style={glow}>{dep.destination}</span>
                    <span className="w-16 text-neutral-300">Plat {dep.platform}</span>
                    <span className={`w-16 text-right font-semibold ${dep.boardStatusColor}`}>{dep.status}</span>
                  </div>
                ))}
              </div>

              <BigClock time={board.updatedAt} />
            </div>

            {/* Footer branding on the bezel itself, like a real hardware label */}
            <div className="flex items-center justify-between px-2 pt-2 text-[9px] font-medium text-neutral-500 tracking-widest">
              <span>LIVE DEPARTURES</span>
              <span>RAIL INFO · SYS 3.2</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
