import { Tag, ArrowRight, X } from 'lucide-react'
import { useState } from 'react'

// Real UK station retailers. Plain text only, no logos, this is descriptive
// content (like any travel app listing real shops), not brand artwork.
const deals = [
  { shop: 'Greggs', pct: '50%' },
  { shop: 'Pret A Manger', pct: '60%' },
  { shop: 'Marks & Spencer', pct: '40%' },
  { shop: 'Black Sheep Coffee', pct: '50%' },
  { shop: "Puccino's", pct: '45%' },
  { shop: 'Knoops', pct: '40%' },
]

export default function TopPromoBar() {
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  // Duplicated so the scroll loops seamlessly.
  const track = [...deals, ...deals]

  return (
    <div className="bg-blue-900 text-white text-sm py-2.5 flex items-center gap-3 overflow-hidden">
      {/* min-w-0 is the important part here: without it, a flex child is never
          allowed to shrink below its content size, so the wide scrolling
          track underneath would force this whole bar (and the page) wider
          than the screen on mobile. This is what broke last time. */}
      <div className="flex-1 min-w-0 overflow-hidden pl-4">
        <div className="flex gap-8 marquee-track w-max whitespace-nowrap">
          {track.map((deal, i) => (
            <span key={i} className="flex items-center gap-2 shrink-0">
              <Tag size={14} className="shrink-0" />
              <span className="font-semibold">{deal.pct} Off at {deal.shop}</span>
              <span className="text-white/70">, grab &amp; go</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 pr-4">
        <button className="bg-white/15 hover:bg-white/25 transition-colors rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1 whitespace-nowrap">
          Get Deal <ArrowRight size={12} />
        </button>
        <button onClick={() => setVisible(false)} aria-label="Dismiss banner" className="text-white/70 hover:text-white">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
