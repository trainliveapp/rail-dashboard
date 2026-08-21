import { useState, useEffect } from 'react'
import { planJourney } from './journeyPlanner'
import { getSavedJourneys, saveJourney, deleteSavedJourney, toggleFavorite, getJourneyHistory, trackJourneySearch } from './savedJourneys'

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
  const [journeyTab, setJourneyTab] = useState('leave')
  const [savedOpen, setSavedOpen] = useState(false)

  // Saved journeys & history
  const [savedJourneys, setSavedJourneys] = useState([])
  const [journeyHistory, setJourneyHistory] = useState([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [savingJourney, setSavingJourney] = useState(false)
  const [saveError, setSaveError] = useState('')

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

  // Load saved journeys and history on mount
  useEffect(() => {
    const loadSavedData = async () => {
      setLoadingSaved(true)
      const { journeys } = await getSavedJourneys()
      setSavedJourneys(journeys)
      setLoadingSaved(false)
    }
    loadSavedData()
  }, [])

  useEffect(() => {
    const loadHistory = async () => {
      setLoadingHistory(true)
      const { history } = await getJourneyHistory()
      setJourneyHistory(history)
      setLoadingHistory(false)
    }
    loadHistory()
  }, [])

  // Auto-track journey when planned
  useEffect(() => {
    if (journey && fromStation && toStation) {
      trackJourneySearch({ fromStation, toStation })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey])

  const handleSaveJourney = async (isFavorite = false) => {
    if (!fromStation || !toStation) {
      setSaveError('Pick both stations to save')
      return
    }
    setSavingJourney(true)
    setSaveError('')
    const { error } = await saveJourney({
      fromStation,
      toStation,
      isFavorite,
    })
    setSavingJourney(false)
    if (error) {
      setSaveError(error)
      return
    }
    // Reload saved journeys
    const { journeys } = await getSavedJourneys()
    setSavedJourneys(journeys)
  }

  const handleLoadSavedJourney = (savedJourney) => {
    setFromStation(savedJourney.fromStation)
    setFromQuery(savedJourney.fromStation.name)
    setToStation(savedJourney.toStation)
    setToQuery(savedJourney.toStation.name)
    setJourney(null)
    setSelectedIndex(0)
    setSavedOpen(false)
  }

  const handleDeleteSavedJourney = async (journeyId) => {
    const { error } = await deleteSavedJourney(journeyId)
    if (error) {
      setSaveError(error)
      return
    }
    // Reload saved journeys
    const { journeys } = await getSavedJourneys()
    setSavedJourneys(journeys)
  }

  const handleToggleFavorite = async (journeyId, isFavorite) => {
    const { error } = await toggleFavorite(journeyId, isFavorite)
    if (error) {
      setSaveError(error)
      return
    }
    // Update local state
    setSavedJourneys(
      savedJourneys.map((j) => (j.id === journeyId ? { ...j, favorite: isFavorite } : j))
    )
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
    // Saved journeys & history
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
  }
}
