import { useState, useEffect } from 'react'

const glow = { textShadow: '0 0 6px rgba(251,191,36,0.55)' }
const boardFont = { fontFamily: 'var(--font-board)' }

function BigClock() {
  const [time, setTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = time.toTimeString().slice(0, 8)
  const parts = timeStr.split(':')
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

function FeaturedDeparture({ dep }) {
  const time = dep.expected || dep.scheduled_time || '--:--'
  const dest = dep.destination || 'Unknown'
  const line = dep.line || 'Train'
  const platform = dep.platform || null // Fixed: Only show if it exists
  const coaches = platform ? (6 + (parseInt(platform) % 5)) : 6
  const tickerText = `${line} service to ${dest} · this train has ${coaches} carriages · please stand back from the platform edge · `
  const statusColor = dep.source === 'live_tfl' ? 'text-emerald-400' : 'text-amber-400/90'
  const statusText = dep.source === 'live_tfl' ? 'LIVE' : 'Scheduled'

  return (
    <div className="px-3 pt-3 pb-2" style={boardFont}>
      <div className="flex items-stretch gap-2.5">
        {platform && (
          <div className="shrink-0 border-2 border-amber-500 rounded px-2 flex flex-col items-center justify-center leading-none">
            <span className="text-[8px] text-amber-500/80 tracking-widest pt-1">PLAT</span>
            <span className="text-xl font-bold text-amber-400 pb-1" style={glow}>{platform}</span>
          </div>
        )}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-amber-400" style={glow}>{time.slice(0,5)}</span>
            <span className="text-sm text-amber-400 truncate" style={glow}>{dest}</span>
          </div>
          <span className={`text-xs font-semibold ${statusColor}`}>{statusText} · {line}</span>
        </div>
      </div>
      <div className="mt-2 overflow-hidden border-y border-neutral-800 py-1">
        <div className="flex whitespace-nowrap w-max animate-marquee">
          <span className="text-[11px] text-amber-500/90 pr-4">{tickerText}</span>
          <span className="text-[11px] text-amber-500/90 pr-4">{tickerText}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[9px] text-neutral-500 tracking-widest shrink-0">COACHES</span>
        <div className="flex gap-0.5">
          {Array.from({ length: coaches }).map((_, i) => (
            <span key={i} className="w-3.5 h-2.5 rounded-[1px] bg-amber-500/70" />
          ))}
        </div>
      </div>
    </div>
  )
}

function CompactDeparture({ dep }) {
  const time = dep.expected || dep.scheduled_time || '--:--'
  const dest = dep.destination || 'Unknown'
  const platform = dep.platform || null // Fixed: Hide if it doesn't exist
  const statusColor = dep.source === 'live_tfl' ? 'text-emerald-400' : 'text-amber-400/90'
  const statusText = dep.source === 'live_tfl' ? 'LIVE' : 'Sch'

  return (
    <div className="flex items-center py-1.5 border-b border-neutral-900 last:border-0 text-[11px]" style={boardFont}>
      <span className="w-11 font-semibold text-neutral-400">{time.slice(0,5)}</span>
      <span className="flex-1 min-w-0 truncate text-neutral-400">{dest}</span>
      {platform && <span className="w-14 text-neutral-500">Plat {platform}</span>}
      <span className={`w-16 text-right font-semibold ${statusColor}`}>{statusText}</span>
    </div>
  )
}

export default function DepartureBoards() {
  const BOARDS = [
    { id: 17496, name: 'LONDON PADDINGTON' },
    { id: 19440, name: 'STRATFORD' },       
    { id: 20642, name: 'LONDON WATERLOO' }   
  ]

  const [boards, setBoards] = useState([])

  useEffect(() => {
    // Function to fetch and filter the boards
    const fetchBoards = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const mins = String(now.getMinutes()).padStart(2, '0')
      const nowStr = `${hours}:${mins}:00`

      Promise.allSettled(
        BOARDS.map(board => 
          fetch(`http://localhost:8000/unified-board/${board.id}`)
            .then(res => res.json())
            .then(data => {
              // As time passes, past trains drop off, and future trains appear automatically!
              let futureTrains = data.filter(train => {
                const time = train.expected || train.scheduled_time
                return time && time >= nowStr
              })
              if (futureTrains.length < 3) {
                futureTrains = data.slice(0, 10)
              } else {
                futureTrains = futureTrains.slice(0, 15)
              }
              return { station: board.name, departures: futureTrains }
            })
            .catch(() => ({ station: board.name, departures: [] }))
        )
      ).then(results => {
        const successBoards = results.filter(r => r.status === 'fulfilled').map(r => r.value)
        setBoards(successBoards)
      })
    }

    // Fetch immediately on load
    fetchBoards()

    // THEN, re-fetch every 60 seconds so the board updates automatically!
    const interval = setInterval(fetchBoards, 10000)

    // Clean up the timer when the component unmounts
    return () => clearInterval(interval)
  }, [])

  return (
    <section>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Live Departure Boards</h2>
      <p className="text-sm text-slate-500 mb-4">Real-time data powered by TrainLive API.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {boards.map((boardData) => {
          const [featured, ...rest] = boardData.departures
          return (
<div key={boardData.station} className="relative bg-neutral-800 rounded-2xl p-2.5 shadow-lg">
              {['top-1.5 left-1.5', 'top-1.5 right-1.5', 'bottom-1.5 left-1.5', 'bottom-1.5 right-1.5'].map((pos) => (
  <span key={pos} className={`absolute ${pos} w-1.5 h-1.5 rounded-full bg-neutral-600`} />
))}
              <div className="bg-black rounded-xl overflow-hidden">
                <div className="flex items-start justify-between p-4 pb-2 border-b border-neutral-800">
                  <h3 className="font-semibold text-amber-500 tracking-wide" style={boardFont}>{boardData.station}</h3>
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> LIVE
                  </span>
                </div>
                {featured && <FeaturedDeparture dep={featured} />}
                {rest.length > 0 && (
                  <div className="px-3 pt-1 pb-1 border-t border-neutral-800 max-h-48 overflow-y-auto">
                    {rest.map((dep, i) => <CompactDeparture key={i} dep={dep} />)}
                  </div>
                )}
                <BigClock />
              </div>
              <div className="flex items-center justify-between px-2 pt-2 text-[9px] font-medium text-neutral-500 tracking-widest">
                <span>LIVE DEPARTURES</span>
                <span>RAIL INFO · SYS 3.2</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}