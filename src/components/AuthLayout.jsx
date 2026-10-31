import { images } from '../data/optimizedImages'
import SmoothImage from './SmoothImage'
import BrandLogo from './BrandLogo'

export default function AuthLayout({ children, cardWidth = 'max-w-[560px]', backgroundImage, blurBackground = true }) {
  const background = backgroundImage ? { src: backgroundImage } : images.authFallback

  return (
    <div className="relative min-h-dvh w-full flex items-center justify-center overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-24 px-4 sm:py-24">
      <SmoothImage
        {...background}
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        alt=""
        className={`absolute inset-0 w-full h-full object-cover ${blurBackground ? 'blur-sm scale-105' : ''}`}
      />
      <div className={`absolute inset-0 ${blurBackground ? 'bg-slate-900/55' : 'bg-slate-900/45'}`} />

      <BrandLogo className="absolute left-6 top-6 z-10 h-7 max-w-[125px]" />

      <div className={`relative z-10 w-full ${cardWidth}`}>
        <div className="min-w-0 break-words bg-slate-50 rounded-3xl shadow-2xl px-5 sm:px-10 py-6 sm:py-10">
          {children}
        </div>
        <p className="text-center text-xs text-slate-200 mt-5">
          By continuing you agree to our <a href="#" className="underline text-slate-100">Terms</a> and <a href="#" className="underline text-slate-100">Privacy Policy.</a>
        </p>
      </div>
    </div>
  )
}
