import { useNavigate } from 'react-router-dom'

export default function WelcomeScreen({ onDismiss }) {
  const navigate = useNavigate()

  const go = (path) => {
    onDismiss()
    navigate(path)
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between px-6 pt-16 pb-8"
      style={{ background: 'linear-gradient(180deg, #0B1638 0%, #0A1230 60%, #080D24 100%)' }}
    >
      <div className="flex-1 flex flex-col items-center justify-center">
        <svg width="220" height="220" viewBox="0 0 220 220" fill="none">
          <circle cx="110" cy="110" r="100" fill="#12245C" />
          <rect x="55" y="70" width="110" height="90" rx="28" fill="#1D6FE8" />
          <circle cx="85" cy="112" r="9" fill="white" />
          <circle cx="135" cy="112" r="9" fill="white" />
          <rect x="93" y="55" width="34" height="16" rx="6" fill="#1D6FE8" />
          <rect x="60" y="150" width="100" height="14" rx="7" fill="#123A8F" />
          <circle cx="168" cy="72" r="15" fill="#0EE869" />
          <path d="M162 72l4 4 8-8" stroke="#08361F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <h1 className="mt-8 text-2xl font-bold text-white text-center leading-snug">
          Live delays, before the board catches up
        </h1>
        <p className="mt-3 text-sm text-white/60 text-center max-w-[280px]">
          Real-time departures, community reports, and delay repay claims, all in one place.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button
          type="button"
          onClick={() => go('/signup')}
          className="w-full bg-blue-600 hover:bg-blue-500 transition-colors text-white font-semibold py-3.5 rounded-full"
        >
          Get started
        </button>
        <button
          type="button"
          onClick={() => go('/signin')}
          className="w-full bg-white/10 hover:bg-white/15 transition-colors text-white font-medium py-3.5 rounded-full"
        >
          Log in
        </button>
        <p className="text-center text-xs text-white/40 pt-1">
          By continuing you agree to TrainLive's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}