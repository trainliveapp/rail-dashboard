import { BellRing, Megaphone, ShieldCheck, Sparkles } from 'lucide-react'
import { images } from '../data/optimizedImages'
import SmoothImage from './SmoothImage'
import { useState } from 'react'
import AdvertisingBanner from './AdvertisingBanner'
import AdvertisingEnquiryDialog from './AdvertisingEnquiryDialog'
import './FeatureCards.css'

function ConversationsIcon(props) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 12c5 0 9 3.5 9 8a7.6 7.6 0 0 1-2 5l1 5-5-3a11 11 0 0 1-8-2" />
    <path d="M13 3C7 3 2 7 2 12a8 8 0 0 0 3 6l-1 6 6-4 3 .3c6 0 11-3.8 11-9S19 3 13 3Z" />
    <path d="M8 12h.1M13 12h.1M18 12h.1M23 20h.1" strokeWidth="2.8" />
  </svg>
}

function RouteUpdatesIcon(props) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M7 29c5-6 18-3 18-7 0-3-11-1-11-5 0-3 8-3 11-4" />
    <path d="M12 20c0 4-5 9-5 9s-5-5-5-9a5 5 0 0 1 10 0Z" />
    <path d="M30 7c0 4-5 9-5 9s-5-5-5-9a5 5 0 0 1 10 0Z" />
    <circle cx="7" cy="20" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="25" cy="7" r="1.5" fill="currentColor" stroke="none" />
  </svg>
}

const features = [
  { icon: Megaphone, color: '#ff001b', label: 'Real passenger reports' },
  { icon: ConversationsIcon, color: '#008cff', label: 'Live conversations' },
  { icon: RouteUpdatesIcon, color: '#a600f0', label: 'Route updates' },
  { icon: Sparkles, color: '#00c52b', label: 'AI insights with Flavio' },
  { icon: BellRing, color: '#ff9400', label: 'Event & weather alerts' },
  { icon: ShieldCheck, color: '#ff001b', label: 'A safer community' },
]

export default function FeatureCards() {
  const [advertisingOpen, setAdvertisingOpen] = useState(false)
  return (
    <section className="flavio-banner" aria-label="StationLive community">
      <AdvertisingBanner onOpen={() => setAdvertisingOpen(true)} />
      {advertisingOpen && <AdvertisingEnquiryDialog onClose={() => setAdvertisingOpen(false)} />}

      <div className="flavio-footer">
        <ul className="flavio-feature-list" aria-label="The StationLive community">
          {features.map(({ icon: Icon, color, label }) => <li key={label}><Icon style={{ color }} aria-hidden="true" strokeWidth={2} /><span>{label}</span></li>)}
        </ul>
        <p className="flavio-handwritten flavio-footer-note">Built by commuters.<br />Powered by commuters.</p>
        <div className="flavio-train-wrap"><SmoothImage {...images.featureTrain} sizes="(max-width: 767px) 50vw, 400px" alt="Illustration of a red and white commuter train" className="flavio-train" /></div>
      </div>
    </section>
  )
}
