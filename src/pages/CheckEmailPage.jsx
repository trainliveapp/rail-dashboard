import { useLocation, Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'

export default function CheckEmailPage() {
  const location = useLocation()
  const email = location.state?.email || 'your email address'

  return (
    <AuthLayout cardWidth="max-w-[520px]">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Check your email</h1>
      <p className="text-slate-500 mb-6">
        We've sent a password reset link to <span className="font-medium text-slate-700">{email}</span>. The link expires in 30 minutes.
      </p>

      <div className="flex items-start gap-3 bg-blue-50 rounded-xl px-4 py-3.5 mb-6">
        <Mail size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600">Didn't receive the email? Check your spam folder or try a different email address.</p>
      </div>

      <p className="text-center text-sm">
        <Link to="/signin" className="text-blue-600 font-medium inline-flex items-center gap-1.5">
          <ArrowLeft size={15} /> Back to sign in
        </Link>
      </p>

      {/* Demo-only shortcut: in production this page has no button forward, the person
          reaches the next step by clicking the real link emailed to them. This link
          exists purely so the reset-password screen can be reviewed without a live
          email/backend behind it yet. Remove this once real email sending is wired up. */}
      <p className="text-center text-xs text-slate-300 mt-6">
        <Link to="/reset-password" className="underline hover:text-slate-400">Demo only: continue to reset password →</Link>
      </p>
    </AuthLayout>
  )
}
