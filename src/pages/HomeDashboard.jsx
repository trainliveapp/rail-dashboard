import { useState } from 'react'
import TopPromoBar from '../components/TopPromoBar'
import NavBar from '../components/NavBar'
import JourneySheet from '../components/JourneySheet'
import SidebarBottom from '../components/SidebarBottom'
import MapPanel from '../components/MapPanel'
import FeatureCards from '../components/FeatureCards'
import DepartureBoards from '../components/DepartureBoards'
import NextDeparturesPanel from '../components/NextDeparturesPanel'
import SustainabilityBanner from '../components/SustainabilityBanner'
import Footer from '../components/Footer'
import { nearbyToggles, mapLayerToggles } from '../data/mockData'

export default function HomeDashboard() {
  const [nearby, setNearby] = useState(nearbyToggles)
  const [layers, setLayers] = useState(mapLayerToggles)
  // Lives here now so NavBar's line chips and the map itself always agree.
  const [activeLines, setActiveLines] = useState([])
  // Same reasoning: the journey sheet and the map both need to know about
  // the current planned journey, so it lives here, not in either one.
  const [plannedJourney, setPlannedJourney] = useState(null)

  const toggleNearby = (i) =>
    setNearby((prev) => prev.map((item, idx) => (idx === i ? { ...item, enabled: !item.enabled } : item)))
  const toggleLayer = (i) =>
    setLayers((prev) => prev.map((item, idx) => (idx === i ? { ...item, enabled: !item.enabled } : item)))
  const toggleLine = (name) =>
    setActiveLines((prev) => (prev.includes(name) ? prev.filter((l) => l !== name) : [...prev, name]))

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <TopPromoBar />
      <NavBar activeLines={activeLines} onToggleLine={toggleLine} />

      <div className="relative h-[65vh] sm:h-[75vh] lg:h-[calc(100vh-130px)] min-h-[420px] w-full">
        <MapPanel
          layers={layers}
          nearby={nearby}
          activeLines={activeLines}
          highlightLines={plannedJourney ? plannedJourney.legs.map((l) => l.line) : []}
          className="h-full"
        />
        <JourneySheet onJourneyPlanned={setPlannedJourney} />
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-6xl mx-auto w-full">
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