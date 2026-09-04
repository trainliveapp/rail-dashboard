import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import logo from '../assets/logo.png'
import { useAuth } from '../lib/AuthContext'

export default function NavBar() {
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
        ) : null}

      </div>

    </div>
  )
}