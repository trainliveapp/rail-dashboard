export default function AdSlot({ size = 'leaderboard', className = '' }) {
  const dimensions = size === 'rail' ? 'min-h-[250px] lg:min-h-[280px]' : 'min-h-[90px]'

  return (
    <aside
      aria-label="Advertising"
      className={`flex ${dimensions} w-full items-center justify-center border border-dashed border-slate-300 bg-white px-4 py-5 ${className}`}
    >
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Advertisement</p>
        <div className="mt-3 h-px w-32 bg-slate-100" />
      </div>
    </aside>
  )
}
