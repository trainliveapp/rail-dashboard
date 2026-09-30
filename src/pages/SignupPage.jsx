// import { useState } from 'react'
// import { useNavigate, Link } from 'react-router-dom'
// import { User, Mail, Apple, AlertCircle } from 'lucide-react'
// import AuthLayout from '../components/AuthLayout'
// import PasswordField from '../components/PasswordField'
// import { supabase } from '../lib/supabaseClient'
// import livePatternBg from '../assets/live-pattern-bg.png'

// function GoogleIcon() {
//   return (
//     <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
//       <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
//       <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
//       <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
//       <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
//     </svg>
//   )
// }

// export default function SignupPage() {
//   const navigate = useNavigate()
//   const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState('')

//   const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

//   const handleSubmit = async (e) => {
//     e.preventDefault()
//     setError('')

//     if (form.password.length < 8) {
//       setError('Password needs to be at least 8 characters.')
//       return
//     }
//     if (form.password !== form.confirmPassword) {
//       setError("Those passwords don't match.")
//       return
//     }

//     setLoading(true)

//     const { data, error: signUpError } = await supabase.auth.signUp({
//       email: form.email.trim(),
//       password: form.password,
//       options: {
//         data: {
//           first_name: form.firstName.trim(),
//           last_name: form.lastName.trim(),
//         },
//         emailRedirectTo: `${window.location.origin}${window.location.pathname}#/signin`,
//       },
//     })

//     setLoading(false)

//     if (signUpError) {
//       if (signUpError.message.toLowerCase().includes('already registered')) {
//         setError('An account with that email already exists. Try signing in instead.')
//       } else {
//         setError(signUpError.message)
//       }
//       return
//     }

//     if (data.session) {
//       navigate('/')
//       return
//     }

//     navigate('/check-email', { state: { email: form.email.trim(), type: 'signup' } })
//   }

//   return (
//     <AuthLayout backgroundImage={livePatternBg} blurBackground={false}>
//       <form onSubmit={handleSubmit}>
//         <h1 className="text-3xl font-bold text-slate-900 mb-2">Create your account</h1>
//         <p className="text-slate-500 mb-6">Save stations, get personalized alerts and claim delay repay in one tap.</p>

//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
//           <button type="button" disabled className="flex items-center justify-center gap-2 border border-slate-200 rounded-full py-3 text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed">
//             <GoogleIcon /> Sign in with Google
//           </button>
//           <button type="button" disabled className="flex items-center justify-center gap-2 border border-slate-200 rounded-full py-3 text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed">
//             <Apple size={18} /> Sign in with Apple
//           </button>
//         </div>

//         <div className="flex items-center gap-3 mb-5">
//           <span className="flex-1 h-px bg-slate-200" />
//           <span className="text-xs font-medium text-slate-400">or with Email</span>
//           <span className="flex-1 h-px bg-slate-200" />
//         </div>

//         {error && (
//           <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
//             <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
//             <p className="text-sm text-red-700">{error}</p>
//           </div>
//         )}

//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
//           <div>
//             <label className="text-sm font-medium text-slate-800 mb-1.5 block">First Name</label>
//             <div className="relative">
//               <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
//               <input required value={form.firstName} onChange={update('firstName')} placeholder="First Name" className="w-full bg-white border border-slate-200 rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-blue-400" />
//             </div>
//           </div>
//           <div>
//             <label className="text-sm font-medium text-slate-800 mb-1.5 block">Last Name</label>
//             <div className="relative">
//               <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
//               <input required value={form.lastName} onChange={update('lastName')} placeholder="Last Name" className="w-full bg-white border border-slate-200 rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-blue-400" />
//             </div>
//           </div>
//         </div>

//         <div className="mb-4">
//           <label className="text-sm font-medium text-slate-800 mb-1.5 block">Email</label>
//           <div className="relative">
//             <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
//             <input type="email" required value={form.email} onChange={update('email')} placeholder="Enter your Professional Email" className="w-full bg-white border border-slate-200 rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-blue-400" />
//           </div>
//         </div>

//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
//           <PasswordField label="Password" value={form.password} onChange={update('password')} placeholder="Password" />
//           <PasswordField label="Confirm Password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Confirm Password" />
//         </div>
//         <p className="text-xs text-slate-400 mb-6">Use a strong password with letters, numbers & symbols.</p>

//         <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-white font-medium py-3.5 rounded-full">
//           {loading ? 'Creating account…' : 'Create Account'}
//         </button>

//         <p className="text-center text-sm text-slate-500 mt-5">
//           Already have an account? <Link to="/signin" className="text-blue-600 font-medium">Sign in</Link>
//         </p>
//       </form>
//     </AuthLayout>
//   )
// }


