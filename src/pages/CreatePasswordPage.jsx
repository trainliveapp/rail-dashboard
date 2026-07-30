import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import PasswordField from '../components/PasswordField'
import SuccessModal from '../components/SuccessModal'

export default function CreatePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Front-end only for now, this is where the "set new password" API call goes once the backend is ready.
    setShowSuccess(true)
  }

  return (
    <AuthLayout cardWidth="max-w-[520px]">
      <form onSubmit={handleSubmit}>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create a password</h1>
        <p className="text-slate-500 mb-6">Choose something secure at least 8 characters.</p>

        <div className="space-y-4 mb-2">
          <PasswordField label="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create Password" />
          <PasswordField label="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" />
        </div>
        <p className="text-xs text-slate-400 mb-6">Use a strong password with letters, numbers & symbols.</p>

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium py-3.5 rounded-full">
          Confirm
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
