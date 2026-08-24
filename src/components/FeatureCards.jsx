import { Clock } from 'lucide-react'

export default function FeatureCards() {
  return (
    <section className="bg-white border border-slate-200 rounded-xl px-5 py-8 text-center">
      <Clock size={24} className="mx-auto mb-3 text-slate-400" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-slate-900">Features coming soon</h2>
      <p className="mt-1 text-sm text-slate-500">More helpful rail tools are on the way.</p>
    </section>
  )
}
