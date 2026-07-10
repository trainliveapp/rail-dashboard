import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordField({ label, value, onChange, placeholder, rightSlot }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-800">{label}</label>
        {rightSlot}
      </div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-200 rounded-full pl-4 pr-11 py-3 text-sm outline-none focus:border-blue-400"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  )
}
