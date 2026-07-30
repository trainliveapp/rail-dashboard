import { useState, useEffect } from 'react'
import { planJourney } from './journeyPlanner'

// All the journey-planning state used to live inside one component
// (JourneySheet) that rendered as a single absolutely-positioned overlay on
// top of the map. That's what made the results panel able to cover the
// whole map, it and the search bar were the same element. Splitting the UI
// into a collapsed search bar (stays over the map) and an expanded panel
// (rendered as normal page content below the map) means the state they
// share needs to live somewhere both can reach, this hook is that shared
// place. HomeDashboard calls it once and hands the relevant pieces to each.
export function useJourneyPlanner({ onJourneyPlanned, onDraftChange } = {}) {
  const [expanded, setExpanded] = useState(false)
  const [journeyTab, setJourneyTab] = useState('saved')
  const [savedOpen, setSavedOpen] = useState(false)

  const [fromStation, setFromStation] = useState(null)
  const [toStation, setToStation] = useState(null)
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [locatingCurrentLocation, setLocatingCurrentLocation] = useState(false)

  const [journey, setJourney] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [planning, setPlanning] = useState(false)
  const [planError, setPlanError] = useState('')

  // The map only needs to know which route is currently selected, not the
  // whole planning state machine, so it's the one thing we push up whenever
  // either the plan or the selection changes.
  useEffect(() => {
    if (!journey) {
      onJourneyPlanned?.(null)
      return
    }
    onJourneyPlanned?.({ ...journey, selectedOption: journey.options[selectedIndex] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey, selectedIndex])

  // Live preview: as soon as either station is picked, the map should show
  // it immediately, the same way Waze drops a pin the moment you choose a
  // destination, not only once a full route comes back. Once a journey has
  // actually been planned, that takes over the map instead.
  useEffect(() => {
    if (journey) return
    onDraftChange?.({ fromStation, toStation })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromStation, toStation, journey])

  const handleSwap = () => {
    const fs = fromStation
    const fq = fromQuery
    setFromStation(toStation)
    setFromQuery(toQuery)
    setToStation(fs)
    setToQuery(fq)
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setPlanError('Location is not available on this device.')
      return
    }
    setPlanError('')
    setLocatingCurrentLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingCurrentLocation(false)
        const here = {
          id: 'current-location',
          name: 'Your location',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          lines: [],
        }
        setFromStation(here)
        setFromQuery(here.name)
      },
      () => {
        setLocatingCurrentLocation(false)
        setPlanError('Could not get your location, check your browser/device permissions.')
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    )
  }

  const handlePlanJourney = async () => {
    setPlanError('')
    if (!fromStation || !toStation) {
      setPlanError('Pick a station from the list for both fields.')
      return
    }
    setPlanning(true)
    try {
      const result = await planJourney(fromStation, toStation)
      setJourney(result)
      setSelectedIndex(0)
    } catch (err) {
      setPlanError(err.message || 'Could not plan that journey.')
    } finally {
      setPlanning(false)
    }
  }

  const handleBackToSearch = () => {
    setJourney(null)
    setSelectedIndex(0)
  }

  return {
    expanded, setExpanded,
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
  }
}
