import { Check } from 'lucide-react'

export default function SuccessModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/30">
      <div className="bg-white rounded-3xl shadow-2xl px-8 py-10 max-w-[420px] w-full text-center">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-5">
          <Check size={30} className="text-white" strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Great!</h2>
        <p className="text-slate-500 mb-7">Your password is updated successfully. You can now access your account securely</p>
        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium py-3.5 rounded-full"
        >
          Okay
        </button>
      </div>
    </div>
  )
}
