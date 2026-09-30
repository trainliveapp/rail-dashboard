// import { useState } from 'react'
// import { useNavigate, Link } from 'react-router-dom'
// import { Mail, Apple, AlertCircle } from 'lucide-react'
// import AuthLayout from '../components/AuthLayout'
// import PasswordField from '../components/PasswordField'
// import { supabase } from '../lib/supabaseClient'

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

// export default function SignInPage() {
//   const navigate = useNavigate()
//   const [form, setForm] = useState({ email: '', password: '', keepSignedIn: false })
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState('')

//   const update = (field) => (e) =>
//     setForm((prev) => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

//   const handleSubmit = async (e) => {
//     e.preventDefault()
//     setError('')
//     setLoading(true)

//     const { error: signInError } = await supabase.auth.signInWithPassword({
//       email: form.email.trim(),
//       password: form.password,
//     })

//     setLoading(false)

//     if (signInError) {
//       const msg = signInError.message.toLowerCase()
//       if (msg.includes('invalid login credentials')) {
//         setError("That email and password combination doesn't match an account.")
//       } else if (msg.includes('email not confirmed')) {
//         setError('Please confirm your email address first, check your inbox for the link we sent.')
//       } else {
//         setError(signInError.message)
//       }
//       return
//     }

//     navigate('/')
//   }

//   return (
//     <AuthLayout cardWidth="max-w-[520px]">
//       <form onSubmit={handleSubmit}>
//         <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h1>
//         <p className="text-slate-500 mb-6">Sign in to pick up your journey where you left off.</p>

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

//         <div className="mb-4">
//           <label className="text-sm font-medium text-slate-800 mb-1.5 block">Email</label>
//           <div className="relative">
//             <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
//             <input type="email" required value={form.email} onChange={update('email')} placeholder="Enter your Professional Email" className="w-full bg-white border border-slate-200 rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-blue-400" />
//           </div>
//         </div>

//         <PasswordField
//           label="Password"
//           value={form.password}
//           onChange={update('password')}
//           placeholder="Password"
//           rightSlot={<Link to="/forgot-password" className="text-sm text-slate-500 hover:text-blue-600">Forgot?</Link>}
//         />

//         <label className="flex items-center gap-2 mt-4 mb-6 text-sm text-slate-600 cursor-pointer">
//           <input type="checkbox" checked={form.keepSignedIn} onChange={update('keepSignedIn')} className="rounded border-slate-300" />
//           Keep me signed in on this device
//         </label>

//         <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-white font-medium py-3.5 rounded-full">
//           {loading ? 'Signing in…' : 'Sign in'}
//         </button>

//         <p className="text-center text-sm text-slate-500 mt-5">
//           New here? <Link to="/signup" className="text-blue-600 font-medium">Create an account</Link>
//         </p>
//       </form>
//     </AuthLayout>
//   )
// }

import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Bell,
  CalendarDays,
  Star,
  Globe,
  ChevronDown,
} from 'lucide-react'
import backgroundImage from '../assets/backgroundimg.png'

/* =========================================================
   RESPONSIVE LOGO
========================================================= */

function LiveLogo({ light = false, className = '' }) {
  const color = light
    ? 'border-white text-white'
    : 'border-[#17233f] text-[#17233f]'

  const dot = light ? 'bg-white' : 'bg-[#17233f]'

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative flex items-center">
        <div
          className={`
            flex items-center justify-center rounded-2xl border-[3px]
            h-10 w-10
            sm:h-11 sm:w-11
            lg:h-[clamp(2.25rem,5.5vh,2.9rem)]
            lg:w-[clamp(2.25rem,5.5vh,2.9rem)]
            ${color}
          `}
        >
          <div className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        </div>

        <div className="absolute -right-1.5 -top-1 h-3.5 w-3.5 rounded-full bg-red-500" />
      </div>

      <div
        className={`
          flex items-center rounded-full border-[3px]
          px-3 py-0.5
          sm:px-3.5
          ${color}
        `}
      >
        <span
          className="
            text-lg font-bold tracking-tight
            sm:text-xl
            lg:text-[clamp(1.1rem,3vh,1.5rem)]
          "
        >
          LIVE
        </span>
      </div>
    </div>
  )
}

/* =========================================================
   GOOGLE ICON
========================================================= */

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />

      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"
      />

      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z"
      />

      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  )
}

/* =========================================================
   FEATURES
========================================================= */

const FEATURES = [
  {
    icon: Bell,
    lines: ['Get real-time', 'alerts'],
  },
  {
    icon: CalendarDays,
    lines: ['Plan ahead'],
  },
  {
    icon: Star,
    lines: ['Keep tabs on', 'your stations'],
  },
]

/* =========================================================
   INPUT STYLE
========================================================= */

const inputClass = `
  w-full
  border-0
  border-b
  border-slate-300
  bg-transparent
  pl-9
  pr-3
  text-base
  text-slate-900
  outline-none
  transition
  placeholder:text-slate-400
  focus:border-[#17233f]
  py-3
  sm:py-3.5
  lg:py-[clamp(0.55rem,1.8vh,0.85rem)]
`

