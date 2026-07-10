import { useState } from 'react'
import TopPromoBar from '../components/TopPromoBar'
import FloatingTopBar from '../components/FloatingTopBar'
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

  const toggleNearby = (i) =>
    setNearby((prev) => prev.map((item, idx) => (idx === i ? { ...item, enabled: !item.enabled } : item)))
  const toggleLayer = (i) =>
    setLayers((prev) => prev.map((item, idx) => (idx === i ? { ...item, enabled: !item.enabled } : item)))

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <TopPromoBar />

      {/* Map-first hero, Waze-style: the map is the whole screen, everything
          else (menu, sign in, search) floats on top of it, nothing is hidden
          behind a click first. */}
      <div className="relative h-[calc(100vh-42px)] min-h-[520px] w-full">
        <MapPanel layers={layers} nearby={nearby} className="h-full" />
        <FloatingTopBar />
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
