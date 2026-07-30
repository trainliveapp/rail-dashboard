import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Clock, ArrowRightLeft, Footprints, ShieldAlert, MapPin, ChevronDown, ThumbsUp } from 'lucide-react'
import { getStationUpdates, subscribeToStationUpdates, confirmUpdate } from '../lib/stationUpdates'

const tagStyles = {
  amber: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  rose: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  blue: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
}

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

// Turns the leg list (walk, bus, train...) into a chain of stop nodes for
// the connected timeline: one node per boundary between legs, each carrying
// the leg that departs from it so the line segment after it can be coloured
// and labelled correctly. This is leg-boundary granularity, not full
// calling-point granularity, national rail legs won't show their
// intermediate stations (Wandsworth Road, Battersea Park...) unless
// TransportAPI's calling-points endpoint gets wired into journeyPlanner.js,
// this only has what that already returns.
function buildStops(legs) {
  if (!legs.length) return []
  const stops = [{ name: legs[0].from, time: legs[0].departTime, isFirst: true, outgoingLeg: legs[0] }]
  legs.forEach((leg, i) => {
    stops.push({
      name: leg.to,
      time: leg.arriveTime,
      isLast: i === legs.length - 1,
      outgoingLeg: legs[i + 1] || null,
    })
  })
  return stops
}

function LiveUpdates({ updates }) {
  const chatUpdates = updates.filter((u) => u.kind === 'chat')
  if (!chatUpdates.length) return null
  return (
    <div className="mb-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2 tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
        LIVE FROM RIDERS ON THIS ROUTE
      </p>
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 no-scrollbar">
        {chatUpdates.map((u) => (
          <div key={u.id} className="shrink-0 w-56 bg-slate-50 border border-slate-100 rounded-2xl px-3.5 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                style={{ backgroundColor: u.color, fontSize: '11px' }}
              >
                {u.initial}
              </span>
              <span className="text-xs text-slate-400">{u.minutesAgo}m ago</span>
            </div>
            <p className="text-sm text-slate-800 leading-snug">{u.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertBanner({ report, onConfirm, confirming }) {
  const tone = tagStyles[report.tone] || tagStyles.amber
  return (
    <div className="bg-white border rounded-2xl px-4 py-3 mb-3" style={{ borderColor: tone.border }}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold shrink-0"
          style={{ fontSize: '11px', backgroundColor: tone.bg, color: tone.text }}
        >
          <ShieldAlert size={11} /> {report.label}
        </span>
        <span className="text-xs text-slate-400 truncate">near {report.stationName || report.locationText}</span>
      </div>
      <p className="text-sm text-slate-700 mb-1.5">{report.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{report.minutesAgo}m ago</span>
        <button
          type="button"
          onClick={() => onConfirm(report.id)}
          disabled={confirming}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700 disabled:opacity-50"
        >
          <ThumbsUp size={11} /> confirmed by {report.confirms} rider{report.confirms === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  )
}

export default function JourneyResults({ journey, selectedIndex, onSelectIndex, onBack }) {
  const option = journey.options[selectedIndex]
  const [openStop, setOpenStop] = useState(null)
  const [feed, setFeed] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedError, setFeedError] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)

  const stops = useMemo(() => buildStops(option.legs), [option])
  const stationNames = useMemo(() => stops.map((s) => s.name), [stops])
  const stationKey = stationNames.join('|')

  // Fetch what's already been posted for these stations, then subscribe so
  // anything posted while this journey is open (a report, a live update)
  // appears without the person needing to re-search.
  useEffect(() => {
    let cancelled = false
    setFeedLoading(true)
    setFeedError('')

    getStationUpdates(stationNames)
      .then((rows) => {
        if (!cancelled) setFeed(rows)
      })
      .catch((err) => {
        if (!cancelled) setFeedError(err.message || 'Could not load live updates for this route.')
      })
      .finally(() => {
        if (!cancelled) setFeedLoading(false)
      })

    const unsubscribe = subscribeToStationUpdates(stationNames, (row) => {
      setFeed((prev) => [row, ...prev])
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationKey])

  const reports = feed.filter((u) => u.kind === 'report')
  const reportByStation = Object.fromEntries(reports.map((r) => [r.stationName, r]))

  const handleConfirm = async (id) => {
    setConfirmingId(id)
    try {
      await confirmUpdate(id)
      setFeed((prev) => prev.map((u) => (u.id === id ? { ...u, confirms: u.confirms + 1 } : u)))
    } catch {
      // Non-critical, the tap just doesn't register, no need to block the UI on it.
    } finally {
      setConfirmingId(null)
    }
  }

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

      {feedLoading && (
        <p className="text-xs text-slate-400 mb-4 px-1">Checking for live reports on this route…</p>
      )}
      {feedError && (
        <p className="text-xs text-red-500 mb-4 px-1">{feedError}</p>
      )}

      <LiveUpdates updates={feed} />

      {reports.map((r) => (
        <AlertBanner key={r.id} report={r} onConfirm={handleConfirm} confirming={confirmingId === r.id} />
      ))}

      <div className="flex items-center gap-4 bg-slate-50 rounded-2xl px-4 py-3 mb-4 mt-1">
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

      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3 px-1">
        <span>{option.totalMin} min total</span>
        <span className="flex items-center gap-1">
          <ArrowRightLeft size={12} />
          {option.changes === 0 ? 'Direct, no changes' : `${option.changes} change${option.changes > 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="mb-2">
        {stops.map((stop, i) => {
          const leg = stop.outgoingLeg
          const isWalk = leg?.mode === 'walk'
          const lineColor = leg ? (isWalk ? '#cbd5e1' : leg.color) : '#cbd5e1'
          const report = reportByStation[stop.name]
          const tone = report ? tagStyles[report.tone] : null
          const isOpen = openStop === stop.name

          return (
            <div key={`${stop.name}-${i}`} className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                {stop.isLast ? (
                  <span className="w-3.5 h-3.5 rounded-md bg-blue-700 shrink-0" />
                ) : stop.isFirst ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-700 bg-white shrink-0" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-white shrink-0" />
                )}
                {!stop.isLast && (
                  <span
                    className="w-0.5 flex-1 my-1 rounded-full"
                    style={{ backgroundColor: lineColor, minHeight: '28px' }}
                  />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm ${stop.isFirst || stop.isLast ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {stop.name}
                    </p>
                    {stop.isFirst && (
                      <span className="bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-semibold tracking-wide" style={{ fontSize: '10px' }}>
                        DEPART
                      </span>
                    )}
                    {stop.isLast && (
                      <span className="bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-semibold tracking-wide" style={{ fontSize: '10px' }}>
                        ARRIVE
                      </span>
                    )}
                    {report && (
                      <button
                        type="button"
                        onClick={() => setOpenStop(isOpen ? null : stop.name)}
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
                        style={{ fontSize: '10px', backgroundColor: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}
                      >
                        <ShieldAlert size={10} /> {report.label}
                        <ChevronDown size={11} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-500 shrink-0">{stop.time}</p>
                </div>

                {leg && (
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    {isWalk ? <Footprints size={11} className="shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: leg.color }} />}
                    {leg.label}{leg.platform ? ` · Platform ${leg.platform}` : ''} · {leg.durationMin} min
                  </p>
                )}

                {isOpen && report && (
                  <p className="text-xs text-slate-500 mt-1.5 bg-slate-50 rounded-xl px-3 py-2 flex items-start gap-1.5">
                    <MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" />
                    {report.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
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
