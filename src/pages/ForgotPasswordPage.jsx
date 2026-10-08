import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { supabase } from '../lib/supabaseClient'
import { getAppUrl } from '../lib/appUrl'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const redirectUrl = getAppUrl('reset-password')
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: redirectUrl },
      )

      if (resetError) {
        setError(resetError.message)
        return
      }

      navigate('/check-email', { state: { email: email.trim(), type: 'reset' } })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to send the reset email right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout cardWidth="max-w-[520px]">
      <form onSubmit={handleSubmit}>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Reset your password</h1>
        <p className="text-slate-500 mb-6">Enter the email tied to your account and we'll send a reset link.</p>

        {error && <p role="alert" className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</p>}

        <div className="mb-6">
          <label className="text-sm font-medium text-slate-800 mb-1.5 block">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your Professional Email"
              className="w-full bg-white border border-slate-200 rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-brand-primary hover:bg-brand-primary-dark disabled:bg-slate-300 transition-colors text-white font-medium py-3.5 rounded-full">
          {loading ? 'Sending...' : 'Send reset link'}
        </button>

        <p className="text-center text-sm mt-5">
          <Link to="/signin" className="text-blue-600 font-medium inline-flex items-center gap-1.5">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
