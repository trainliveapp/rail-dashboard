import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Search, X } from 'lucide-react'
import ReportStationSearch from './ReportStationSearch'
import { findTrainStations, resolveTrainStation, trainSearchLink } from '../lib/trainStations'

export default function TrainSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const station = resolveTrainStation(query)

  useEffect(() => {
    if (!open) return
    rootRef.current?.querySelector('input')?.focus()
    const dismiss = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }} onKeyDown={(event) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault()
        close()
      }
    }}>
      <button ref={triggerRef} type="button" onClick={() => setOpen((value) => !value)}
        aria-expanded={open} aria-controls="train-search-panel"
        className="flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-ink px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">
        <Search size={14} aria-hidden="true" /> Find trains
      </button>
      {open && (
        <section id="train-search-panel" aria-labelledby="train-search-title"
          className="train-search-panel absolute right-0 top-full z-[2100] mt-3 w-[min(400px,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="train-search-title" className="text-base font-bold">Find trains</h2>
            <button type="button" onClick={close} aria-label="Close train search" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-slate-100"><X size={18} /></button>
          </div>
          <p className="mb-3 text-xs text-slate-500">Search UK rail stations by name or code, or browse the full A–Z list.</p>
          <ReportStationSearch id="train-search-station" label="Departure station" value={query} onChange={setQuery}
            findStations={findTrainStations} resolveStation={resolveTrainStation} />
          {station ? (
            <div aria-live="polite">
              <p className="mb-2 text-sm font-semibold">{station.name}</p>
              <a href={trainSearchLink(station)} target="_blank" rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
                {station.network === 'translink' ? 'Open Translink planner' : 'View live trains'} <ExternalLink size={15} aria-hidden="true" />
              </a>
              <p className="mt-2 text-xs text-slate-500">{station.network === 'translink' ? 'Choose this station in Translink’s planner.' : 'Departures open on National Rail.'} Opens in a new tab.</p>
            </div>
          ) : <p className="text-xs text-slate-500">Select a station to find train times.</p>}
        </section>
      )}
    </div>
  )
}
