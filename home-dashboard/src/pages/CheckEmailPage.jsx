import { useState } from 'react'
import { useLocation, Link, Navigate } from 'react-router-dom'
import { Mail, ArrowLeft, RotateCw } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { supabase } from '../lib/supabaseClient'

export default function CheckEmailPage() {
  const location = useLocation()
  const email = location.state?.email
  const type = location.state?.type || 'reset'
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)

  // This page only makes sense arriving from the sign up or forgot password
  // flow, where we pass the email along in navigation state. Landing here
  // directly (refresh, bookmark, typed URL) means we've lost that context,
  // so send people back rather than showing a broken "your email address".
  if (!email) {
    return <Navigate to="/signin" replace />
  }

  const isSignup = type === 'signup'

  const handleResend = async () => {
    setResending(true)
    if (isSignup) {
      await supabase.auth.resend({ type: 'signup', email })
    } else {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${window.location.pathname}#/reset-password`,
      })
    }
    setResending(false)
    setResent(true)
  }

  return (
    <AuthLayout cardWidth="max-w-[520px]">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Check your email</h1>
      <p className="text-slate-500 mb-6">
        {isSignup
          ? <>We've sent a confirmation link to <span className="font-medium text-slate-700">{email}</span>. Click it to activate your account.</>
          : <>We've sent a password reset link to <span className="font-medium text-slate-700">{email}</span>. The link expires in 30 minutes.</>}
      </p>

      <div className="flex items-start gap-3 bg-blue-50 rounded-xl px-4 py-3.5 mb-6">
        <Mail size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600">
          Didn't receive it? Check your spam folder, or{' '}
          <button type="button" onClick={handleResend} disabled={resending} className="text-blue-700 font-medium inline-flex items-center gap-1 underline disabled:opacity-50">
            <RotateCw size={12} className={resending ? 'animate-spin' : ''} />
            {resent ? 'sent again' : 'resend the email'}
          </button>.
        </p>
      </div>

      <p className="text-center text-sm">
        <Link to="/signin" className="text-blue-600 font-medium inline-flex items-center gap-1.5">
          <ArrowLeft size={15} /> Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
