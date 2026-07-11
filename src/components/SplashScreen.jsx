import { useEffect, useState } from 'react'
import logo from '../assets/logo.png'

const LOAD_DURATION_MS = 2000

export default function SplashScreen({ fadingOut }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = performance.now()
    let frame

    const tick = (now) => {
      const elapsed = now - start
      const pct = Math.min(100, Math.round((elapsed / LOAD_DURATION_MS) * 100))
      setProgress(pct)
      if (elapsed < LOAD_DURATION_MS) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(180deg, #0B1638 0%, #0A1230 60%, #080D24 100%)' }}
    >
      <div className="bg-white rounded-3xl px-8 py-6 shadow-xl">
        <img src={logo} alt="TrainLive" className="w-36 sm:w-44 h-auto" />
      </div>

      <p className="mt-6 text-sm text-white/70 tracking-wide">Your live rail companion</p>

      <div className="mt-8 w-40 h-1 rounded-full bg-white/15 overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-[width] duration-150 ease-linear motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-xs tracking-wide text-white/50">Loading {progress}%</p>
    </div>
  )
}