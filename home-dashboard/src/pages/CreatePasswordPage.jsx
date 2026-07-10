import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import PasswordField from '../components/PasswordField'
import SuccessModal from '../components/SuccessModal'
import { supabase } from '../lib/supabaseClient'

export default function CreatePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 'checking' while we redeem the code from the emailed link, 'ready' once
  // we have a real recovery session, 'invalid' if the link is missing,
  // already used, or expired.
  const [linkStatus, setLinkStatus] = useState('checking')

  useEffect(() => {
    const exchange = async () => {
      // HashRouter keeps everything after # as the route, so the ?code=
      // from Supabase's PKCE redirect lands in the plain query string here,
      // ahead of the hash, unaffected by the router.
      const code = new URLSearchParams(window.location.search).get('code')

      if (!code) {
        // No code in the URL: check whether a recovery session already
        // exists (covers a page refresh after the code was already used).
        const { data } = await supabase.auth.getSession()
        setLinkStatus(data.session ? 'ready' : 'invalid')
        return
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      // Clean the code out of the URL either way, so a refresh doesn't try
      // to redeem an already-used code.
      window.history.replaceState({}, '', window.location.pathname + window.location.hash)

      setLinkStatus(exchangeError ? 'invalid' : 'ready')
    }

    exchange()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password needs to be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError("Those passwords don't match.")
      return
    }

    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setShowSuccess(true)
  }

  const handleSuccessClose = async () => {
    // Sign out of the recovery session so they land on a clean sign in
    // screen and log in fresh with the new password.
    await supabase.auth.signOut()
    navigate('/signin')
  }

  if (linkStatus === 'checking') {
    return (
      <AuthLayout cardWidth="max-w-[520px]">
        <p className="text-center text-slate-500 py-10">Verifying your link…</p>
      </AuthLayout>
    )
  }

  if (linkStatus === 'invalid') {
    return (
      <AuthLayout cardWidth="max-w-[520px]">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">This link's expired</h1>
        <p className="text-slate-500 mb-6">Password reset links are only valid for a little while, or may have already been used. Request a new one to continue.</p>
        <Link to="/forgot-password" className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium py-3.5 rounded-full inline-block text-center">
          Send a new link
        </Link>
        <p className="text-center text-sm mt-5">
          <Link to="/signin" className="text-blue-600 font-medium inline-flex items-center gap-1.5">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout cardWidth="max-w-[520px]">
      <form onSubmit={handleSubmit}>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create a password</h1>
        <p className="text-slate-500 mb-6">Choose something secure at least 8 characters.</p>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-4 mb-2">
          <PasswordField label="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create Password" />
          <PasswordField label="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" />
        </div>
        <p className="text-xs text-slate-400 mb-6">Use a strong password with letters, numbers & symbols.</p>

        <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-white font-medium py-3.5 rounded-full">
          {submitting ? 'Saving…' : 'Confirm'}
        </button>

        <p className="text-center text-sm mt-5">
          <Link to="/signin" className="text-blue-600 font-medium inline-flex items-center gap-1.5">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </p>
      </form>

      {showSuccess && <SuccessModal onClose={handleSuccessClose} />}
    </AuthLayout>
  )
}
