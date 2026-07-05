import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Heart, Clock, ArrowUpDown, Bike, ParkingSquare, Building2,
  PartyPopper, Store, TrainFront, Megaphone, Users, Wrench, Home,
  AlertTriangle, Radio, Menu, X, Map, CalendarDays, Bell, HelpCircle,
  Plus,
} from 'lucide-react'
import { lines, liveFeed, savedJourneys } from '../data/mockData'
import logo from '../assets/logo.png'

const icons = { Bike, ParkingSquare, Building2, PartyPopper, Store, TrainFront, Megaphone, Users, Wrench, Home }
const feedIcons = { AlertTriangle, Users, Wrench, Megaphone }

const navItems = [
  { label: 'Live Map', icon: Map, href: '/' },
  { label: 'Journey Planner', icon: Search },
  { label: 'Calendar Sync', icon: CalendarDays },
  { label: 'Alerts & Reports', icon: Bell, href: '/alerts' },
  { divider: true },
  { label: 'Settings', icon: HelpCircle },
  { label: 'Help', icon: HelpCircle },
]

// Whole row is the tap target (not just the small switch), sized comfortably
// for touch, and exposed as a single accessible switch control.
function ToggleRow({ icon, label, enabled, onChange }) {
  const Icon = icons[icon]
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      className="w-full flex items-center justify-between gap-3 py-3 rounded-lg active:bg-slate-50 transition-colors text-left"
    >
      <span className="flex items-center gap-3 text-sm text-slate-700 min-w-0">
        <Icon size={18} className="text-slate-500 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${enabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`}
        />
      </span>
    </button>
  )
}

export default function Sidebar({ nearby, toggleNearby, layers, toggleLayer }) {
  const [journeyTab, setJourneyTab] = useState('saved')
  const [menuOpen, setMenuOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)

  return (
    <aside className="w-full lg:w-[300px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto">
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

      <div className="px-5 py-5 space-y-6">
        {/* Plan journey */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold tracking-widest text-slate-400">PLAN JOURNEY</h2>
          </div>
          <div className="relative flex gap-2 mb-3">
            <button
              onClick={() => {
                setJourneyTab('saved')
                setSavedOpen((o) => (journeyTab === 'saved' ? !o : true))
              }}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border ${journeyTab === 'saved' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}
            >
              <Heart size={12} /> Saved Journey
            </button>
            <button
              onClick={() => {
                setJourneyTab('leave')
                setSavedOpen(false)
              }}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border ${journeyTab === 'leave' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}
            >
              <Clock size={12} /> Leave now
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

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1 pt-3.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-600" />
              <span className="w-px h-8 bg-slate-200" />
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                <Search size={14} className="text-slate-400" />
                <input placeholder="Starting station" className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400" />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                <Search size={14} className="text-slate-400" />
                <input placeholder="Destination" className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400" />
              </div>
            </div>
            <button aria-label="Swap stations" className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
              <ArrowUpDown size={16} />
            </button>
          </div>

          <button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium text-sm py-3 rounded-lg">
            Plain Journey
          </button>
        </section>

        <hr className="border-slate-100" />

        {/* Lines */}
        <section>
          <h2 className="text-xs font-bold tracking-widest text-slate-400 mb-3">LINES</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {lines.map((line) => (
              <div key={line.name} className="border border-slate-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
                <span className="w-1 h-8 rounded-full mt-0.5" style={{ backgroundColor: line.color }} />
                <div>
                  <p className="text-sm font-medium text-slate-800">{line.name}</p>
                  <p className={`text-xs ${line.level === 'good' ? 'text-emerald-600' : line.level === 'minor' ? 'text-amber-600' : 'text-red-600'}`}>
                    {line.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Nearby */}
        <section>
          <h2 className="text-xs font-bold tracking-widest text-slate-400 mb-1">NEARBY</h2>
          <div className="divide-y divide-slate-50">
            {nearby.map((item, i) => (
              <ToggleRow key={item.label} {...item} onChange={() => toggleNearby(i)} />
            ))}
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Map layers */}
        <section>
          <h2 className="text-xs font-bold tracking-widest text-slate-400 mb-1">MAP LAYERS</h2>
          <div className="divide-y divide-slate-50">
            {layers.map((item, i) => (
              <ToggleRow key={item.label} {...item} onChange={() => toggleLayer(i)} />
            ))}
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Live feed */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold tracking-widest text-slate-400">LIVE FEED</h2>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Radio size={12} /> Streaming
            </span>
          </div>
          <div className="space-y-2.5">
            {liveFeed.map((item) => {
              const Icon = feedIcons[item.icon]
              return (
                <div key={item.text} className="flex items-start gap-3 bg-slate-50 rounded-lg px-3 py-2.5">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ${item.color}`}>
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 truncate">{item.text}</p>
                    <p className="text-xs text-slate-400">{item.time} · {item.confirmed} confirmed</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </aside>
  )
}
