import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ALL_UPDATES, toggleStationSelection } from '../lib/liveTicker'

const EMPTY_STATIONS = []

export default function LiveTickerPreferences({ preference, metadata, metadataReady, onApply, onClose }) {
  const dialog = useRef(null)
  const searchInput = useRef(null)
  const [selectedIds, setSelectedIds] = useState(() => preference.mode === 'stations' ? preference.ids : [])
  const [search, setSearch] = useState('')
  const stations = metadata?.stations || EMPTY_STATIONS
  const options = useMemo(() => {
    const query = search.trim().toLowerCase()
    return stations.filter(station => station.name.toLowerCase().includes(query))
  }, [search, stations])

  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement
    element?.showModal()
    searchInput.current?.focus({ preventScroll: true })

    const updateVisibleBounds = () => {
      const viewport = window.visualViewport
      if (!element || !viewport) return
      const height = Math.max(150, viewport.height - 24)
      element.style.top = `${Math.max(0, viewport.offsetTop + 12)}px`
      element.style.height = `${height}px`
      element.style.maxHeight = `${height}px`
    }
    updateVisibleBounds()
    window.visualViewport?.addEventListener('resize', updateVisibleBounds)
    window.visualViewport?.addEventListener('scroll', updateVisibleBounds)
    window.addEventListener('resize', updateVisibleBounds)
    return () => {
      window.visualViewport?.removeEventListener('resize', updateVisibleBounds)
      window.visualViewport?.removeEventListener('scroll', updateVisibleBounds)
      window.removeEventListener('resize', updateVisibleBounds)
      previous?.focus?.()
    }
  }, [])

  function apply() {
    onApply(selectedIds.length ? { mode: 'stations', ids: selectedIds } : ALL_UPDATES)
  }

  return createPortal(
    <dialog
      ref={dialog}
      onCancel={onClose}
      onClick={event => { if (event.target === dialog.current) onClose() }}
      aria-labelledby="live-preferences-title"
      aria-describedby="live-preferences-subtitle"
      className="live-preferences"
    >
      <div className="live-preferences-layout">
        <header className="live-preferences-header">
          <div>
            <h2 id="live-preferences-title" className="text-xl font-bold">Personalise</h2>
            <p id="live-preferences-subtitle" className="mt-1 text-sm text-slate-600">Choose up to 3 stations</p>
          </div>
          <button type="button" onClick={onClose} className="live-preferences-close">Close</button>
        </header>

        <p className="live-preferences-count" aria-live="polite" aria-atomic="true">
          {selectedIds.length} of 3 selected
        </p>
        <label htmlFor="live-station-search" className="sr-only">Search for a station</label>
        <input
          ref={searchInput}
          id="live-station-search"
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search for a station..."
          autoComplete="off"
          className="live-preferences-search"
        />

        <div className="live-preferences-results" role="group" aria-label="Stations">
          {options.map(station => {
            const checked = selectedIds.includes(station.id)
            return (
              <label key={station.id} className="live-preferences-option">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && selectedIds.length >= 3}
                  onChange={() => setSelectedIds(ids => toggleStationSelection(ids, station.id))}
                />
                <span>{station.name}</span>
              </label>
            )
          })}
          {!options.length && (
            <p className="live-preferences-empty" role="status">
              {stations.length ? 'No matching stations.' : metadataReady ? 'Station list is unavailable right now.' : 'Loading stations…'}
            </p>
          )}
        </div>

        <footer className="live-preferences-actions">
          <button type="button" onClick={() => setSelectedIds([])} className="live-preferences-clear">Clear</button>
          <button type="button" onClick={apply} className="live-preferences-apply">Apply ({selectedIds.length}/3)</button>
        </footer>
      </div>
    </dialog>,
    document.body,
  )
}
