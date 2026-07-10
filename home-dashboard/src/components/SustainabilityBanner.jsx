import { Leaf, ArrowRight } from 'lucide-react'

export default function SustainabilityBanner() {
  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
          <Leaf size={18} />
        </span>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Travel smarter. Travel greener.</p>
          <p className="text-xs text-slate-500">Choosing rail helps lower emissions and build a more sustainable network.</p>
        </div>
      </div>
      <a href="#" className="text-sm font-medium text-emerald-700 flex items-center gap-1 shrink-0">
        Learn more <ArrowRight size={14} />
      </a>
    </div>
  )
}
