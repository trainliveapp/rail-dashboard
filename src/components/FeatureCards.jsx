import { CalendarDays, ChartNoAxesColumnIncreasing, MessageSquare, Route, ShieldCheck, Users } from 'lucide-react'
import { images } from '../data/optimizedImages'
import SmoothImage from './SmoothImage'
import { useState } from 'react'
import AdvertisingBanner from './AdvertisingBanner'
import AdvertisingEnquiryDialog from './AdvertisingEnquiryDialog'
import './FeatureCards.css'

const features = [
  { icon: Users, color: '#f50029', label: 'Real passenger reports' },
  { icon: MessageSquare, color: '#008cff', label: 'Live conversations' },
  { icon: Route, color: '#9e00e6', label: 'Route updates' },
  { icon: ChartNoAxesColumnIncreasing, color: '#00b78c', label: 'AI insights with Flavio' },
  { icon: CalendarDays, color: '#ff9400', label: 'Event & weather alerts' },
  { icon: ShieldCheck, color: '#f50029', label: 'A safer community' },
]

export default function FeatureCards() {
  const [advertisingOpen, setAdvertisingOpen] = useState(false)
  return (
    <section className="flavio-banner" aria-label="StationLive community">
      <AdvertisingBanner onOpen={() => setAdvertisingOpen(true)} />
      {advertisingOpen && <AdvertisingEnquiryDialog onClose={() => setAdvertisingOpen(false)} />}

      <div className="flavio-footer">
        <ul className="flavio-feature-list" aria-label="The StationLive community">
          {features.map(({ icon: Icon, color, label }) => <li key={label}><Icon style={{ color }} aria-hidden="true" strokeWidth={2.7} /><span>{label}</span></li>)}
        </ul>
        <p className="flavio-handwritten flavio-footer-note">Built by commuters.<br />Powered by commuters.</p>
        <div className="flavio-train-wrap"><SmoothImage {...images.featureTrain} sizes="(max-width: 767px) 50vw, 400px" alt="Illustration of a red and white commuter train" className="flavio-train" /></div>
      </div>
    </section>
  )
}
