import {
  Bike, ParkingSquare, Building2, PartyPopper, Store, TrainFront,
  Megaphone, Users, Wrench, Home, AlertTriangle, Radio,
} from 'lucide-react'
import { liveFeed } from '../data/mockData'

const icons = { Bike, ParkingSquare, Building2, PartyPopper, Store, TrainFront, Megaphone, Users, Wrench, Home }
const feedIcons = { AlertTriangle, Users, Wrench, Megaphone }

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

export default function SidebarBottom({ nearby, toggleNearby, layers, toggleLayer, className = '' }) {
  return (
    <div className={`bg-white px-5 py-5 space-y-6 ${className}`}>
      <section>
        <h2 className="text-xs font-bold tracking-widest text-slate-400 mb-1">NEARBY</h2>
        <div className="divide-y divide-slate-50">
          {nearby.map((item, i) => (
            <ToggleRow key={item.label} {...item} onChange={() => toggleNearby(i)} />
          ))}
        </div>
      </section>

      <hr className="border-slate-100" />

      <section>
        <h2 className="text-xs font-bold tracking-widest text-slate-400 mb-1">MAP LAYERS</h2>
        <div className="divide-y divide-slate-50">
          {layers.map((item, i) => (
            <ToggleRow key={item.label} {...item} onChange={() => toggleLayer(i)} />
          ))}
        </div>
      </section>

      <hr className="border-slate-100" />

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
  )
}