import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Bell,
  CalendarDays,
  Star,
  Globe,
  ChevronDown,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import backgroundImage from '../assets/backgroundimg.png'

/* ---------- shared bits (same as SignInPage_v3) ---------- */

function LiveLogo({ light = false, className = '' }) {
  const color = light ? 'border-white text-white' : 'border-[#17233f] text-[#17233f]'
  const dot = light ? 'bg-white' : 'bg-[#17233f]'

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative flex items-center">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border-[3px] lg:h-[clamp(2.25rem,5.5vh,2.9rem)] lg:w-[clamp(2.25rem,5.5vh,2.9rem)] ${color}`}>
          <div className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        </div>
        <div className="absolute -right-1.5 -top-1 h-3.5 w-3.5 rounded-full bg-red-500" />
      </div>
      <div className={`flex items-center rounded-full border-[3px] px-3.5 py-0.5 ${color}`}>
        <span className="text-xl font-bold tracking-tight lg:text-[clamp(1.1rem,3vh,1.5rem)]">LIVE</span>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  )
}

const FEATURES = [
  { icon: Bell, lines: ['Get real-time', 'alerts'] },
  { icon: CalendarDays, lines: ['Plan ahead'] },
  { icon: Star, lines: ['Keep tabs on', 'your stations'] },
]

const inputClass =
  'w-full min-w-0 border-0 border-b border-slate-300 bg-transparent pl-9 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#17233f] py-2.5 sm:text-base lg:py-[clamp(0.45rem,1.5vh,0.8rem)]'

