import { useState } from 'react'
import TopPromoBar from '../components/TopPromoBar'
import Sidebar from '../components/Sidebar'
import {
  LogOut, ArrowLeftRight, PoundSterling, CreditCard, Clock, ShieldCheck,
  Wrench, RefreshCw, Users, Globe, TriangleAlert, X, History, Plus,
} from 'lucide-react'
import { alerts, alertFilters, notificationSettings, savedRoutesForAlerts, favoriteStations, nearbyToggles, mapLayerToggles } from '../data/mockData'

const alertIcons = { LogOut, ArrowLeftRight, PoundSterling, CreditCard }
const settingIcons = { LogOut, ArrowLeftRight, PoundSterling, CreditCard, Clock, ShieldCheck, Wrench, RefreshCw, Users, Globe }

const typeStyles = {
  urgent: 'text-red-600 bg-red-50',
  action: 'text-amber-600 bg-amber-50',
  fare: 'text-purple-600 bg-purple-50',
  mismatch: 'text-red-600 bg-red-50',
}
const badgeStyles = {
  urgent: 'bg-red-600 text-white',
  action: 'bg-amber-500 text-white',
  fare: 'bg-purple-600 text-white',
  mismatch: 'bg-red-600 text-white',
}

function AlertCard({ alert }) {
  const Icon = alertIcons[alert.icon] || TriangleAlert
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typeStyles[alert.type]}`}>
            <Icon size={17} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-semibold ${typeStyles[alert.type].split(' ')[0]}`}>{alert.title}</h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeStyles[alert.type]}`}>{alert.badge}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-400">{alert.time}</span>
          <button aria-label="Dismiss" className="text-slate-300 hover:text-slate-500">
            <X size={16} />
          </button>
        </div>
      </div>

      <p className="font-medium text-slate-900 mb-1">{alert.heading}</p>
      <p className="text-sm text-slate-500 mb-3">{alert.body}</p>
      <span className="inline-block text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full mb-4">{alert.tag}</span>

      <div className={`grid gap-3 ${alert.secondaryLabel ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <button className="bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-medium py-2.5 rounded-lg">
          {alert.primaryLabel}
        </button>
        {alert.secondaryLabel && (
          <button className="border border-slate-200 text-slate-700 text-sm font-medium py-2.5 rounded-lg">
            {alert.secondaryLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function AlertsTab() {
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.category === filter)

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {alertFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-full border ${filter === f.key ? 'border-slate-800 bg-white' : 'border-slate-200 bg-white text-slate-500'}`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${filter === f.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="flex items-center gap-2 text-sm text-slate-500 mb-5">
        <TriangleAlert size={15} className="text-red-500" /> Red means it needs your action now. Everything else is just for your information.
      </p>

      <div className="space-y-4">
        {filtered.map((a) => (
          <AlertCard key={a.id} alert={a} />
        ))}
      </div>

      <button className="w-full mt-6 bg-white border border-slate-200 rounded-full py-3 text-sm font-medium text-slate-600 flex items-center justify-center gap-2">
        <History size={15} /> View history
      </button>
    </div>
  )
}

function ToggleRow({ icon, label, enabled }) {
  const Icon = settingIcons[icon]
  const [on, setOn] = useState(enabled)
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between">
      <span className="flex items-center gap-3 text-sm text-slate-700">
        <span className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
          <Icon size={16} />
        </span>
        {label}
      </span>
      <button
        role="switch"
        aria-checked={on}
        onClick={() => setOn((o) => !o)}
        className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${on ? 'bg-blue-600' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

function SettingsTab() {
  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">1. What would you like to alerts for?</h2>
          <span className="flex items-center gap-2 text-sm text-slate-500">
            All
            <span className="w-10 h-5 rounded-full bg-blue-600 relative">
              <span className="absolute top-0.5 left-5 w-4 h-4 bg-white rounded-full shadow" />
            </span>
          </span>
        </div>
        <div className="space-y-3">
          {notificationSettings.map((s) => (
            <ToggleRow key={s.key} {...s} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-slate-900 mb-1">2. Where do you want alerts for?</h2>
        <p className="text-sm text-slate-500 mb-4">Add your saved routes and favourite stations.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-medium text-slate-800 mb-1">Saved routes</h3>
            <p className="text-xs text-slate-400 mb-4">You'll get alerts for any delays or issues.</p>
            <div className="divide-y divide-slate-50">
              {savedRoutesForAlerts.map((r) => (
                <div key={r.route} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm text-slate-800">{r.route}</p>
                    <p className="text-xs text-slate-400">{r.line}</p>
                  </div>
                  <button aria-label="Remove" className="text-slate-300 hover:text-slate-500"><X size={15} /></button>
                </div>
              ))}
            </div>
            <button className="text-sm font-medium text-blue-600 mt-3 flex items-center gap-1"><Plus size={13} /> Add another route</button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-medium text-slate-800 mb-1">Favorite stations</h3>
            <p className="text-xs text-slate-400 mb-4">Get station specific alerts and safety updates.</p>
            <div className="divide-y divide-slate-50">
              {favoriteStations.map((s) => (
                <div key={s.name} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.line}</p>
                  </div>
                  <button aria-label="Remove" className="text-slate-300 hover:text-slate-500"><X size={15} /></button>
                </div>
              ))}
            </div>
            <button className="text-sm font-medium text-blue-600 mt-3 flex items-center gap-1"><Plus size={13} /> Add another station</button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-slate-900 mb-1">3. How do you want to be notified?</h2>
        <p className="text-sm text-slate-500 mb-4">Choose your channels and preferences.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {[{ label: 'App notifications', on: false }, { label: 'Email', on: true }, { label: 'SMS', on: false }].map((c) => (
            <div key={c.label} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between">
              <span className="text-sm text-slate-700">{c.label}</span>
              <span className={`w-10 h-5 rounded-full relative ${c.on ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow ${c.on ? 'left-5' : 'left-0.5'}`} />
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Quiet hours</p>
            <p className="text-xs text-slate-400">Pause notifications during these times.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm"><span className="text-slate-400 block text-xs">From</span><span className="border border-slate-200 rounded-lg px-3 py-1.5 block mt-1">23:00</span></div>
            <div className="text-sm"><span className="text-slate-400 block text-xs">To</span><span className="border border-slate-200 rounded-lg px-3 py-1.5 block mt-1">06:00</span></div>
            <span className="w-10 h-5 rounded-full bg-blue-600 relative"><span className="absolute top-0.5 left-5 w-4 h-4 bg-white rounded-full shadow" /></span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm font-medium text-slate-800 mb-3">Alert frequency</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Real-time', desc: 'Instant alerts as they happen' },
              { label: 'Summary', desc: 'Digest every 30 minutes' },
              { label: 'Daily summary', desc: 'Once a day at 07:00', selected: true },
            ].map((f) => (
              <label key={f.label} className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="freq" defaultChecked={f.selected} className="mt-1" readOnly />
                <span>
                  <span className="block text-sm font-medium text-slate-800">{f.label}</span>
                  <span className="block text-xs text-slate-400">{f.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default function AlertsPage() {
  const [tab, setTab] = useState('alerts')
  // Local read-only copies just so the shared Sidebar renders consistently on this page.
  const [nearby] = useState(nearbyToggles)
  const [layers] = useState(mapLayerToggles)

  return (
    <div className="min-h-screen bg-slate-50">
      <TopPromoBar />
      <div className="flex flex-col lg:flex-row">
        <Sidebar nearby={nearby} toggleNearby={() => {}} layers={layers} toggleLayer={() => {}} />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto w-full">
          <h1 className="text-3xl font-bold text-slate-900">Alerts & Notifications</h1>
          <p className="text-slate-500 mb-6">Stay informed about the things that matter to you.</p>

          <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
            <button
              onClick={() => setTab('alerts')}
              className={`pb-3 text-sm font-medium border-b-2 -mb-px ${tab === 'alerts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
            >
              Alerts
            </button>
            <button
              onClick={() => setTab('settings')}
              className={`pb-3 text-sm font-medium border-b-2 -mb-px ${tab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
            >
              Notification Settings
            </button>
          </div>

          {tab === 'alerts' ? <AlertsTab /> : <SettingsTab />}
        </main>
      </div>
    </div>
  )
}
