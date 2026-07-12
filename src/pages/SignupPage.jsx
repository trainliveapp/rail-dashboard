import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Apple, AlertCircle } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import PasswordField from '../components/PasswordField'
import { supabase } from '../lib/supabaseClient'
import livePatternBg from '../assets/live-pattern-bg.png'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  )
}

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

  return (
    <AuthLayout backgroundImage={livePatternBg} blurBackground={false}>
      <form onSubmit={handleSubmit}>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create your account</h1>
        <p className="text-slate-500 mb-6">Save stations, get personalized alerts and claim delay repay in one tap.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <button type="button" disabled className="flex items-center justify-center gap-2 border border-slate-200 rounded-full py-3 text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed">
            <GoogleIcon /> Sign in with Google
          </button>
          <button type="button" disabled className="flex items-center justify-center gap-2 border border-slate-200 rounded-full py-3 text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed">
            <Apple size={18} /> Sign in with Apple
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <span className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">or with Email</span>
          <span className="flex-1 h-px bg-slate-200" />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-slate-800 mb-1.5 block">First Name</label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input required value={form.firstName} onChange={update('firstName')} placeholder="First Name" className="w-full bg-white border border-slate-200 rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800 mb-1.5 block">Last Name</label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input required value={form.lastName} onChange={update('lastName')} placeholder="Last Name" className="w-full bg-white border border-slate-200 rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-blue-400" />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-slate-800 mb-1.5 block">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="email" required value={form.email} onChange={update('email')} placeholder="Enter your Professional Email" className="w-full bg-white border border-slate-200 rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-blue-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
          <PasswordField label="Password" value={form.password} onChange={update('password')} placeholder="Password" />
          <PasswordField label="Confirm Password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Confirm Password" />
        </div>
        <p className="text-xs text-slate-400 mb-6">Use a strong password with letters, numbers & symbols.</p>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-white font-medium py-3.5 rounded-full">
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account? <Link to="/signin" className="text-blue-600 font-medium">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  )
}