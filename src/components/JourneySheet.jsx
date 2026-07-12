import { useState } from 'react'
import { Search, Heart, Clock, ArrowUpDown, ArrowRight, X, Plus } from 'lucide-react'
import { savedJourneys } from '../data/mockData'
import { planJourney } from '../lib/mockJourneyPlanner'
import JourneyResults from './JourneyResults'

export default function JourneySheet({ onJourneyPlanned }) {
  const [expanded, setExpanded] = useState(false)
  const [journeyTab, setJourneyTab] = useState('saved')
  const [savedOpen, setSavedOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [journey, setJourney] = useState(null)

  const handleSwap = () => {
    setFrom(to)
    setTo(from)
  }

  const handlePlanJourney = () => {
    const result = planJourney(from, to)
    setJourney(result)
    onJourneyPlanned?.(result)
  }

  const handleBackToSearch = () => {
    setJourney(null)
    onJourneyPlanned?.(null)
  }

  if (!expanded) {
    return (
      <div className="absolute bottom-3 left-3 right-3 z-[1100]">
        <button
          onClick={() => setExpanded(true)}
          className="w-full bg-white rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-3 text-left"
        >
          <span className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
            <Search size={16} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-medium text-slate-800">
              {from || to ? `${from || '...'} → ${to || '...'}` : 'Where to?'}
            </span>
            <span className="block text-xs text-slate-400">Search a station or plan a journey</span>
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-[1100] max-h-[85%] overflow-y-auto">
      <div className="bg-white rounded-t-3xl shadow-2xl px-5 pt-3 pb-5 max-w-lg mx-auto lg:rounded-3xl lg:mb-3">
        <div className="flex justify-center mb-3">
          <button onClick={() => setExpanded(false)} aria-label="Collapse" className="w-10 h-1.5 rounded-full bg-slate-200" />
        </div>

        {journey ? (
          <JourneyResults journey={journey} onBack={handleBackToSearch} />
        ) : (
          <>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold tracking-widest text-slate-400">PLAN JOURNEY</h2>
          <button onClick={() => setExpanded(false)} aria-label="Close" className="text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="relative bg-slate-100 rounded-full p-1 flex mb-4">
          <button
            onClick={() => {
              setJourneyTab('saved')
              setSavedOpen((o) => (journeyTab === 'saved' ? !o : true))
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-full transition-colors ${journeyTab === 'saved' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-500'}`}
          >
            <Heart size={14} /> Saved Journey
          </button>
          <button
            onClick={() => {
              setJourneyTab('leave')
              setSavedOpen(false)
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-full transition-colors ${journeyTab === 'leave' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-500'}`}
          >
            <Clock size={14} /> Leave now
          </button>

          {savedOpen && (
            <>
              <button aria-label="Close saved journeys" onClick={() => setSavedOpen(false)} className="fixed inset-0 z-40 cursor-default" />
              <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold tracking-widest text-slate-400">SAVED JOURNEYS</h3>
                  <button className="text-xs font-medium text-blue-600 flex items-center gap-1">
                    <Plus size={12} /> Save Current
                  </button>
                </div>
                <div className="space-y-1">
                  {savedJourneys.map((j) => (
                    <div key={j.route} className="flex items-center justify-between gap-2 py-2 border-b border-slate-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{j.route}</p>
                        <p className="text-xs text-slate-400 truncate">{j.stations}</p>
                      </div>
                      <Heart size={16} className={j.favorite ? 'text-red-500 fill-red-500 shrink-0' : 'text-slate-300 shrink-0'} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative mb-5 space-y-2">
          <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="text-xs text-slate-400 block">Starting station</label>
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Add station"
                className="text-base font-medium text-slate-800 outline-none w-full bg-transparent placeholder:text-slate-300 placeholder:font-normal"
              />
            </div>
            {from && (
              <button onClick={() => setFrom('')} aria-label="Clear starting station" className="text-slate-400 shrink-0">
                <X size={18} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="text-xs text-slate-400 block">Destination (optional)</label>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Add station"
                className="text-base font-medium text-slate-800 outline-none w-full bg-transparent placeholder:text-slate-300 placeholder:font-normal"
              />
            </div>
            {to && (
              <button onClick={() => setTo('')} aria-label="Clear destination" className="text-slate-400 shrink-0">
                <X size={18} />
              </button>
            )}
          </div>

          <button
            onClick={handleSwap}
            aria-label="Swap stations"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-blue-700"
          >
            <ArrowUpDown size={15} />
          </button>
        </div>

        <button
          onClick={handlePlanJourney}
          className="w-full bg-blue-700 hover:bg-blue-800 transition-colors text-white font-semibold text-base py-3.5 rounded-full flex items-center justify-between px-6"
        >
          Plan Journey <ArrowRight size={18} />
        </button>
          </>
        )}
      </div>
    </div>
  )
}