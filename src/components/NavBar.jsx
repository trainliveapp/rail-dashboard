import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Sun, Moon } from 'lucide-react'
import logo from '../assets/logoy.png'
import { useAuth } from '../lib/AuthContext'

export default function NavBar({ mapTheme = 'dark', onMapThemeChange = null }) {
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
    <div className="relative bg-brand-ink border-b border-brand-ink text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="TrainLive" className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 p-1" role="group" aria-label="Map theme">
            <button
              type="button"
              aria-label="Light map"
              aria-pressed={mapTheme === 'light'}
              title="Light map"
              onClick={() => onMapThemeChange?.('light')}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${mapTheme === 'light' ? 'bg-brand-amber text-brand-ink' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
            >
              <Sun size={16} />
            </button>
            <button
              type="button"
              aria-label="Dark map"
              aria-pressed={mapTheme === 'dark'}
              title="Dark map"
              onClick={() => onMapThemeChange?.('dark')}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${mapTheme === 'dark' ? 'bg-brand-amber text-brand-ink' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
            >
              <Moon size={16} />
            </button>
          </div>
          {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((o) => !o)}
              className="w-9 h-9 rounded-full bg-brand-amber hover:bg-yellow-300 transition-colors text-brand-ink text-sm font-semibold flex items-center justify-center"
            >
              {initial}
            </button>
            {accountOpen && (
              <>
                <button aria-label="Close account menu" onClick={() => setAccountOpen(false)} className="fixed inset-0 z-40 cursor-default" />
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 text-slate-700">
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
          ) : null}
        </div>

      </div>

    </div>
  )
}