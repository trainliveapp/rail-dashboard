import { BadgeCheck, ShieldCheck, TicketCheck, Siren, ShieldAlert, TicketX, Clock3 } from 'lucide-react'

const categoryIcons = {
  delays: Clock3,
  police: BadgeCheck,
  safety: ShieldCheck,
  revenue: TicketCheck,
  antisocial: Siren,
  harassment_violence: ShieldAlert,
  fare_dodgers: TicketX,
}

export default function StationReportIcon({ category, size = 18, className = '' }) {
  const Icon = categoryIcons[category] || ShieldAlert
  return <Icon size={size} className={className} aria-hidden="true" />
}
