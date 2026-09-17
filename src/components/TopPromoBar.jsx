import { AlertTriangle, ArrowRight, Megaphone, Users, Wrench, X } from 'lucide-react'
import { useState } from 'react'
import { liveFeed } from '../data/mockData'

const feedIcons = { AlertTriangle, Users, Wrench, Megaphone }

export default function TopPromoBar() {
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  const track = [...liveFeed, ...liveFeed]

  return (
    <div className="bg-yellow-400 text-brand-ink text-sm py-2.5 flex items-center gap-3 overflow-hidden">
      {/* min-w-0 is the important part here: without it, a flex child is never
          allowed to shrink below its content size, so the wide scrolling
          track underneath would force this whole bar (and the page) wider
          than the screen on mobile. This is what broke last time. */}
      <div className="flex-1 min-w-0 overflow-hidden pl-4">
        <div className="flex gap-8 marquee-track w-max whitespace-nowrap">
          {track.map((item, i) => {
            const Icon = feedIcons[item.icon] || AlertTriangle
            return (
            <span key={i} className="flex items-center gap-2 shrink-0">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-ink/10">
                <Icon size={12} />
              </span>
              <span className="font-semibold">{item.text}</span>
              <span className="text-brand-ink/60">{item.time}</span>
            </span>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 pr-4">
        <button className="bg-brand-ink text-white hover:bg-slate-800 transition-colors rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1 whitespace-nowrap">
          Trending <ArrowRight size={12} />
        </button>
        <button onClick={() => setVisible(false)} aria-label="Dismiss banner" className="text-brand-ink/70 hover:text-brand-ink">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
