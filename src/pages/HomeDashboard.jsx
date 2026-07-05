import { useState } from 'react'
import TopPromoBar from '../components/TopPromoBar'
import Sidebar from '../components/Sidebar'
import MapPanel from '../components/MapPanel'
import FeatureCards from '../components/FeatureCards'
import DepartureBoards from '../components/DepartureBoards'
import DisruptionsAndEvents from '../components/DisruptionsAndEvents'
import NextDeparturesPanel from '../components/NextDeparturesPanel'
import SustainabilityBanner from '../components/SustainabilityBanner'
import Footer from '../components/Footer'
import { nearbyToggles, mapLayerToggles } from '../data/mockData'

export default function HomeDashboard() {
  // Owned here (not inside Sidebar) so the map can react to the same toggles,
  // e.g. switching on "Housebuddy" actually shows rental pins on the map.
  const [nearby, setNearby] = useState(nearbyToggles)
  const [layers, setLayers] = useState(mapLayerToggles)

  const toggleNearby = (i) =>
    setNearby((prev) => prev.map((item, idx) => (idx === i ? { ...item, enabled: !item.enabled } : item)))
  const toggleLayer = (i) =>
    setLayers((prev) => prev.map((item, idx) => (idx === i ? { ...item, enabled: !item.enabled } : item)))

  return (
    <div className="min-h-screen bg-slate-50">
      <TopPromoBar />

      <div className="flex flex-col lg:flex-row">
        <Sidebar nearby={nearby} toggleNearby={toggleNearby} layers={layers} toggleLayer={toggleLayer} />

        <main className="flex-1 min-w-0">
          <MapPanel layers={layers} nearby={nearby} />

          <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-6xl mx-auto">
            <FeatureCards />
            <DepartureBoards />
            <DisruptionsAndEvents />
            <NextDeparturesPanel />
            <SustainabilityBanner />
            <Footer />
          </div>
        </main>
      </div>
    </div>
  )
}
