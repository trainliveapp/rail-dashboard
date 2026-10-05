import { useLocation, Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'

export default function CheckEmailPage() {
  const location = useLocation()
  const email = location.state?.email || 'your email address'
  const isPasswordReset = location.state?.type === 'reset'

  return (
    <AuthLayout cardWidth="max-w-[520px]">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Check your email</h1>
      <p className="text-slate-500 mb-6">
        {isPasswordReset ? "We've sent a password reset link to" : "We've sent a confirmation link to"} <span className="font-medium text-slate-700">{email}</span>.
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

    </AuthLayout>
  )
}
