import { useState } from 'react'
import { Heart, Clock, ArrowUpDown, ArrowRight, X, Plus, AlertCircle, LocateFixed, MapPin, Trash2, Loader } from 'lucide-react'
import { stations } from '../data/mockData'
import JourneyResults from './JourneyResults'

function StationField({ label, dotClass, station, query, onQueryChange, onSelect, onClear, placeholder, onUseCurrentLocation, locating }) {
  const [focused, setFocused] = useState(false)
  const matches =
    query.trim().length > 0
      ? stations.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
      : []
  const showDropdown = focused && (matches.length > 0 || !!onUseCurrentLocation)

  return (
    <div className="relative">
      <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} />
        <div className="flex-1 min-w-0">
          <label className="text-xs text-slate-400 block">{label}</label>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder={placeholder}
            className="text-base font-medium text-slate-800 outline-none w-full bg-transparent placeholder:text-slate-300 placeholder:font-normal"
          />
        </div>
        {(station || query) && (
          <button onClick={onClear} aria-label={`Clear ${label}`} className="text-slate-400 shrink-0">
            <X size={18} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 max-h-48 overflow-y-auto">
          {onUseCurrentLocation && (
            <button
              onMouseDown={onUseCurrentLocation}
              disabled={locating}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 border-b border-slate-50"
            >
              <span className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
                <LocateFixed size={14} />
              </span>
              <span className="font-medium text-blue-700">{locating ? 'Finding you…' : 'Use current location'}</span>
            </button>
          )}
          {matches.map((s) => (
            <button
              key={s.id}
              onMouseDown={() => onSelect(s)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between gap-2"
            >
              <span className="text-slate-800">{s.name}</span>
              <span className="text-[10px] text-slate-400 shrink-0">{s.lines.join(', ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function JourneyPlannerPanel({ planner, onClose }) {
  const {
    journeyTab, setJourneyTab,
    savedOpen, setSavedOpen,
    fromStation, setFromStation,
    toStation, setToStation,
    fromQuery, setFromQuery,
    toQuery, setToQuery,
    locatingCurrentLocation,
    journey, selectedIndex, setSelectedIndex,
    planning, planError,
    handleSwap, handleUseCurrentLocation, handlePlanJourney, handleBackToSearch,
    savedJourneys,
    journeyHistory,
    loadingSaved,
    loadingHistory,
    savingJourney,
    saveError,
    handleSaveJourney,
    handleLoadSavedJourney,
    handleDeleteSavedJourney,
    handleToggleFavorite,
  } = planner

  return (
    <div id="journey-planner" className="bg-white rounded-2xl shadow-sm border border-slate-200 px-5 py-5 scroll-mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold tracking-widest text-slate-400 flex items-center gap-2">
          <MapPin size={13} /> {journey ? 'JOURNEY OPTIONS' : 'PLAN JOURNEY'}
        </h2>
        <button onClick={onClose} aria-label="Close planner" className="text-slate-400">
          <X size={18} />
        </button>
      </div>

      {journey ? (
        <JourneyResults
          journey={journey}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          onBack={handleBackToSearch}
        />
      ) : (
        <>
          <div className="relative bg-slate-100 rounded-full p-1 flex mb-4 max-w-md">
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
                <div className="absolute top-full left-0 mt-2 w-full min-w-[280px] bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold tracking-widest text-slate-400">SAVED JOURNEYS</h3>
                    <button
                      onClick={() => handleSaveJourney(false)}
                      disabled={savingJourney || !fromStation || !toStation}
                      className="text-xs font-medium text-blue-600 disabled:text-slate-300 flex items-center gap-1 transition-colors"
                    >
                      {savingJourney ? <Loader size={12} className="animate-spin" /> : <Plus size={12} />}
                      Save Current
                    </button>
                  </div>

                  {saveError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-2 py-2 mb-3">
                      <AlertCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{saveError}</p>
                    </div>
                  )}

                  {loadingSaved ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader size={16} className="text-slate-400 animate-spin" />
                    </div>
                  ) : savedJourneys.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">No saved journeys yet</p>
                  ) : (
                    <div className="space-y-1 mb-4">
                      {savedJourneys.map((j) => (
                        <div key={j.id} className="flex items-center justify-between gap-2 py-2 px-2 hover:bg-slate-50 rounded-lg group">
                          <button
                            onClick={() => handleLoadSavedJourney(j)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="text-sm font-medium text-slate-800 truncate">{j.route}</p>
                            <p className="text-xs text-slate-400 truncate">{j.stations}</p>
                          </button>
                          <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleFavorite(j.id, !j.favorite)
                              }}
                              aria-label={`${j.favorite ? 'Remove' : 'Add'} ${j.route} ${j.favorite ? 'from' : 'to'} favourites`}
                              className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Heart size={14} className={j.favorite ? 'text-red-500 fill-red-500' : ''} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSavedJourney(j.id)
                              }}
                              aria-label={`Delete saved journey ${j.route}`}
                              className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {loadingHistory ? (
                    <div className="flex items-center justify-center border-t border-slate-100 pt-3 mt-3">
                      <Loader size={14} className="text-slate-400 animate-spin" aria-label="Loading recent journeys" />
                    </div>
                  ) : journeyHistory.length > 0 && (
                    <>
                      <div className="border-t border-slate-100 pt-3 mt-3">
                        <h4 className="text-xs font-bold tracking-widest text-slate-400 mb-2">RECENT</h4>
                        <div className="space-y-1">
                          {journeyHistory.slice(0, 5).map((h) => (
                            <button
                              type="button"
                              key={h.id}
                              onClick={() => handleLoadSavedJourney(h)}
                              aria-label={`Load recent journey ${h.route}`}
                              className="w-full text-left py-1.5 px-2 hover:bg-slate-50 rounded-lg"
                            >
                              <p className="text-xs text-slate-600 truncate">{h.route}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {planError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-3 max-w-md">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{planError}</p>
            </div>
          )}

          <div className="relative mb-5 space-y-2 max-w-md">
            <StationField
              label="Starting station"
              dotClass="bg-blue-600"
              station={fromStation}
              query={fromQuery}
              onQueryChange={(v) => {
                setFromQuery(v)
                setFromStation(null)
              }}
              onSelect={(s) => {
                setFromStation(s)
                setFromQuery(s.name)
              }}
              onClear={() => {
                setFromStation(null)
                setFromQuery('')
              }}
              placeholder="Add station"
              onUseCurrentLocation={handleUseCurrentLocation}
              locating={locatingCurrentLocation}
            />

            <StationField
              label="Destination"
              dotClass="border-2 border-slate-400 bg-transparent"
              station={toStation}
              query={toQuery}
              onQueryChange={(v) => {
                setToQuery(v)
                setToStation(null)
              }}
              onSelect={(s) => {
                setToStation(s)
                setToQuery(s.name)
              }}
              onClear={() => {
                setToStation(null)
                setToQuery('')
              }}
              placeholder="Add station"
            />

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
            disabled={planning}
            className="w-full max-w-md bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 transition-colors text-white font-semibold text-base py-3.5 rounded-full flex items-center justify-between px-6"
          >
            {planning ? 'Planning…' : 'Plan Journey'} <ArrowRight size={18} />
          </button>
        </>
      )}
    </div>
  )
}
