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
      style={{ background: 'linear-gradient(180deg, #EEF3FC 0%, #F6F8FD 60%, #FBFCFE 100%)' }}
    >
      <img
        src={logo}
        alt="TrainLive"
        className="w-40 sm:w-48 h-auto"
      />

      <div className="mt-10 w-40 h-1 rounded-full bg-blue-900/10 overflow-hidden">
        <div
          className="h-full bg-blue-700 rounded-full transition-[width] duration-150 ease-linear motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-xs tracking-wide text-blue-900/50">Loading {progress}%</p>
    </div>
  )
}