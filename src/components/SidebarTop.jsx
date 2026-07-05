import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Heart, Clock, ArrowUpDown, ArrowRight, Menu, X, Map, CalendarDays, Bell, HelpCircle, Plus,
} from 'lucide-react'
import { savedJourneys } from '../data/mockData'
import logo from '../assets/logo.png'

const navItems = [
  { label: 'Live Map', icon: Map, href: '/' },
  { label: 'Journey Planner', icon: Search },
  { label: 'Calendar Sync', icon: CalendarDays },
  { label: 'Alerts & Reports', icon: Bell, href: '/alerts' },
  { divider: true },
  { label: 'Settings', icon: HelpCircle },
  { label: 'Help', icon: HelpCircle },
]

export default function SidebarTop({ className = '' }) {
  const [journeyTab, setJourneyTab] = useState('saved')
  const [menuOpen, setMenuOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const handleSwap = () => {
    setFrom(to)
    setTo(from)
  }

  return (
    <div className={`bg-white ${className}`}>
      {/* Logo + sign in */}
      <div className="relative flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
            className="w-11 h-11 -ml-2 flex items-center justify-center text-slate-600 rounded-lg active:bg-slate-50"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <img src={logo} alt="TrainLive" className="h-8 w-auto" />
        </div>
        <Link to="/signin" className="bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-medium px-4 py-2 rounded-full">
          Sign in
        </Link>

        {menuOpen && (
          <>
            <button
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div className="absolute top-full left-3 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
              {navItems.map((item, idx) => {
                if (item.divider) return <hr key={idx} className="my-1.5 border-slate-100" />
                const ItemIcon = item.icon
                if (item.href) {
                  return (
                    <Link
                      key={item.label}
                      to={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 active:bg-slate-50"
                    >
                      <ItemIcon size={18} className="text-slate-500" />
                      {item.label}
                    </Link>
                  )
                }
                return (
                  <div key={item.label} className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-slate-300 cursor-not-allowed">
                    <span className="flex items-center gap-3">
                      <ItemIcon size={18} />
                      {item.label}
                    </span>
                    <span className="text-[10px] font-semibold tracking-wide bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">SOON</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Plan journey */}
      <div className="px-5 py-5">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold tracking-widest text-slate-400">PLAN JOURNEY</h2>
          </div>

          {/* Bold, full width two-segment tab bar, replacing the old small pill buttons */}
          <div className="relative flex rounded-lg border border-slate-200 overflow-hidden mb-4">
            <button
              onClick={() => {
                setJourneyTab('saved')
                setSavedOpen((o) => (journeyTab === 'saved' ? !o : true))
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors ${journeyTab === 'saved' ? 'bg-blue-700 text-white' : 'bg-white text-blue-700'}`}
            >
              <Heart size={14} /> Saved Journey
            </button>
            <button
              onClick={() => {
                setJourneyTab('leave')
                setSavedOpen(false)
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors ${journeyTab === 'leave' ? 'bg-blue-700 text-white' : 'bg-white text-blue-700'}`}
            >
              <Clock size={14} /> Leave now
            </button>

            {savedOpen && (
              <>
                <button aria-label="Close saved journeys" onClick={() => setSavedOpen(false)} className="fixed inset-0 z-40 cursor-default" />
                <div className="absolute top-full left-0 mt-2 w-80 max-w-[85vw] bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50">
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

          {/* Labeled fields with clear buttons, and an overlapping swap button, like a real journey planner */}
          <div className="relative mb-4">
            <div className="border border-slate-200 rounded-t-lg px-4 py-2.5 bg-white">
              <label className="text-xs text-slate-400 block">Starting station</label>
              <div className="flex items-center justify-between gap-2">
                <input
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="Add station"
                  className="text-base font-medium text-slate-800 outline-none w-full bg-transparent placeholder:text-slate-300 placeholder:font-normal"
                />
                {from && (
                  <button onClick={() => setFrom('')} aria-label="Clear starting station" className="text-slate-400 shrink-0">
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="border border-t-0 border-slate-200 rounded-b-lg px-4 py-2.5 bg-white">
              <label className="text-xs text-slate-400 block">Destination (optional)</label>
              <div className="flex items-center justify-between gap-2">
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Add station"
                  className="text-base font-medium text-slate-800 outline-none w-full bg-transparent placeholder:text-slate-300 placeholder:font-normal"
                />
                {to && (
                  <button onClick={() => setTo('')} aria-label="Clear destination" className="text-slate-400 shrink-0">
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleSwap}
              aria-label="Swap stations"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center text-blue-700"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          <button className="w-full bg-blue-700 hover:bg-blue-800 transition-colors text-white font-semibold text-base py-3.5 rounded-lg flex items-center justify-between px-5">
            Plan Journey <ArrowRight size={18} />
          </button>
        </section>
      </div>
    </div>
  )
}
