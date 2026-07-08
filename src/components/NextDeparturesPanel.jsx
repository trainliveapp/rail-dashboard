import { CreditCard } from 'lucide-react'

export default function NextDeparturesPanel() {
  return (
    <div className="bg-blue-900 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-white">
      <div className="flex items-start gap-4">
        <CreditCard size={22} className="text-blue-200 shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-lg mb-1">Delayed? Get money back.</h3>
          <p className="text-sm text-blue-100 leading-relaxed max-w-md">
            If your train was delayed by 15 minutes or more, you may be owed compensation. Check eligibility and claim Delay Repay in minutes.
          </p>
        </div>
      </div>
      <button className="bg-white text-blue-900 font-medium text-sm py-2.5 px-5 rounded-lg shrink-0 w-full sm:w-auto">
        Check eligibility →
      </button>
    </div>
  )
}
