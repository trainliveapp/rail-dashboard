import { useState } from 'react'
import { Wallet, ShoppingBag, Calendar, Wrench, Users, MessageSquare, ChevronDown, ArrowRight } from 'lucide-react'
import { featureCards } from '../data/mockData'

const icons = { Wallet, ShoppingBag, Calendar, Wrench, Users, MessageSquare }

export default function FeatureCards() {
  // Each row opens and closes independently, so checking one thing
  // doesn't collapse whatever else was already open.
  const [openTitle, setOpenTitle] = useState(null)

  const toggle = (title) => setOpenTitle((prev) => (prev === title ? null : title))

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {featureCards.map((card, i) => {
        const Icon = icons[card.icon]
        const isOpen = openTitle === card.title
        return (
          <div key={card.title} className={i > 0 ? 'border-t border-slate-100' : ''}>
            <button
              onClick={() => toggle(card.title)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left active:bg-slate-50"
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon size={18} className={`shrink-0 ${card.iconColor}`} />
                <span className="font-medium text-slate-800 truncate">{card.title}</span>
              </span>
              <ChevronDown
                size={18}
                className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <div
              className="grid transition-all duration-200 ease-out"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 pl-[42px]">
                  <p className="text-sm text-slate-500 leading-relaxed mb-2">{card.description}</p>
                  <a href="#" className="text-sm font-medium text-blue-600 flex items-center gap-1 w-fit">
                    {card.linkText} <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
