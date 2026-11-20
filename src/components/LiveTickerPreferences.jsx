import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Search, X } from 'lucide-react'
import { toggleStationSelection } from '../lib/liveTicker'

const EMPTY_STATIONS = []

export default function LiveTickerPreferences({ preference, metadata, metadataReady, onApply, onClose }) {
  const dialog = useRef(null)
  const searchInput = useRef(null)
  const [selectedIds, setSelectedIds] = useState(() => preference.mode === 'stations' ? [...preference.ids] : [])
  const [search, setSearch] = useState('')
  const [limitMessage, setLimitMessage] = useState('')
  const stations = metadata?.stations || EMPTY_STATIONS
  const groups = useMemo(() => {
    const ordered = [...stations].sort((a, b) => a.name.localeCompare(b.name))
    const query = search.trim().toLocaleLowerCase()
    const matches = station => station.name.toLocaleLowerCase().includes(query)
    return query
      ? { selected: ordered.filter(station => selectedIds.includes(station.id) && matches(station)), available: ordered.filter(station => !selectedIds.includes(station.id) && matches(station)) }
      : { selected: ordered.filter(station => selectedIds.includes(station.id)), available: ordered.filter(station => !selectedIds.includes(station.id)) }
  }, [search, selectedIds, stations])

  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement
    element?.showModal()
    searchInput.current?.focus({ preventScroll: true })

    const updateVisibleBounds = () => {
      const viewport = window.visualViewport
      if (!element || !viewport) return
      const height = Math.max(120, viewport.height - 24)
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

  function toggle(id) {
    if (!selectedIds.includes(id) && selectedIds.length >= 3) {
      setLimitMessage('You can choose up to 3 stations.')
      return
    }
    setLimitMessage('')
    setSelectedIds(ids => toggleStationSelection(ids, id))
  }

  function apply() {
    if (selectedIds.length < 1 || selectedIds.length > 3) return
    onApply({ mode: 'stations', ids: [...new Set(selectedIds)] })
  }

  const renderStation = (station) => {
    const checked = selectedIds.includes(station.id)
    return (
      <label key={station.id} className={`live-preferences-option${checked ? ' is-selected' : ''}`}>
        <input type="checkbox" checked={checked} onChange={() => toggle(station.id)} />
        <span className="live-preferences-station-name">{station.name}</span>
        {checked && <Check size={18} aria-hidden="true" className="live-preferences-check" />}
      </label>
    )
  }

  return createPortal(
    <dialog
      ref={dialog}
      onCancel={event => { event.preventDefault(); onClose() }}
      onClick={event => { if (event.target === dialog.current) onClose() }}
      aria-labelledby="live-preferences-title"
      aria-describedby="live-preferences-subtitle"
      className="live-preferences"
    >
      <div className="live-preferences-layout">
        <header className="live-preferences-header">
          <h2 id="live-preferences-title">Personalise</h2>
          <button type="button" onClick={onClose} aria-label="Close Personalise" className="live-preferences-close"><X size={22} aria-hidden="true" /></button>
        </header>

        <p id="live-preferences-subtitle" className="live-preferences-subtitle">Choose up to 3 stations</p>
        <div className="live-preferences-count" aria-live="polite" aria-atomic="true">
          <strong>My Stations</strong>
          <span>{selectedIds.length} of 3 selected <span className="live-preferences-progress" aria-hidden="true">{[0, 1, 2].map(i => <i key={i} className={i < selectedIds.length ? 'active' : ''} />)}</span></span>
        </div>
        <label className="live-preferences-search-wrap">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only">Search for a station</span>
          <input
            ref={searchInput}
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search for a station…"
            autoComplete="off"
            className="live-preferences-search"
          />
        </label>

        <div className="live-preferences-results" role="group" aria-label="Stations">
          {groups.selected.length > 0 && <section aria-labelledby="my-stations-heading"><h3 id="my-stations-heading" className="live-preferences-group-heading">My Stations ({groups.selected.length})</h3>{groups.selected.map(renderStation)}</section>}
          {(groups.available.length > 0 || !groups.selected.length) && <section aria-labelledby="all-stations-heading"><h3 id="all-stations-heading" className="live-preferences-group-heading">{search.trim() ? 'Search results' : 'All Stations'}</h3>{groups.available.map(renderStation)}</section>}
          {!groups.selected.length && !groups.available.length && (
            <p className="live-preferences-empty" role="status">
              {stations.length ? 'No matching stations.' : metadataReady ? 'Station list is unavailable right now.' : 'Loading stations…'}
            </p>
          )}
        </div>
        <p className="live-preferences-message" role="status">{limitMessage || (selectedIds.length === 0 ? 'Select at least one station.' : '')}</p>

        <footer className="live-preferences-actions">
          <button type="button" onClick={() => { setSelectedIds([]); setLimitMessage('') }} className="live-preferences-clear">Clear</button>
          <button type="button" onClick={apply} disabled={selectedIds.length === 0} className="live-preferences-apply"><Check size={18} aria-hidden="true" />Apply ({selectedIds.length}/3)</button>
        </footer>
      </div>
    </dialog>,
    document.body,
  )
}
