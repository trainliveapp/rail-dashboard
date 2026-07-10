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

      {/* The map itself, search sheet floats on top of just this section.
          Shorter on mobile (65vh) so a hint of the page below shows and
          invites scrolling, full height from sm: up. */}
      <div className="relative h-[65vh] sm:h-[75vh] lg:h-[calc(100vh-130px)] min-h-[420px] w-full">
        <MapPanel layers={layers} nearby={nearby} activeLines={activeLines} className="h-full" />
        <JourneySheet />
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
