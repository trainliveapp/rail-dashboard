import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Moon } from 'lucide-react'
import BrandLogo from './BrandLogo'
import { useAuth } from '../lib/AuthContext'
import lightModeIcon from '../assets/08_light_mode.svg'

export default function NavBar({ mapTheme = 'dark', onMapThemeChange = null }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const firstName = user?.user_metadata?.first_name?.trim()
  const lastName = user?.user_metadata?.last_name?.trim()
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || user?.email || 'Account'
  const initial = displayName[0].toUpperCase()

  const handleSignOut = async () => {
    setAccountOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <div className="relative z-[1200] bg-blue-700 border-b border-blue-800 text-white">
      <div className="flex min-w-0 items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <BrandLogo className="h-auto w-24 shrink-0 object-left min-[380px]:w-[120px]" />
          <span className="translate-y-1 whitespace-nowrap text-xl font-semibold min-[380px]:text-2xl">StationLive</span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/15 bg-white/10 p-1" role="group" aria-label="Map theme">
            <button
              type="button"
              aria-label="Light map"
              aria-pressed={mapTheme === 'light'}
              title="Light map"
              onClick={() => onMapThemeChange?.('light')}
              className={`flex h-[34px] w-7 items-center justify-center rounded-md transition-colors ${mapTheme === 'light' ? 'bg-yellow-400 text-brand-ink' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
            >
              <img src={lightModeIcon} alt="" aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Dark map"
              aria-pressed={mapTheme === 'dark'}
              title="Dark map"
              onClick={() => onMapThemeChange?.('dark')}
              className={`flex h-[34px] w-7 items-center justify-center rounded-md transition-colors ${mapTheme === 'dark' ? 'bg-yellow-400 text-brand-ink' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
            >
              <Moon size={16} />
            </button>
          </div>
          {user ? (
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setAccountOpen((o) => !o)}
              aria-label={`Open profile for ${displayName}`}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white transition-colors hover:bg-brand-primary-dark"
            >
              {initial}
            </button>
            {accountOpen && (
              <>
                <button aria-label="Close account menu" onClick={() => setAccountOpen(false)} className="fixed inset-0 z-40 cursor-default" />
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 text-slate-700">
                  <div className="mb-1 border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
                    <p className="truncate text-xs text-slate-400">{user.email}</p>
                  </div>
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