/* =========================================================
   SIGN IN PAGE
========================================================= */

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const update = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log(form)

    // Supabase sign-in will go here
  }

  return (
    <main
      className="
        flex
        min-h-dvh
        w-full
        flex-col
        overflow-x-hidden
        bg-white

        lg:h-dvh
        lg:flex-row
        lg:overflow-hidden
      "
    >
      {/* =====================================================
          MOBILE / TABLET HERO
      ===================================================== */}

      <header
        className="
          relative
          h-[200px]
          shrink-0
          overflow-hidden
          bg-slate-800

          xs:h-[220px]
          sm:h-[250px]
          md:h-[280px]

          lg:hidden
        "
      >
        {/* Background */}
        <div
          className="
            absolute
            inset-0
            bg-cover
            bg-[center_30%]
          "
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/20" />

        {/* Content */}
        <div
          className="
            relative
            z-10
            flex
            h-full
            flex-col
            justify-between
            p-5
            pb-7

            sm:p-7
            sm:pb-9

            md:p-8
            md:pb-10
          "
        >
          <LiveLogo light />

          <h2
            className="
              max-w-[290px]
              text-[25px]
              font-extrabold
              leading-[1.08]
              tracking-tight
              text-white

              xs:max-w-[330px]

              sm:max-w-[420px]
              sm:text-4xl

              md:max-w-[520px]
              md:text-[40px]
            "
          >
            Know what's happening{' '}
            <span className="text-[#ffc400]">
              before you get there.
            </span>
          </h2>
        </div>
      </header>

      {/* =====================================================
          DESKTOP HERO
      ===================================================== */}

      <section
        className="
          relative
          hidden
          h-full
          w-[58%]
          shrink-0
          flex-col
          justify-between
          overflow-hidden
          bg-slate-800
          px-[3.5vw]
          py-[4vh]
          text-white

          lg:flex

          xl:w-[60%]
        "
      >
        {/* Background */}
        <div
          className="
            absolute
            inset-0
            bg-cover
            bg-center
          "
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        />

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />

        {/* Logo */}
        <div className="relative z-10">
          <LiveLogo light />
        </div>

        {/* Hero Content */}
        <div
          className="
            relative
            z-10
            flex
            flex-col
            gap-[4vh]
          "
        >
          <div className="max-w-[560px]">
            <h2
              className="
                text-[clamp(2rem,5.6vh,3.75rem)]
                font-extrabold
                leading-[1.05]
                tracking-tight
              "
            >
              Know what's
              <br />
              happening
              <br />

              <span className="text-[#ffc400]">
                before you
                <br />
                get there.
              </span>
            </h2>

            {/* Hidden on very short desktop screens */}
            <p
              className="
                mt-[2vh]
                text-[clamp(0.95rem,2.3vh,1.3rem)]
                text-white/90

                [@media(max-height:560px)]:hidden
              "
            >
              Live travel updates from the Aviso community.
            </p>
          </div>

          {/* Features */}
          <ul
            className="
              flex
              flex-wrap
              items-center
              gap-x-5
              gap-y-3
            "
          >
            {FEATURES.map(({ icon: Icon, lines }, i) => (
              <li
                key={lines[0]}
                className="flex items-center gap-5"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="
                      flex
                      h-[clamp(2.25rem,5.5vh,2.9rem)]
                      w-[clamp(2.25rem,5.5vh,2.9rem)]
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-white/15
                      backdrop-blur-sm
                    "
                  >
                    <Icon size={20} strokeWidth={1.8} />
                  </span>

                  <div className="text-[13px] leading-tight xl:text-sm">
                    <p className="font-medium">
                      {lines[0]}
                    </p>

                    {lines[1] && (
                      <p className="text-white/80">
                        {lines[1]}
                      </p>
                    )}
                  </div>
                </div>

                {i < FEATURES.length - 1 && (
                  <span className="hidden h-9 w-px bg-white/40 xl:block" />
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* =====================================================
          SIGN IN COLUMN
      ===================================================== */}

      <section
        className="
          relative
          z-10
          -mt-5
          flex
          flex-1
          flex-col
          rounded-t-[28px]
          bg-white

          px-5
          pb-[max(1rem,env(safe-area-inset-bottom))]
          pt-5

          sm:-mt-6
          sm:rounded-t-3xl
          sm:px-8
          sm:pt-6

          md:px-12

          lg:mt-0
          lg:h-full
          lg:min-w-0
          lg:rounded-none
          lg:px-8
          lg:py-[3vh]

          xl:px-14
        "
      >
        {/* ===================================================
            COUNTRY SELECTOR
        =================================================== */}

        <div className="flex justify-end">
          <button
            type="button"
            className="
              flex
              min-h-[40px]
              items-center
              gap-1.5
              text-sm
              font-medium
              text-slate-700
              transition
              hover:text-slate-900
            "
          >
            <Globe size={18} />

            <span>UK</span>

            <ChevronDown
              size={16}
              className="text-slate-500"
            />
          </button>
        </div>

        {/* ===================================================
            CENTRE CONTENT
        =================================================== */}

        <div
          className="
            mx-auto
            flex
            w-full
            max-w-[420px]
            flex-1
            flex-col
            justify-center

            py-5

            sm:py-6

            lg:min-h-0
            lg:py-0
          "
        >
          {/* Desktop Logo */}
          <div
            className="
              mb-7
              hidden

              lg:mb-[3.5vh]
              lg:block
            "
          >
            <LiveLogo />

            <p
              className="
                mt-2
                text-sm
                text-slate-500

                lg:mt-[1.2vh]
                lg:text-[clamp(0.8rem,1.9vh,0.95rem)]
              "
            >
              Live travel updates from the community
            </p>
          </div>

          {/* Heading */}
          <div
            className="
              mb-5

              lg:mb-[2.5vh]
            "
          >
            <h1
              className="
                text-[30px]
                font-bold
                tracking-tight
                text-[#101b38]

                sm:text-3xl

                lg:text-[clamp(1.6rem,4.4vh,2.5rem)]
              "
            >
              Sign in
            </h1>

            <p
              className="
                mt-1.5
                text-base
                text-slate-500

                lg:text-[clamp(0.9rem,2.1vh,1.1rem)]
              "
            >
              Join Aviso to stay informed.
            </p>
          </div>

          {/* =================================================
              FORM
          ================================================= */}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div
              className="
                relative
                mb-2

                lg:mb-[1vh]
              "
            >
              <label
                htmlFor="email"
                className="sr-only"
              >
                Email address
              </label>

              <Mail
                size={20}
                className="
                  pointer-events-none
                  absolute
                  left-0
                  top-1/2
                  -translate-y-1/2
                  text-slate-600
                "
              />

              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={update('email')}
                placeholder="Email address"
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div
              className="
                relative
                mb-6

                lg:mb-[3vh]
              "
            >
              <label
                htmlFor="password"
                className="sr-only"
              >
                Password
              </label>

              <Lock
                size={20}
                className="
                  pointer-events-none
                  absolute
                  left-0
                  top-1/2
                  -translate-y-1/2
                  text-slate-600
                "
              />

              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={form.password}
                onChange={update('password')}
                placeholder="Password"
                className={`${inputClass} pr-11`}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((s) => !s)
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                className="
                  absolute
                  right-0
                  top-1/2
                  -translate-y-1/2
                  rounded-md
                  p-2
                  text-slate-600
                  transition
                  hover:text-slate-900
                "
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>

            {/* Sign In */}
            <button
              type="submit"
              className="
                group
                mx-auto
                flex
                min-h-[44px]
                items-center
                justify-center
                gap-3
                border-b-2
                border-[#101b38]
                px-6
                py-2
                text-lg
                font-semibold
                text-[#101b38]
                transition
              "
            >
              <span>Sign in</span>

              <ArrowRight
                size={22}
                className="
                  transition-transform
                  group-hover:translate-x-1
                "
              />
            </button>

            {/* Divider */}
            <div
              className="
                my-5
                flex
                items-center
                gap-4

                sm:my-6

                lg:my-[3vh]
              "
            >
              <div className="h-px flex-1 bg-slate-200" />

              <span className="text-sm text-slate-400">
                or
              </span>

              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Google */}
            <button
              type="button"
              className="
                flex
                min-h-[52px]
                w-full
                items-center
                justify-center
                gap-3
                rounded-2xl
                border
                border-slate-300
                px-4
                py-3
                text-base
                font-medium
                text-[#101b38]
                transition
                hover:bg-slate-50

                lg:py-[clamp(0.6rem,1.9vh,0.95rem)]
              "
            >
              <GoogleIcon />

              <span>
                Continue with Google
              </span>
            </button>

            {/* Create account */}
            <p
              className="
                mt-5
                text-center
                text-sm
                text-slate-500

                lg:mt-[2.5vh]
              "
            >
              Don't have an account?

              <Link
                to="/signup"
                className="
                  ml-1
                  font-medium
                  text-blue-600
                  hover:underline
                "
              >
                Create account
              </Link>
            </p>
          </form>
        </div>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <div
          className="
            mx-auto
            flex
            w-full
            max-w-[420px]
            flex-col
            items-center
            justify-center
            gap-2
            pt-3
            text-xs
            text-slate-400

            xs:flex-row
            xs:justify-between

            sm:gap-4
          "
        >
          <div className="flex gap-4">
            <a
              href="/terms"
              className="transition hover:text-slate-600"
            >
              Terms
            </a>

            <a
              href="/privacy"
              className="transition hover:text-slate-600"
            >
              Privacy
            </a>

            <a
              href="/help"
              className="transition hover:text-slate-600"
            >
              Help
            </a>
          </div>

          <span>© 2026 Aviso</span>
        </div>
      </section>
    </main>
  )
}