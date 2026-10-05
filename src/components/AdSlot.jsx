import { ChevronRight, MessageCircle, ShieldAlert, TrainFront, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import liveBadge from '../assets/White Robot Live Badge with Red Record Dot.png'
import firstAdImage from '../assets/1ad.png'
import secondAdImage from '../assets/2ad.png'
import thirdAdImage from '../assets/3ad.png'
import fourthAdImage from '../assets/4ad.png'

const slides = [
  {
    image: firstAdImage,
    title: <>Know before you <span className="text-[#ffd21a]">go.</span></>,
    description: 'Live updates from real passengers at the stations you care about.',
    updates: [
      { icon: ShieldAlert, color: 'bg-red-500', title: 'Euston', text: 'Signalling problems being reported by passengers.', time: '5 mins ago' },
    ],
    icon: Users,
  },
  {
    image: secondAdImage,
    title: <>See what passengers <span className="text-[#ffd21a]">are reporting.</span></>,
    description: 'Real-time updates about your trains and stations.',
    updates: [
      { icon: Users, color: 'bg-red-500', title: 'Train to Birmingham', text: 'A man is staring at me on board and making me feel uncomfortable.', time: '6 mins ago' },
    ],
    icon: Users,
  },
  {
    image: thirdAdImage,
    title: <>Keep them safe <span className="text-[#ffd21a]">on their journey.</span></>,
    description: 'Check real-time reports and live chat updates on the stations and lines they use.',
    updates: [
      { icon: TrainFront, color: 'bg-blue-600', title: 'Chiltern Line', text: 'Trains running normally at the moment.', time: '2 mins ago' },
      { icon: TrainFront, color: 'bg-emerald-500', title: 'Live chat - Marylebone', text: 'Trains are busy but running on time. No issues reported so far.', time: '4 mins ago' },
      { icon: ShieldAlert, color: 'bg-red-500', title: 'Update from passengers', text: 'No security issues being reported on this line.', time: '6 mins ago' },
      { icon: MessageCircle, color: 'bg-blue-600', title: 'Live chat', text: 'My train has just departed and it’s quiet. Plenty of seats.', time: '7 mins ago' },
    ],
    icon: MessageCircle,
  },
  {
    image: fourthAdImage,
    title: <>Passengers helping <span className="text-[#ffd21a]">passengers.</span></>,
    description: 'Get updates, tips and alternative travel options from the Avviso community.',
    updates: [
      { icon: ShieldAlert, color: 'bg-red-500', title: 'Delays at Waterloo', text: 'Trains are currently delayed. No staff around here yet.', time: '12 mins ago' },
      { icon: Users, color: 'bg-blue-600', title: 'Try the Jubilee line instead.', text: 'It’s moving now.', time: '10 mins ago' },
      { icon: TrainFront, color: 'bg-emerald-500', title: 'Buses towards Victoria are running.', text: 'Takes about 25 mins.', time: '8 mins ago' },
    ],
    icon: Users,
  },
]

export default function AdSlot({ size = 'leaderboard', className = '' }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [paused, setPaused] = useState(false)
  const slide = slides[activeSlide]

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
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm ${size === 'rail' ? 'min-h-[300px] sm:min-h-[360px] lg:min-h-[420px]' : 'min-h-[340px] sm:min-h-[420px] lg:min-h-[500px]'} ${className}`}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/10" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-black/35 to-transparent" />
      </div>

      <div className="relative flex min-h-[340px] flex-col justify-between p-4 text-white sm:min-h-[420px] sm:p-7 lg:min-h-[500px]">
        <img src={liveBadge} alt="Avviso Live" className="h-auto w-36 mix-blend-screen sm:w-44" />

        <div className="absolute right-3 top-20 flex w-[min(52%,300px)] flex-col gap-2 sm:right-7 sm:top-24">
          {slide.updates.map(({ icon: UpdateIcon, color, title, text, time }) => (
            <div key={title} className="flex items-start gap-2 rounded-2xl bg-white/95 px-3 py-2 text-slate-900 shadow-lg backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-3">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${color}`}>
                <UpdateIcon size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight sm:text-sm">{title}</p>
                <p className="text-[11px] leading-tight sm:text-xs">{text}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{time}</p>
              </div>
              <ChevronRight size={18} className="ml-auto mt-1 shrink-0 text-slate-300" />
            </div>
          ))}
        </div>

        <div className="max-w-[58%] pb-5 sm:max-w-[62%]">
          <h2 className="text-3xl font-extrabold leading-[1.02] tracking-tight sm:text-4xl lg:text-5xl">{slide.title}</h2>
          <p className="mt-2 text-base leading-tight text-white sm:text-xl">{slide.description}</p>
        </div>
      </div>

      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5" role="tablist" aria-label="Advertisement slides">
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
