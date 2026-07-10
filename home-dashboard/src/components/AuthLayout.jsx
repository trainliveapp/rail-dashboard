import authBg from '../assets/auth-bg.png'
import logo from '../assets/logo.png'

export default function AuthLayout({ children, cardWidth = 'max-w-[560px]' }) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden py-10 px-4">
      <img src={authBg} alt="" className="absolute inset-0 w-full h-full object-cover blur-sm scale-105" />
      <div className="absolute inset-0 bg-slate-900/55" />

      <img src={logo} alt="TrainLive" className="absolute top-6 left-6 h-9 w-auto z-10" />

      <div className={`relative z-10 w-full ${cardWidth}`}>
        <div className="bg-slate-50 rounded-3xl shadow-2xl px-8 sm:px-10 py-10">
          {children}
        </div>
        <p className="text-center text-xs text-slate-200 mt-5">
          By continuing you agree to our <a href="#" className="underline text-slate-100">Terms</a> and <a href="#" className="underline text-slate-100">Privacy Policy.</a>
        </p>
      </div>
    </div>
  )
}
