import { ChevronLeft, ChevronRight, Clock3, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import communityImage from '../assets/backgroundimg.png'
import pretImage from '../assets/splash-promo.jpg'

const slides = [
  {
    image: communityImage,
    eyebrow: 'LIVE COMMUNITY',
    title: 'See what passengers are reporting.',
    description: 'Real-time updates about your trains and stations.',
    notification: 'Train to Birmingham',
    notificationText: 'A passenger update was just posted',
    notificationTime: '6 mins ago',
    icon: Users,
    overlay: 'from-slate-950/90 via-slate-950/25 to-transparent',
  },
  {
    image: pretImage,
    eyebrow: 'TRAVEL BETTER',
    title: 'Make every journey a little easier.',
    description: 'Grab a coffee or something good to go before you board.',
    notification: 'Station offers',
    notificationText: 'Fresh picks near your route',
    notificationTime: 'Today',
    icon: Clock3,
    overlay: 'from-[#4b0d1c]/90 via-[#4b0d1c]/20 to-transparent',
  },
]

export default function AdSlot({ size = 'leaderboard', className = '' }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [paused, setPaused] = useState(false)
  const slide = slides[activeSlide]
  const Icon = slide.icon

  useEffect(() => {
    if (paused) return undefined

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length)
    }, 5500)

    return () => window.clearInterval(timer)
  }, [paused])

  const showSlide = (index) => setActiveSlide((index + slides.length) % slides.length)

  return (
    <aside
      aria-label="Advertising"
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm ${size === 'rail' ? 'min-h-[250px] lg:min-h-[280px]' : 'min-h-[220px] sm:min-h-[260px]'} ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0" aria-live="polite">
        <img
          key={slide.image}
          src={slide.image}
          alt=""
          className="h-full w-full object-cover transition-opacity duration-500"
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${slide.overlay}`} />
      </div>

      <div className="relative flex min-h-[220px] flex-col justify-between p-5 text-white sm:min-h-[260px] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.24em] text-white/70">{slide.eyebrow}</p>
            <h2 className="mt-2 max-w-[21rem] text-2xl font-extrabold leading-[1.05] sm:text-3xl">{slide.title}</h2>
            <p className="mt-2 max-w-[22rem] text-sm text-white/85 sm:text-base">{slide.description}</p>
          </div>

          <div className="hidden items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700 shadow-sm sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Live
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex max-w-[280px] items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 text-slate-800 shadow-lg sm:max-w-[310px] sm:px-4 sm:py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold sm:text-sm">{slide.notification}</p>
              <p className="truncate text-[11px] text-slate-500">{slide.notificationText}</p>
            </div>
            <span className="ml-auto shrink-0 text-[10px] text-slate-400">{slide.notificationTime}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Previous advertisement"
              onClick={() => showSlide(activeSlide - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/65"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next advertisement"
              onClick={() => showSlide(activeSlide + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/65"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5" role="tablist" aria-label="Advertisement slides">
        {slides.map((item, index) => (
          <button
            key={item.eyebrow}
            type="button"
            role="tab"
            aria-label={`Show advertisement ${index + 1}`}
            aria-selected={activeSlide === index}
            onClick={() => showSlide(index)}
            className={`h-1.5 rounded-full transition-all ${activeSlide === index ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'}`}
          />
        ))}
      </div>

      <p className="absolute right-3 top-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">Advertisement</p>
    </aside>
  )
}
