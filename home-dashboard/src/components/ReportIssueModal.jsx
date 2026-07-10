import { useState } from 'react'
import {
  X, Coins, Car, HandCoins, Hand, TrainFront, Users, UsersRound,
  CheckCircle2, Radiation, ShieldAlert, PersonStanding, HeartPulse,
  TrainFront as TrainIcon, MapPin, LocateFixed, ArrowRight,
} from 'lucide-react'
import { reportCategories } from '../data/mockData'

const icons = { Coins, Car, HandCoins, Hand, TrainFront, Users, UsersRound, CheckCircle2, Radiation, ShieldAlert, PersonStanding, HeartPulse }

export default function ReportIssueModal({ onClose }) {
  const [category, setCategory] = useState('revenue')
  const [where, setWhere] = useState('train')
  const [location, setLocation] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // Front-end only for now, this is where the report submission API call goes.
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <form onSubmit={handleSubmit} className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-[620px] max-h-[90vh] overflow-y-auto p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">What Is Happening?</h2>
            <p className="text-slate-500 text-sm">Report Issue</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-500 shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {reportCategories.map((cat) => {
            const Icon = icons[cat.icon]
            const active = category === cat.key
            return (
              <button
                type="button"
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`flex flex-col items-center justify-center text-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium ${active ? 'border-blue-500 bg-blue-50 text-slate-800' : 'border-slate-200 bg-white text-slate-700'}`}
              >
                <Icon size={20} className="text-blue-600" />
                {cat.label}
              </button>
            )
          })}
        </div>

        <h3 className="text-sm font-semibold text-slate-800 mb-2">Where Are You</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setWhere('train')}
            className={`flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium ${where === 'train' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            <TrainIcon size={16} /> On Train
          </button>
          <button
            type="button"
            onClick={() => setWhere('station')}
            className={`flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium ${where === 'station' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            <MapPin size={16} /> At Station
          </button>
        </div>

        <h3 className="text-sm font-semibold text-slate-800 mb-2">Add Your Location <span className="font-normal text-slate-400">(Optional)</span></h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-3">
            <MapPin size={15} className="text-slate-400" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add your Location...."
              className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
            />
          </div>
          <button type="button" className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-3 text-sm font-medium text-slate-700 whitespace-nowrap">
            <LocateFixed size={15} className="text-blue-600" /> Use My Location
          </button>
        </div>

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium py-3.5 rounded-full flex items-center justify-center gap-2">
          Submit report <ArrowRight size={16} />
        </button>
      </form>
    </div>
  )
}
