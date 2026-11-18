import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ALL_UPDATES } from '../lib/liveTicker'

export default function LiveTickerPreferences({ preference, metadata, onApply, onClose }) {
  const dialog = useRef(null)
  const [draft, setDraft] = useState(preference)
  const [search, setSearch] = useState('')
  useEffect(() => {
    const previous = document.activeElement
    dialog.current.showModal()
    return () => { previous?.focus() }
  }, [])
  const options = draft.mode === 'all' ? [] : metadata[draft.mode].filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
  function toggle(id) {
    setDraft(current => ({ ...current, ids: current.ids.includes(id) ? current.ids.filter(value => value !== id) : current.ids.length < 3 ? [...current.ids, id] : current.ids }))
  }
  return createPortal(<dialog ref={dialog} onCancel={onClose} aria-labelledby="live-preferences-title" className="live-preferences">
    <div className="flex items-center justify-between gap-4"><h2 id="live-preferences-title" className="text-lg font-bold">Personalise LIVE updates</h2><button type="button" onClick={onClose} className="min-h-11 px-2">Close</button></div>
    <fieldset className="mt-3"><legend className="font-semibold">Show updates for</legend><div className="mt-2 flex flex-wrap gap-3">{[['all', 'All updates'], ['lines', 'Railway lines'], ['stations', 'Stations']].map(([mode, label]) => <label key={mode} className="flex min-h-11 items-center gap-2"><input type="radio" name="live-mode" checked={draft.mode === mode} onChange={() => { setDraft({ mode, ids: [] }); setSearch('') }} />{label}</label>)}</div></fieldset>
    {draft.mode !== 'all' && <>
      <p className="my-2" aria-live="polite">{draft.ids.length} of 3 selected</p>
      <label className="block">Search {draft.mode}<input className="mt-1 w-full rounded border border-slate-400 p-2" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <div className="my-3 max-h-[35vh] overflow-y-auto">{options.map(item => <label key={item.id} className="flex min-h-11 items-center gap-3 border-b border-slate-100 py-2"><input type="checkbox" checked={draft.ids.includes(item.id)} disabled={!draft.ids.includes(item.id) && draft.ids.length >= 3} onChange={() => toggle(item.id)} />{item.name}</label>)}{!options.length && <p>No matching {draft.mode}.</p>}</div>
    </>}
    <p className="my-3 text-sm text-slate-600">TfL notices and updates without a reliable location stay visible in every mode.</p>
    <div className="flex justify-between gap-3"><button type="button" className="min-h-11 px-3 underline" onClick={() => { setDraft(ALL_UPDATES); setSearch('') }}>Reset to All updates</button><button type="button" disabled={draft.mode !== 'all' && !draft.ids.length} className="min-h-11 rounded bg-slate-900 px-5 text-white disabled:opacity-40" onClick={() => onApply(draft)}>Apply</button></div>
  </dialog>, document.body)
}
