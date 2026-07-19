import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Map, Search, CalendarDays, Bell, HelpCircle, Flag, LogOut } from 'lucide-react'
import { lines } from '../data/mockData'
import logo from '../assets/logo.png'
import ReportIssueModal from './ReportIssueModal'
import { useAuth } from '../lib/AuthContext'

const navItems = [
  { label: 'Live Map', icon: Map, href: '/' },
  { label: 'Journey Planner', icon: Search },
  { label: 'Calendar Sync', icon: CalendarDays },
  { label: 'Alerts & Reports', icon: Bell, href: '/alerts' },
  { divider: true },
  { label: 'Settings', icon: HelpCircle },
  { label: 'Help', icon: HelpCircle },
]

const lineFilterColors = {
  Central: 'text-red-600',
  Victoria: 'text-blue-600',
  Northern: 'text-slate-800',
  Elizabeth: 'text-violet-600',
}

export default function NavBar({ activeLines, onToggleLine }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const firstName = user?.user_metadata?.first_name
  const initial = (firstName?.[0] || user?.email?.[0] || '?').toUpperCase()

  const handleSignOut = async () => {
    setAccountOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <div className="relative bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
            className="w-10 h-10 flex items-center justify-center text-slate-600 rounded-lg active:bg-slate-50 -ml-1"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <img src={logo} alt="TrainLive" className="h-8 w-auto" />
        </div>
        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((o) => !o)}
              className="w-9 h-9 rounded-full bg-blue-700 hover:bg-blue-800 transition-colors text-white text-sm font-semibold flex items-center justify-center"
            >
              {initial}
            </button>
            {accountOpen && (
              <>
                <button aria-label="Close account menu" onClick={() => setAccountOpen(false)} className="fixed inset-0 z-40 cursor-default" />
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                  {firstName && (
                    <div className="px-4 py-2 text-sm text-slate-400 border-b border-slate-100 mb-1">
                      Signed in as <span className="text-slate-700 font-medium">{firstName}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <LogOut size={16} className="text-slate-500" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link to="/signin" className="bg-blue-700 hover:bg-blue-800 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-full">
            Sign in
          </Link>
        )}

        {menuOpen && (
          <>
            <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 cursor-default" />
            <div className="absolute top-full left-3 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
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

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
        <span className="bg-slate-50 text-xs text-slate-600 px-3 py-1.5 rounded-full flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Updated 2s ago
        </span>
        {lines.map((line) => (
          <button
            key={line.name}
            onClick={() => onToggleLine(line.name)}
            className={`bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 border shrink-0 ${activeLines.includes(line.name) ? 'border-slate-300' : 'border-slate-100'}`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: line.color }} />
            <span className={lineFilterColors[line.name]}>{line.name}</span>
          </button>
        ))}
        <button
          onClick={() => setReportOpen(true)}
          className="bg-red-600 hover:bg-red-700 transition-colors text-white text-xs font-semibold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shrink-0"
        >
          <Flag size={12} /> Report Issue
        </button>
      </div>

      {reportOpen && <ReportIssueModal onClose={() => setReportOpen(false)} />}
    </div>
  )
}