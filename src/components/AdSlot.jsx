import { useEffect, useRef, useState } from 'react'
import { images } from '../data/optimizedImages'
import { loadImage } from '../lib/imageLoading'
import ImageBackground from './ImageBackground'

const AD_SIZES = '(max-width: 960px) calc(100vw - 32px), 896px'

const slides = [images.ad1, images.ad2, images.ad3, images.ad4].map(image => ({ image }))

export default function AdSlot({ size = 'leaderboard', className = '' }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [paused, setPaused] = useState(false)
  const [nearViewport, setNearViewport] = useState(false)
  const containerRef = useRef(null)
  const slideRequest = useRef(0)
  const slide = slides[activeSlide]

  const showSlide = async (index) => {
    const next = (index + slides.length) % slides.length
    const request = ++slideRequest.current
    try {
      await loadImage(slides[next].image.src, { ...slides[next].image, sizes: AD_SIZES })
      if (request === slideRequest.current) setActiveSlide(next)
    } catch { /* Keep the current slide if the next image fails to load. */ }
  }

  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setNearViewport(true); return }
    const observer = new IntersectionObserver(([entry]) => setNearViewport(entry.isIntersecting), { rootMargin: '200px' })
    observer.observe(containerRef.current)
    return () => { observer.disconnect(); slideRequest.current += 1 }
  }, [])

  useEffect(() => {
    if (paused || !nearViewport) return undefined
    const timer = window.setInterval(() => {
      if (!document.hidden) void showSlide(activeSlide + 1)
    }, 5500)
    return () => window.clearInterval(timer)
  }, [paused, nearViewport, activeSlide])

  useEffect(() => {
    if (!nearViewport) return
    const next = slides[(activeSlide + 1) % slides.length].image
    loadImage(next.src, { ...next, sizes: AD_SIZES }).catch(() => {})
  }, [nearViewport, activeSlide])

  return (
    <aside
      ref={containerRef}
      aria-label="Advertising"
      className={`ad-slot relative h-[clamp(300px,62vw,500px)] overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm ${size === 'rail' ? 'h-[clamp(280px,48vw,420px)]' : ''} ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0" aria-live="polite">
        <ImageBackground {...slide.image} sizes={AD_SIZES} enabled={nearViewport} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/10" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-black/35 to-transparent" />
      </div>

      <div className="ad-content relative flex h-full flex-col justify-between p-4 text-white sm:p-7">
        <div className="relative aspect-[3.1] w-[clamp(150px,24vw,260px)] overflow-hidden">
          <img
            src={images.brandLogo.src}
            alt="Avviso Live"
            loading="lazy"
            decoding="async"
            className="absolute left-0 top-0 w-full max-w-none -translate-x-[15%] -translate-y-[35%]"
          />
        </div>
      </div>

      <div className="absolute bottom-1 left-1/2 z-10 flex -translate-x-1/2 items-center -space-x-2" role="tablist" aria-label="Advertisement slides">
        {slides.map((item, index) => (
          <button
            key={item.image.src}
            type="button"
            role="tab"
            aria-label={`Show advertisement ${index + 1}`}
            aria-selected={activeSlide === index}
            onClick={() => showSlide(index)}
            className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-white"
          >
            <span aria-hidden="true" className={`h-1.5 rounded-full transition-all ${activeSlide === index ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'}`} />
          </button>
        ))}
      </div>

    </aside>
  )
}
