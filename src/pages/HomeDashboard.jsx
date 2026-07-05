import { useState } from 'react'
import TopPromoBar from '../components/TopPromoBar'
import SidebarTop from '../components/SidebarTop'
import SidebarBottom from '../components/SidebarBottom'
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

      <div className="dashboard-grid">
        <SidebarTop className="area-top lg:border-r border-slate-200" />

        <div className="area-map">
          <MapPanel layers={layers} nearby={nearby} />
        </div>

        <SidebarBottom
          nearby={nearby}
          toggleNearby={toggleNearby}
          layers={layers}
          toggleLayer={toggleLayer}
          className="area-rest lg:border-r border-slate-200"
        />

        <div className="area-content px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-6xl mx-auto w-full">
          <FeatureCards />
          <DepartureBoards />
          <DisruptionsAndEvents />
          <NextDeparturesPanel />
          <SustainabilityBanner />
          <Footer />
        </div>
      </div>
    </div>
  )
}
