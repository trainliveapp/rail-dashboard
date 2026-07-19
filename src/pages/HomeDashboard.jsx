import { useState, useRef, useEffect } from 'react'
import TopPromoBar from '../components/TopPromoBar'
import NavBar from '../components/NavBar'
import JourneySearchBar from '../components/JourneySearchBar'
import JourneyPlannerPanel from '../components/JourneyPlannerPanel'
import SidebarBottom from '../components/SidebarBottom'
import MapPanel from '../components/MapPanel'
import FeatureCards from '../components/FeatureCards'
import DepartureBoards from '../components/DepartureBoards'
import NextDeparturesPanel from '../components/NextDeparturesPanel'
import SustainabilityBanner from '../components/SustainabilityBanner'
import Footer from '../components/Footer'
import { nearbyToggles, mapLayerToggles } from '../data/mockData'
import { useJourneyPlanner } from '../lib/useJourneyPlanner'

// Most phones only report GPS heading while actually moving at a decent
// pace, it's frequently null. When that happens, this derives a heading
// from the last two fixes instead, so the live arrow still points the
// direction of travel rather than freezing at whatever it last had.
function bearingBetween(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const toDeg = (rad) => (rad * 180) / Math.PI
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const dLng = toRad(b.lng - a.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export default function HomeDashboard() {
  const [nearby, setNearby] = useState(nearbyToggles)
  const [layers, setLayers] = useState(mapLayerToggles)
  // Lives here now so NavBar's line chips and the map itself always agree.
  const [activeLines, setActiveLines] = useState([])
  // Same reasoning: the journey sheet and the map both need to know about
  // the current planned journey, so it lives here, not in either one.
  const [plannedJourney, setPlannedJourney] = useState(null)
  // Live preview of whatever's picked in the search form, before a journey
  // is actually planned, this is what makes the map react as you pick
  // stations instead of staying blank until you hit "Plan Journey".
  const [draftStations, setDraftStations] = useState(null)
  // All the search/results state (previously local to the JourneySheet
  // overlay) now lives in this shared hook, so the collapsed search bar
  // (stays on the map) and the expanded planner (now below the map, not on
  // top of it) can both read/drive the same state.
  const planner = useJourneyPlanner({ onJourneyPlanned: setPlannedJourney, onDraftChange: setDraftStations })
  // The user's real position, drives the moving arrow on the map. Starts
  // tracking as soon as "current location" is in use anywhere, or a
  // journey's been planned, not run for free just browsing the network map.
  const [liveLocation, setLiveLocation] = useState(null)
  const watchIdRef = useRef(null)
  const prevFixRef = useRef(null)

  const hasPlannedJourney = !!plannedJourney
  // Waze shows your position the moment it has it, not just once you've
  // finished picking a route, tracking should start the moment "current
  // location" is used for either field, planned or still just a draft.
  const usingCurrentLocation =
    draftStations?.fromStation?.id === 'current-location' ||
    draftStations?.toStation?.id === 'current-location' ||
    plannedJourney?.originStation?.id === 'current-location' ||
    plannedJourney?.destinationStation?.id === 'current-location'
  const wantsLiveLocation = hasPlannedJourney || usingCurrentLocation

  useEffect(() => {
    if (!wantsLiveLocation) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      prevFixRef.current = null
      setLiveLocation(null)
      return
    }
    if (!navigator.geolocation) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        let heading = Number.isFinite(pos.coords.heading) ? pos.coords.heading : null

        const prev = prevFixRef.current
        if (heading == null && prev) {
          const moved = Math.hypot(lat - prev.lat, lng - prev.lng)
          // ~5m threshold, ignores GPS jitter while stationary so the arrow
          // doesn't spin randomly when someone's standing still.
          if (moved > 0.00005) heading = bearingBetween(prev, { lat, lng })
        }
        const resolvedHeading = heading ?? prev?.heading ?? 0
        prevFixRef.current = { lat, lng, heading: resolvedHeading }
        setLiveLocation({ lat, lng, heading: resolvedHeading })
      },
      (err) => {
        console.warn('Live location unavailable:', err.message)
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [wantsLiveLocation])

  const toggleNearby = (i) =>
    setNearby((prev) => prev.map((item, idx) => (idx === i ? { ...item, enabled: !item.enabled } : item)))
  const toggleLayer = (i) =>
    setLayers((prev) => prev.map((item, idx) => (idx === i ? { ...item, enabled: !item.enabled } : item)))
  const toggleLine = (name) =>
    setActiveLines((prev) => (prev.includes(name) ? prev.filter((l) => l !== name) : [...prev, name]))

  useEffect(() => {
    if (!planner.expanded) return
    document.getElementById('journey-planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [planner.expanded])

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
      <NavBar activeLines={activeLines} onToggleLine={toggleLine} />

      <div className="relative h-[65vh] sm:h-[75vh] lg:h-[calc(100vh-130px)] min-h-[420px] w-full">
        <MapPanel
          layers={layers}
          nearby={nearby}
          activeLines={activeLines}
          highlightLines={plannedJourney?.selectedOption?.lines || []}
          route={mapRoute}
          liveLocation={liveLocation}
          className="h-full"
        />
        <JourneySearchBar
          fromStation={planner.fromStation}
          toStation={planner.toStation}
          onExpand={() => planner.setExpanded(true)}
        />
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-6xl mx-auto w-full">
        {planner.expanded && (
          <JourneyPlannerPanel planner={planner} onClose={() => planner.setExpanded(false)} />
        )}
        <SidebarBottom nearby={nearby} toggleNearby={toggleNearby} layers={layers} toggleLayer={toggleLayer} className="border border-slate-200 rounded-xl" />
        <DepartureBoards />
        <FeatureCards />
        <NextDeparturesPanel />
        <SustainabilityBanner />
        <Footer />
      </div>
    </div>
  )
}