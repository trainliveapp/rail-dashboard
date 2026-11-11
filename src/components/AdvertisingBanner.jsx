import { ArrowUpRight } from 'lucide-react'

export default function AdvertisingBanner({ onOpen }) {
  return <div className="advertising-banner-wrap"><button type="button" className="advertising-banner" onClick={onOpen} aria-haspopup="dialog" aria-label="Reach travellers. Advertise with StationLive: open advertising enquiry">
    <span><strong>Reach travellers</strong><span>Advertise with StationLive</span></span>
    <ArrowUpRight size={18} aria-hidden="true" />
  </button></div>
}
