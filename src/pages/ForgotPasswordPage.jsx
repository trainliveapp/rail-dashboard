import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { supabase } from '../lib/supabaseClient'

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
      const redirectUrl = new URL(
        'reset-password',
        `${window.location.origin}${import.meta.env.BASE_URL}`,
      ).toString()
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

        {error && <p role="alert" className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

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

        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-white font-medium py-3.5 rounded-full">
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
