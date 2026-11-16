import { useEffect, useState } from 'react'
import BrandLogo from './BrandLogo'

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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-blue-700 transition-opacity duration-500 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <BrandLogo className="h-auto w-36 sm:w-44" />
      <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">StationLive</p>

      <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-red-600 transition-[width] duration-150 ease-linear motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-xs tracking-wide text-white/60">Loading {progress}%</p>
    </div>
  )
}
