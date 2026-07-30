import { useState } from 'react'
import { ChevronDown, ChevronUp, Calendar, Clock, Users, MapPin } from 'lucide-react'
import { disruptions, events } from '../data/mockData'

const levelStyles = {
  severe: { dot: 'bg-red-600', bg: 'bg-red-50', text: 'text-red-700' },
  minor: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  planned: { dot: 'bg-sky-500', bg: 'bg-sky-50', text: 'text-sky-700' },
}

function DisruptionItem({ item }) {
  const [open, setOpen] = useState(item.level === 'severe')
  const style = levelStyles[item.level]
  return (
    <div className={`rounded-lg ${style.bg} px-4 py-3`}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2">
        <span className={`flex items-center gap-2 text-sm font-medium ${style.text}`}>
          <span className={`w-2 h-2 rounded-full ${style.dot}`} /> {item.title}
        </span>
        {open ? <ChevronUp size={16} className={style.text} /> : <ChevronDown size={16} className={style.text} />}
      </button>
      {open && item.detail && (
        <div className="mt-2 pl-4">
          <p className="text-sm text-slate-600">{item.detail}</p>
          <p className="text-xs text-slate-400 mt-1">{item.updated}</p>
        </div>
      )}
    </div>
  )
}

export default function DisruptionsAndEvents() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900">Live disruptions & engineering</h3>
        <p className="text-sm text-slate-500 mb-4">Tap a line for details and advice.</p>
        <div className="space-y-3">
          {disruptions.map((d) => (
            <DisruptionItem key={d.title} item={d} />
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900">Events Near Your Saved Stations</h3>
        <p className="text-sm text-slate-500 mb-4">Plan ahead for busier services.</p>
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.name} className="flex gap-3">
              <span className={`w-1 rounded-full ${e.barColor}`} />
              <div className="flex-1 min-w-0 pb-3 border-b border-slate-50 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{e.name}</p>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${e.tagColor}`}>{e.tag}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Clock size={12} /> {e.time}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {e.date}</span>
                  <span className="flex items-center gap-1"><Users size={12} /> Attendance: {e.attendance}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {e.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
