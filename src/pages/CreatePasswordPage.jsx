import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import PasswordField from '../components/PasswordField'
import SuccessModal from '../components/SuccessModal'
import { supabase } from '../lib/supabaseClient'

export default function CreatePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const checkRecoverySession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!active) return

      if (sessionError) {
        setError(sessionError.message)
      } else if (data.session) {
        setHasRecoverySession(true)
      } else {
        setError('This password reset link is invalid or has expired. Please request a new one.')
      }
      setCheckingSession(false)
    }

    checkRecoverySession()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' && session) {
        setHasRecoverySession(true)
        setError('')
        setCheckingSession(false)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!hasRecoverySession) {
      setError('This password reset link is invalid or has expired. Please request a new one.')
      return
    }

    if (password.length < 8) {
      setError('Password needs to be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError("Those passwords don't match.")
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      setShowSuccess(true)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update your password right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout cardWidth="max-w-[520px]">
      <form onSubmit={handleSubmit}>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create a password</h1>
        <p className="text-slate-500 mb-6">Choose something secure at least 8 characters.</p>

        {error && <p role="alert" className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</p>}

        <div className="mb-2 space-y-4">
          <PasswordField label="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create Password" />
          <PasswordField label="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" />
        </div>
        <p className="text-xs text-slate-400 mb-6">Use a strong password with letters, numbers & symbols.</p>

        <button type="submit" disabled={checkingSession || loading || !hasRecoverySession} className="w-full bg-brand-primary hover:bg-brand-primary-dark disabled:bg-slate-300 transition-colors text-white font-medium py-3.5 rounded-full">
          {checkingSession ? 'Verifying link...' : loading ? 'Updating...' : 'Confirm'}
        </button>

        <p className="text-center text-sm mt-5">
          <Link to="/signin" className="text-blue-600 font-medium inline-flex items-center gap-1.5">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </p>
      </form>

      {showSuccess && <SuccessModal onClose={() => navigate('/signin')} />}
    </AuthLayout>
  )
}
