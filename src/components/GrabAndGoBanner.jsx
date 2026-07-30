import { Croissant, Sandwich, ShoppingBag, Coffee, Milk, Cookie, ArrowRight } from 'lucide-react'

// Real UK station retailers, the kind of shops you'd actually walk past on a
// platform. No logos are reproduced here, just plain text and generic icons,
// since recreating brand marks would be a different (and unnecessary) thing
// to get right. Swap or reorder freely once there's a real partnerships list.
const shops = [
  { name: 'Greggs', deal: 'Up to 50% off', icon: Croissant, color: 'bg-blue-50 text-blue-700' },
  { name: 'Pret A Manger', deal: 'Up to 60% off', icon: Sandwich, color: 'bg-red-50 text-red-700' },
  { name: "Marks & Spencer", deal: 'Up to 40% off', icon: ShoppingBag, color: 'bg-emerald-50 text-emerald-700' },
  { name: 'Black Sheep Coffee', deal: 'Up to 50% off', icon: Coffee, color: 'bg-neutral-100 text-neutral-700' },
  { name: "Puccino's", deal: 'Up to 45% off', icon: Coffee, color: 'bg-amber-50 text-amber-700' },
  { name: 'Knoops', deal: 'Up to 40% off', icon: Milk, color: 'bg-orange-50 text-orange-700' },
  { name: 'WHSmith', deal: 'Up to 30% off', icon: Cookie, color: 'bg-sky-50 text-sky-700' },
]

function ShopChip({ shop }) {
  const Icon = shop.icon
  return (
    <div className="shrink-0 flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm w-64">
      <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${shop.color}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{shop.name}</p>
        <p className="text-xs text-emerald-600 font-medium">{shop.deal}</p>
      </div>
    </div>
  )
}

export default function GrabAndGoBanner() {
  // Duplicated once so the scroll can loop seamlessly from the end back to the start.
  const track = [...shops, ...shops]

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Grab & Go</h2>
          <p className="text-sm text-slate-500">Surplus food and coffee near your stations, at a discount, before it goes to waste.</p>
        </div>
        <a href="#" className="text-sm font-medium text-blue-600 flex items-center gap-1 shrink-0">
          Explore retail <ArrowRight size={14} />
        </a>
      </div>

      <div className="relative mt-4 -mx-5">
        {/* Fades at each edge so the loop point doesn't look like a hard cut */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent z-10" />

        <div className="flex gap-3 marquee-track w-max px-5">
          {track.map((shop, i) => (
            <ShopChip key={`${shop.name}-${i}`} shop={shop} />
          ))}
        </div>
      </div>
    </section>
  )
}
