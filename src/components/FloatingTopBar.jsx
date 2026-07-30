import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, Map, Search, CalendarDays, Bell, HelpCircle } from 'lucide-react'
import logo from '../assets/logo.png'

const navItems = [
  { label: 'Live Map', icon: Map, href: '/' },
  { label: 'Journey Planner', icon: Search },
  { label: 'Calendar Sync', icon: CalendarDays },
  { label: 'Alerts & Reports', icon: Bell, href: '/alerts' },
  { divider: true },
  { label: 'Settings', icon: HelpCircle },
  { label: 'Help', icon: HelpCircle },
]

export default function FloatingTopBar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="absolute top-3 left-3 right-3 z-[1100] flex items-center justify-between">
      <div className="relative flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full shadow-lg pl-2 pr-4 py-2">
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((o) => !o)}
          className="w-10 h-10 flex items-center justify-center text-slate-600 rounded-full active:bg-slate-100 shrink-0"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <img src={logo} alt="TrainLive" className="h-8 w-auto" />

        {menuOpen && (
          <>
            <button
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
              {navItems.map((item, idx) => {
                if (item.divider) return <hr key={idx} className="my-1.5 border-slate-100" />
                const ItemIcon = item.icon
                if (item.href) {
                  return (
                    <Link
                      key={item.label}
                      to={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 active:bg-slate-50"
                    >
                      <ItemIcon size={18} className="text-slate-500" />
                      {item.label}
                    </Link>
                  )
                }
                return (
                  <div key={item.label} className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-slate-300 cursor-not-allowed">
                    <span className="flex items-center gap-3">
                      <ItemIcon size={18} />
                      {item.label}
                    </span>
                    <span className="text-[10px] font-semibold tracking-wide bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">SOON</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <Link to="/signin" className="bg-blue-700 hover:bg-blue-800 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg shrink-0">
        Sign in
      </Link>
    </div>
  )
}
