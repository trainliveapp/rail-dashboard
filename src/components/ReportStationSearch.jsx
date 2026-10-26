import { useEffect, useRef, useState } from 'react'
import { ChevronDown, MapPin, X } from 'lucide-react'
import { findReportStations, resolveReportStation } from '../lib/reportStations'

export default function ReportStationSearch({ value, onChange, id = 'report-station', label = 'Search Station', findStations = findReportStations, resolveStation = resolveReportStation }) {
  const [open, setOpen] = useState(false)
  const [browseAll, setBrowseAll] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const matches = findStations(browseAll ? '' : value)
  const selected = resolveStation(value)

  useEffect(() => {
    if (open && activeIndex >= 0) {
      listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, activeIndex])

  const choose = (station) => {
    onChange(station.name)
    inputRef.current?.focus()
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => {
        if (!matches.length) return -1
        if (index < 0) return event.key === 'ArrowDown' ? 0 : matches.length - 1
        return Math.max(0, Math.min(matches.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))
      })
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      if (matches[activeIndex]) choose(matches[activeIndex])
      else if (matches.length === 1) choose(matches[0])
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="relative z-40 mb-6" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }}>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800 mb-2 block">{label}</label>
      <div className="rounded-2xl bg-blue-50 p-3">
      <div className="flex items-center gap-1 rounded-md border border-blue-200 bg-white py-1.5 pl-3 pr-1.5 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue">
        <div className="min-w-0 flex-1">
        <span className="block text-xs leading-4 text-slate-700">Enter station name</span>
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          aria-describedby={`${id}-help`}
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value)
            setBrowseAll(false)
            setOpen(true)
            setActiveIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search station name or code"
          required
          autoComplete="off"
          className="block w-full min-w-0 bg-transparent text-base leading-6 text-blue-700 outline-none placeholder:text-blue-700"
        />
        </div>
        {value && (
          <button
            type="button"
            aria-label="Clear station search"
            onClick={() => {
              onChange('')
              setBrowseAll(false)
              setActiveIndex(-1)
              inputRef.current?.focus()
              setOpen(true)
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-brand-blue hover:bg-blue-50"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        )}
        <button
          type="button"
          aria-label={open ? 'Close station list' : 'Browse all stations'}
          aria-expanded={open}
          aria-controls={`${id}-list`}
          onClick={() => {
            const nextOpen = !open
            inputRef.current?.focus()
            setBrowseAll(true)
            setActiveIndex(-1)
            setOpen(nextOpen)
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-brand-blue hover:bg-blue-50"
        >
          <ChevronDown size={18} className={open ? 'rotate-180' : ''} />
        </button>
      </div>
      </div>
      <p id={`${id}-help`} className="sr-only">Type a name or three-letter code, or use the arrow to browse all stations.</p>
      {open && (
        <div className="relative z-50 mt-2 rounded-md border border-slate-300 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.28)]">
          <p role="status" className={matches.length ? 'sr-only' : 'relative rounded-md bg-white px-3 py-3 text-sm text-slate-500'}>
            {matches.length ? `${matches.length.toLocaleString('en-GB')} stations${browseAll || !value.trim() ? ' · A–Z' : ' found'}` : 'No stations found. Try another name or code.'}
          </p>
          <ul ref={listRef} id={`${id}-list`} role="listbox" aria-label="Stations" className="station-search-options no-scrollbar relative overflow-y-auto overscroll-contain rounded-md bg-white">
            {matches.map((station, index) => {
              const matchStart = browseAll ? -1 : station.name.toLowerCase().indexOf(value.trim().toLowerCase())
              const matchLength = value.trim().length
              return (
              <li
                id={`${id}-option-${index}`}
                key={station.name}
                role="option"
                aria-selected={selected?.name === station.name}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(station)}
                className={`flex min-h-11 cursor-pointer items-center gap-2 border-b border-slate-200 px-3 py-2.5 text-[13px] leading-5 text-slate-900 last:border-b-0 hover:bg-blue-50 hover:inset-ring-2 hover:inset-ring-brand-blue ${activeIndex === index || selected?.name === station.name ? 'bg-blue-50 inset-ring-2 inset-ring-brand-blue' : ''}`}
              >
                <MapPin className="h-5 w-6 shrink-0 text-brand-blue" aria-hidden="true" />
                <span className="min-w-0 break-words">
                  {matchStart >= 0 && matchLength > 0 ? <>
                    {station.name.slice(0, matchStart)}
                    <strong className="font-semibold">{station.name.slice(matchStart, matchStart + matchLength)}</strong>
                    {station.name.slice(matchStart + matchLength)}
                  </> : station.name}
                  {station.code && <span className="whitespace-nowrap"> ({station.code})</span>}
                </span>
              </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