/* underline-style field with a left icon and optional show/hide toggle */
function Field({ id, icon: Icon, type = 'text', value, onChange, placeholder, autoComplete, isPassword = false }) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{placeholder}</label>
      <Icon size={20} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-slate-600" />
      <input
        id={id}
        type={isPassword ? (show ? 'text' : 'password') : type}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${inputClass} ${isPassword ? 'pr-11' : 'pr-3'}`}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-slate-900"
        >
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      )}
    </div>
  )
}

/* ---------- page ---------- */

export default function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Password needs to be at least 8 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError("Those passwords don't match.")
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
        },
        emailRedirectTo: `${window.location.origin}${window.location.pathname}#/signin`,
      },
    })

    setLoading(false)

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('already registered')) {
        setError('An account with that email already exists. Try signing in instead.')
      } else {
        setError(signUpError.message)
      }
      return
    }

    if (data.session) {
      navigate('/')
      return
    }

    navigate('/check-email', { state: { email: form.email.trim(), type: 'signup' } })
  }

  const handleGoogle = async () => {
    setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (oauthError) setError(oauthError.message)
  }

  return (
    <main className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-white lg:h-dvh lg:flex-row lg:overflow-hidden">

      {/* ============ MOBILE / TABLET BANNER ============ */}
      <header className="relative h-[clamp(160px,28dvh,240px)] min-h-[160px] shrink-0 overflow-hidden bg-slate-800 sm:h-[clamp(190px,30dvh,260px)] lg:hidden">
        <div className="absolute inset-0 bg-cover bg-[center_30%]" style={{ backgroundImage: `url(${backgroundImage})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/20" />
        <div className="relative z-10 flex h-full flex-col justify-between p-4 pb-7 sm:p-6 sm:pb-9 md:p-8 md:pb-10">
          <LiveLogo light />
          <h2 className="max-w-[290px] text-[clamp(1.5rem,5.5vw,2.25rem)] font-extrabold leading-[1.08] tracking-tight text-white sm:max-w-[420px]">
            Join the community <span className="text-[#ffc400]">and travel smarter.</span>
          </h2>
        </div>
      </header>

      {/* ============ DESKTOP HERO ============ */}
      <section className="relative hidden h-full min-h-0 w-[50%] shrink-0 flex-col justify-between overflow-hidden bg-slate-800 px-[clamp(1.5rem,3.5vw,4.5rem)] py-[clamp(1.5rem,4vh,3rem)] text-white lg:flex xl:w-[55%] 2xl:w-[58%]">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backgroundImage})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />

        <div className="relative z-10">
          <LiveLogo light />
        </div>

        <div className="relative z-10 flex flex-col gap-[4vh]">
          <div className="max-w-[560px]">
            <h2 className="text-[clamp(2rem,5.2vh,3.75rem)] font-extrabold leading-[1.05] tracking-tight">
              Join the
              <br />
              community
              <br />
              <span className="text-[#ffc400]">
                and travel
                <br />
                smarter.
              </span>
            </h2>
            <p className="mt-[2vh] max-w-[34rem] text-[clamp(0.9rem,2.1vh,1.3rem)] text-white/90 [@media(max-height:560px)]:hidden">
              Save stations, get personalised alerts and claim Delay Repay in one tap.
            </p>
          </div>

          <ul className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {FEATURES.map(({ icon: Icon, lines }, i) => (
              <li key={lines[0]} className="flex items-center gap-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-[clamp(2.25rem,5.5vh,2.9rem)] w-[clamp(2.25rem,5.5vh,2.9rem)] shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <div className="text-[13px] leading-tight xl:text-sm">
                    <p className="font-medium">{lines[0]}</p>
                    {lines[1] && <p className="text-white/80">{lines[1]}</p>}
                  </div>
                </div>
                {i < FEATURES.length - 1 && <span className="hidden h-9 w-px bg-white/40 xl:block" />}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ FORM COLUMN ============ */}
      {/* lg:overflow-y-auto is a safety net: on an extremely short window the form scrolls inside its column instead of being cut off */}
      <section className="relative z-10 -mt-5 flex min-w-0 flex-1 flex-col rounded-t-3xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 sm:-mt-6 sm:px-8 md:px-10 lg:mt-0 lg:h-full lg:min-h-0 lg:min-w-0 lg:overflow-y-auto lg:rounded-none lg:px-[clamp(1.5rem,3vw,4rem)] lg:py-[clamp(1rem,2.5vh,2rem)]">

        <div className="flex justify-end">
          <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900">
            <Globe size={18} />
            UK
            <ChevronDown size={16} className="text-slate-500" />
          </button>
        </div>

        {/* my-auto centres the block, and lets the column scroll from the top if it ever overflows */}
        <div className="mx-auto my-auto w-full max-w-[460px] py-3 sm:py-4 lg:py-2">

          {/* desktop logo; hidden on short windows because the hero already has one */}
          <div className="mb-[2.5vh] hidden lg:block [@media(max-height:720px)]:!hidden">
            <LiveLogo />
          </div>

          <div className="mb-4 sm:mb-5 lg:mb-[2vh]">
            <h1 className="text-[clamp(1.75rem,7vw,2.25rem)] font-bold tracking-tight text-[#101b38] lg:text-[clamp(1.5rem,4vh,2.25rem)]">
              Create your account
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 sm:text-[15px] lg:text-[clamp(0.85rem,1.9vh,1rem)]">
              Join Aviso to stay informed.
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-3 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-1 lg:gap-[0.6vh]">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-1 lg:gap-x-6">
              <Field id="firstName" icon={User} value={form.firstName} onChange={update('firstName')} placeholder="First name" autoComplete="given-name" />
              <Field id="lastName" icon={User} value={form.lastName} onChange={update('lastName')} placeholder="Last name" autoComplete="family-name" />
            </div>

            <Field id="email" icon={Mail} type="email" value={form.email} onChange={update('email')} placeholder="Email address" autoComplete="email" />
            <Field id="password" icon={Lock} isPassword value={form.password} onChange={update('password')} placeholder="Password (8+ characters)" autoComplete="new-password" />
            <Field id="confirmPassword" icon={Lock} isPassword value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Confirm password" autoComplete="new-password" />

            <button
              type="submit"
              disabled={loading}
              className="group mx-auto mt-4 flex max-w-full items-center justify-center gap-2 border-b-2 border-[#101b38] px-4 py-2 text-base font-semibold text-[#101b38] disabled:opacity-50 sm:px-6 sm:text-lg lg:mt-[2.5vh]"
            >
              {loading ? (
                'Creating account…'
              ) : (
                <>
                  Create account
                  <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="my-4 flex items-center gap-4 lg:my-[2.5vh]">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-sm text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-300 px-3 py-3 text-sm font-medium text-[#101b38] transition hover:bg-slate-50 sm:gap-3 sm:text-base lg:min-h-0 lg:py-[clamp(0.55rem,1.7vh,0.9rem)]"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="mt-4 text-center text-sm text-slate-500 lg:mt-[2vh]">
            Already have an account?
            <Link to="/signin" className="ml-1 font-medium text-blue-600 hover:underline">Sign in</Link>
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-[460px] flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3 text-xs text-slate-400 sm:pt-2">
          <div className="flex gap-3 sm:gap-4">
            <Link to="/terms" className="hover:text-slate-600">Terms</Link>
            <Link to="/privacy" className="hover:text-slate-600">Privacy</Link>
            <Link to="/help" className="hover:text-slate-600">Help</Link>
          </div>
          <span>© 2026 Aviso</span>
        </div>
      </section>
    </main>
  )
}