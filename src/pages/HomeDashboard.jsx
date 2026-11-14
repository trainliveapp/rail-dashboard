import { updateTravelHeading } from '../lib/travelHeading'
import { locationErrorMessage, positionToLocation, isReliableMapLocation } from '../lib/mapLocation'
import { useState, useRef, useEffect } from 'react'
import TopPromoBar from '../components/TopPromoBar'
import NavBar from '../components/NavBar'
import JourneySearchBar from '../components/JourneySearchBar'
import JourneyPlannerPanel from '../components/JourneyPlannerPanel'
import SidebarBottom from '../components/SidebarBottom'
import MapPanel from '../components/MapPanel.leaflet.backup'
import MapChat from '../components/MapChat'
import FlavioComingSoonSheet from '../components/FlavioComingSoonSheet'
import FeatureCards from '../components/FeatureCards'
import DepartureBoards from '../components/DepartureBoards'
import NextDeparturesPanel from '../components/NextDeparturesPanel'
import SustainabilityBanner from '../components/SustainabilityBanner'
import Footer from '../components/Footer'
import AdSlot from '../components/AdSlot'
import { nearbyToggles, mapLayerToggles } from '../data/mockData'
import { useJourneyPlanner } from '../lib/useJourneyPlanner'

export default function HomeDashboard() {
  const [nearby, setNearby] = useState(nearbyToggles)
  const [layers, setLayers] = useState(mapLayerToggles)
  // Lives here now so NavBar's line chips and the map itself always agree.
  const [activeLines, setActiveLines] = useState([])
  const [mapTheme, setMapTheme] = useState(() => {
    try {
      return localStorage.getItem('trainlive-map-theme') || 'dark'
    } catch {
      return 'dark'
    }
  })
  // Same reasoning: the journey sheet and the map both need to know about
  // the current planned journey, so it lives here, not in either one.
  const [plannedJourney, setPlannedJourney] = useState(null)
  // Live preview of whatever's picked in the search form, before a journey
  // is actually planned, this is what makes the map react as you pick
  // stations instead of staying blank until you hit "Plan Journey".
  const [draftStations, setDraftStations] = useState(null)
  // All search/results state lives in this shared hook so the collapsed
  // search bar and expanded planner can share the same journey selection.
  const planner = useJourneyPlanner({ onJourneyPlanned: setPlannedJourney, onDraftChange: setDraftStations })
  // The user's real position, drives the moving arrow on the map. Starts
  // tracking only after a location action or choosing current location.
  const [liveLocation, setLiveLocation] = useState(null)
  const [liveLocationEnabled, setLiveLocationEnabled] = useState(false)
  const [liveLocationError, setLiveLocationError] = useState('')
  const [liveLocationPending, setLiveLocationPending] = useState(false)
  const [stationActionsNode, setStationActionsNode] = useState(null)
  const [desktopActionsNode, setDesktopActionsNode] = useState(null)
  const [isMobileLayout, setIsMobileLayout] = useState(() => window.matchMedia('(max-width: 767px)').matches)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const updateLayout = () => setIsMobileLayout(mediaQuery.matches)
    updateLayout()
    mediaQuery.addEventListener('change', updateLayout)
    return () => mediaQuery.removeEventListener('change', updateLayout)
  }, [])
  const [locationAttempt, setLocationAttempt] = useState(0)
  const watchIdRef = useRef(null)
  const prevFixRef = useRef(null)

  // Waze shows your position the moment it has it, not just once you've
  // finished picking a route, tracking should start the moment "current
  // location" is used for either field, planned or still just a draft.
  const usingCurrentLocation =
    draftStations?.fromStation?.id === 'current-location' ||
    draftStations?.toStation?.id === 'current-location' ||
    plannedJourney?.originStation?.id === 'current-location' ||
    plannedJourney?.destinationStation?.id === 'current-location'
  const wantsLiveLocation = liveLocationEnabled || usingCurrentLocation

  const locateLiveLocation = () => {
    setLiveLocationError('')
    setLiveLocationPending(true)
    setLiveLocationEnabled(true)
    if (watchIdRef.current == null) setLocationAttempt(value => value + 1)
    else setLiveLocationPending(false)
  }

  useEffect(() => {
    if (!wantsLiveLocation) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      prevFixRef.current = null
      return
    }
    if (!window.isSecureContext || !navigator.geolocation) {
      setLiveLocationError('Location requires HTTPS and device location permission.')
      setLiveLocationPending(false)
      return
    }

    setLiveLocationError('')
    let active = true

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!active) return
        let fix
        try { fix = positionToLocation(pos) } catch (error) { setLiveLocationPending(false); setLiveLocationError(locationErrorMessage(error)); return }
        if (!isReliableMapLocation(fix)) {
          setLiveLocationError('Waiting for an accurate location.')
          setLiveLocationPending(false)
          return
        }
        setLiveLocationPending(false)
        setLiveLocationError('')
        const travel = updateTravelHeading(prevFixRef.current, fix)
        prevFixRef.current = travel
        setLiveLocation({ ...fix, heading: travel.heading, moving: travel.moving })
      },
      (err) => {
        if (!active) return
        setLiveLocationPending(false)
        setLiveLocationError(locationErrorMessage(err))
        if (err.code === 1 && watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current)
          watchIdRef.current = null
          setLiveLocationEnabled(false)
        }
        console.warn('Live location unavailable:', err.message)
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
    )

    return () => {
      active = false
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [wantsLiveLocation, locationAttempt])

  const toggleNearby = (i) =>
    setNearby((prev) => prev.map((item, idx) => (idx === i ? { ...item, enabled: !item.enabled } : item)))
  const toggleLayer = (i) =>
    setLayers((prev) => prev.map((item, idx) => (idx === i ? { ...item, enabled: !item.enabled } : item)))
  const toggleLine = (name) =>
    setActiveLines((prev) => (prev.includes(name) ? prev.filter((l) => l !== name) : [...prev, name]))
  const selectMapTheme = (theme) => {
    setMapTheme(theme)
    try {
      localStorage.setItem('trainlive-map-theme', theme)
    } catch {
      // The map still works when storage is unavailable.
    }
  }

  // The planned journey (once it exists) always wins, it has the real
  // route legs to highlight. Before that, fall back to whatever's been
  // picked so far so the map isn't just sitting empty.
  const mapRoute =
    plannedJourney ||
    (draftStations?.fromStation || draftStations?.toStation
      ? { originStation: draftStations.fromStation, destinationStation: draftStations.toStation }
      : null)

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <TopPromoBar />
      <NavBar mapTheme={mapTheme} onMapThemeChange={selectMapTheme} />

      <div className="relative h-[65svh] sm:h-[75svh] lg:h-[calc(100dvh-130px)] min-h-[360px] sm:min-h-[420px] w-full">
        <MapPanel
          layers={layers}
          nearby={nearby}
          mapTheme={mapTheme}
          onMapThemeChange={selectMapTheme}
          activeLines={activeLines}
          highlightLines={plannedJourney?.selectedOption?.lines || []}
          route={mapRoute}
          liveLocation={liveLocation}
          liveLocationPending={liveLocationPending}
          liveLocationError={liveLocationError}
          onLocateLiveLocation={locateLiveLocation}
          onGetDirections={(station) => {
            planner.setToStation(station)
            planner.setToQuery(station.name)
            planner.setExpanded(true)
          }}
          className="h-full"
        />
        {false && (planner.expanded ? (
          <div className="absolute top-4 left-3 right-3 z-[1100] max-h-[calc(100%-2rem)] overflow-y-auto lg:left-1/2 lg:right-auto lg:w-[min(640px,calc(100%-2rem))] lg:-translate-x-1/2">
            <JourneyPlannerPanel planner={planner} onClose={() => planner.setExpanded(false)} />
          </div>
        ) : (
          <JourneySearchBar
            fromStation={planner.fromStation}
            toStation={planner.toStation}
            onExpand={() => planner.setExpanded(true)}
          />
        ))}
        <div ref={setDesktopActionsNode} className="desktop-station-actions" aria-label="Station Live features" />
      </div>

      <div ref={setStationActionsNode} className="station-actions" aria-label="Station Live features">
        {(stationActionsNode || desktopActionsNode) && (
          <MapChat launcherTarget={isMobileLayout ? stationActionsNode : desktopActionsNode} />
        )}
        {(stationActionsNode || desktopActionsNode) && (
          <FlavioComingSoonSheet launcherTarget={isMobileLayout ? stationActionsNode : desktopActionsNode} />
        )}
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-6xl mx-auto w-full">
        <AdSlot className="mx-auto w-full max-w-4xl" />
        <SidebarBottom nearby={nearby} toggleNearby={toggleNearby} layers={layers} toggleLayer={toggleLayer} className="border border-slate-200 rounded-xl" />
        <DepartureBoards />
      </div>

      <FeatureCards />

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-3 space-y-3 max-w-6xl mx-auto w-full">
        <NextDeparturesPanel />
        <SustainabilityBanner />
        <Footer />
      </div>
    </div>
  )
}
