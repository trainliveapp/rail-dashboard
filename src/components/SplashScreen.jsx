import { useEffect, useState } from 'react'
import officialLogo from '../../Avviso-1/JPG/Logo-1.jpg'

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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <img src={officialLogo} alt="Avviso" className="h-56 w-56 object-contain sm:h-72 sm:w-72" />

      <div className="mt-10 h-1 w-40 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-[#f9040a] transition-[width] duration-150 ease-linear motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-xs tracking-wide text-white/60">Loading {progress}%</p>
    </div>
  )
}