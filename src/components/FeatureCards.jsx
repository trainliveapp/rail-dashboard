import { ArrowUpRight, CalendarDays, ChartNoAxesColumnIncreasing, MessageSquare, Route, ShieldCheck, Users } from 'lucide-react'
import { images } from '../data/optimizedImages'
import SmoothImage from './SmoothImage'
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
  return (
    <section className="flavio-banner" aria-label="StationLive community">
      <div className="flex min-h-60 w-full items-center justify-center bg-white px-4 py-8 sm:min-h-80 sm:px-6">
        <aside aria-label="Advertise with StationLive" className="flex w-full max-w-4xl items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 text-[#07336b] sm:px-8 sm:py-6">
          <div className="min-w-0">
            <p className="text-[clamp(1.5rem,5vw,2.5rem)] font-extrabold leading-tight">Reach travellers</p>
            <p className="mt-1 text-[clamp(1rem,3.5vw,1.75rem)] font-semibold leading-snug">Advertise with StationLive</p>
          </div>
          <ArrowUpRight aria-hidden="true" className="h-8 w-8 shrink-0 sm:h-12 sm:w-12" strokeWidth={2.2} />
        </aside>
      </div>

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
