import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Bell, Bike, MapPinned, ShoppingBag, Sparkles, TrainFront, X } from 'lucide-react'
import approvedArtwork from '../assets/flavio-approved-2962.jpg'
import FlavioLauncher from './FlavioLauncher'
import ModalDialog from './ModalDialog'
import FlavioCountdown from './FlavioCountdown'
import FlavioNotifyDialog from './FlavioNotifyDialog'
import './FlavioComingSoon.css'

const FEATURES = [
  { icon: MapPinned, title: 'Journeys', tone: 'blue' },
  { icon: TrainFront, title: 'Station Updates', tone: 'amber' },
  { icon: Bike, title: 'Greener Travel', tone: 'green' },
  { icon: ShoppingBag, title: 'Discoveries', tone: 'purple' },
]

export default function FlavioComingSoonSheet({ launcherTarget = null }) {
  const [open, setOpen] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const launcherRef = useRef(null)
  return <>
    {launcherTarget && createPortal(<FlavioLauncher buttonRef={launcherRef} onOpen={() => setOpen(true)} />, launcherTarget)}
    {open && <ModalDialog className="flavio-coming-soon" aria-labelledby="flavio-title" onClose={() => setOpen(false)}>
      <button type="button" className="dialog-close" aria-label="Close Flavio panel" onClick={() => setOpen(false)} autoFocus><X size={20} /></button>
      <div className="flavio-approved-layout">
        <div className="flavio-approved-art">
          <svg role="img" aria-label="Flavio with grey curls, headphones, hoodie, phone and two robotic forearms" viewBox="20 12 490 568">
            <defs><clipPath id="flavio-approved-character"><path d="M20 12H470V280H510V530H285Q185 530 185 585H20Z" /></clipPath></defs>
            <image clipPath="url(#flavio-approved-character)" href={approvedArtwork} width="1536" height="786" />
          </svg>
        </div>
        <div className="flavio-approved-copy">
          <div className="flavio-heading"><h2 id="flavio-title">Flavio</h2><Sparkles aria-hidden="true" className="flavio-gold-stars" /><span className="flavio-soon-badge">Coming Soon</span></div>
          <p className="flavio-tagline">Your AI Travel Companion</p>
          <ul className="flavio-approved-features">
            {FEATURES.map(({ icon: Icon, title, tone }) => <li key={title}><Icon className={`feature-tone-${tone}`} aria-hidden="true" /><span>{title}</span></li>)}
          </ul>
        </div>
      </div>
      <FlavioCountdown />
      <button type="button" className="flavio-notify-cta" onClick={() => setNotifyOpen(true)}><Bell size={22} aria-hidden="true" /><span>Notify me when Flavio launches</span><ArrowRight size={20} aria-hidden="true" /></button>
      {notifyOpen && <FlavioNotifyDialog onClose={() => setNotifyOpen(false)} />}
    </ModalDialog>}
  </>
}
