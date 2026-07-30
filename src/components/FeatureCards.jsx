import { useState } from 'react'
import { Wallet, ShoppingBag, Calendar, Wrench, Users, MessageSquare, ChevronDown, ArrowRight } from 'lucide-react'
import { featureCards } from '../data/mockData'
import delayRepayIcon from '../assets/icon-delay-repay.png'
import engineeringWorksIcon from '../assets/icon-engineering-works.png'
import liveChatIcon from '../assets/icon-live-chat.png'

const icons = { Wallet, ShoppingBag, Calendar, Wrench, Users, MessageSquare }

// Real artwork for the cards that have it so far. Anything not listed here
// still falls back to its lucide icon below, once Grab & Go, Events, and
// User Locator get their own images, add them here the same way.
const images = {
  'delay-repay': delayRepayIcon,
  'engineering-works': engineeringWorksIcon,
  'live-chat': liveChatIcon,
}

export default function FeatureCards() {
  // Each row opens and closes independently, so checking one thing
  // doesn't collapse whatever else was already open.
  const [openTitle, setOpenTitle] = useState(null)

  const toggle = (title) => setOpenTitle((prev) => (prev === title ? null : title))

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {featureCards.map((card, i) => {
        const Icon = icons[card.icon]
        const customImage = card.image && images[card.image]
        const isOpen = openTitle === card.title
        return (
          <div key={card.title} className={i > 0 ? 'border-t border-slate-100' : ''}>
            <button
              onClick={() => toggle(card.title)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left active:bg-slate-50"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg overflow-hidden border border-slate-100">
                  {customImage ? (
                    <img src={customImage} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Icon size={18} className={card.iconColor} />
                  )}
                </span>
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
                <div className="px-4 pb-4 pl-[60px]">
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
