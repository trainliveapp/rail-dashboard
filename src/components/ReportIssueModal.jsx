import { useState } from 'react'
import {
  X, Coins, Car, HandCoins, Hand, TrainFront, Users, UsersRound,
  CheckCircle2, Radiation, ShieldAlert, PersonStanding, HeartPulse,
  TrainFront as TrainIcon, MapPin, LocateFixed, ArrowRight, Check, Loader2,
} from 'lucide-react'
import { reportCategories, stations } from '../data/mockData'
import { findNearestStation } from '../lib/geo'
import { postReport } from '../lib/stationUpdates'
import { useAuth } from '../lib/AuthContext'

const icons = { Coins, Car, HandCoins, Hand, TrainFront, Users, UsersRound, CheckCircle2, Radiation, ShieldAlert, PersonStanding, HeartPulse }

// Category -> badge styling shown on the report in JourneyResults. Most
// categories are informational (blue), a few carry more weight and get the
// amber/rose treatment already used elsewhere in the app for warnings.
const categoryTone = {
  revenue: 'amber',
  btp: 'rose',
  threat: 'rose',
  harassment: 'rose',
  hazards: 'rose',
  vulnerable: 'rose',
  fault: 'amber',
  crowded_train: 'amber',
  crowded_platform: 'amber',
}

export default function ReportIssueModal({ onClose }) {
  const { user } = useAuth()
  const [category, setCategory] = useState('revenue')
  const [where, setWhere] = useState('train')
  const [locationQuery, setLocationQuery] = useState('')
  const [matchedStation, setMatchedStation] = useState(null)
  const [showStationList, setShowStationList] = useState(false)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const stationMatches =
    locationQuery.trim().length > 0
      ? stations.filter((s) => s.name.toLowerCase().includes(locationQuery.trim().toLowerCase())).slice(0, 6)
      : []

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Location is not available on this device.')
      return
    }
    setError('')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const nearest = findNearestStation(pos.coords.latitude, pos.coords.longitude, stations)
        if (nearest) {
          setMatchedStation(nearest.station)
          setLocationQuery(nearest.station.name)
        } else {
          setMatchedStation(null)
          setLocationQuery(`Near ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
        }
      },
      () => {
        setLocating(false)
        setError('Could not get your location, check your browser/device permissions.')
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      setError('Sign in to submit a report.')
      return
    }
    setError('')
    setSubmitting(true)
    const cat = reportCategories.find((c) => c.key === category)
    try {
      await postReport({
        stationName: matchedStation?.name || null,
        locationText: matchedStation ? null : locationQuery.trim() || null,
        category,
        label: cat.label.toUpperCase(),
        tone: categoryTone[category] || 'blue',
        message: `${cat.label} reported ${where === 'train' ? 'on the train' : 'at the station'}.`,
        whereOn: where,
      })
      setSubmitted(true)
      setTimeout(onClose, 1400)
    } catch (err) {
      setError(err.message || 'Could not submit that report, try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
        <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-[420px] p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Check size={26} className="text-white" strokeWidth={3} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Report submitted</h2>
          <p className="text-sm text-slate-500">Other riders on this route will see it now.</p>
        </div>
      </div>
    )
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

        {!user && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-5 text-xs text-amber-700">
            Sign in to submit a report, other riders won't see it otherwise.
          </div>
        )}

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
        <div className="relative mb-2">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-3">
              <MapPin size={15} className="text-slate-400" />
              <input
                value={locationQuery}
                onChange={(e) => {
                  setLocationQuery(e.target.value)
                  setMatchedStation(null)
                }}
                onFocus={() => setShowStationList(true)}
                onBlur={() => setTimeout(() => setShowStationList(false), 150)}
                placeholder="Search a station or add your location...."
                className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-3 text-sm font-medium text-slate-700 whitespace-nowrap"
            >
              {locating ? <Loader2 size={15} className="text-blue-600 animate-spin" /> : <LocateFixed size={15} className="text-blue-600" />}
              {locating ? 'Locating…' : 'Use My Location'}
            </button>
          </div>

          {showStationList && stationMatches.length > 0 && (
            <div className="absolute top-full left-0 right-0 sm:right-auto sm:w-[calc(100%-140px)] mt-1 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-10 max-h-48 overflow-y-auto">
              {stationMatches.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={() => {
                    setMatchedStation(s)
                    setLocationQuery(s.name)
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between gap-2"
                >
                  <span className="text-slate-800">{s.name}</span>
                  <span className="text-slate-400 shrink-0" style={{ fontSize: '10px' }}>{s.lines.join(', ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {matchedStation && (
          <p className="text-xs text-blue-700 mb-4 px-1">Matched to {matchedStation.name}, this report will show up on that station's journeys.</p>
        )}
        {!matchedStation && locationQuery.trim() && (
          <p className="text-xs text-slate-400 mb-4 px-1">No matching station, this will be saved as a free-text location.</p>
        )}
        {!locationQuery.trim() && <div className="mb-6" />}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-4 text-xs text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-white font-medium py-3.5 rounded-full flex items-center justify-center gap-2"
        >
          {submitting ? 'Submitting…' : 'Submit report'} {!submitting && <ArrowRight size={16} />}
        </button>
      </form>
    </div>
  )
}
