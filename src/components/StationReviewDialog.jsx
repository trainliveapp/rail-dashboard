import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Star, X } from 'lucide-react'
import StationRatingForm from './StationRatingForm'
import { getStationReviews, subscribeToStationReviews } from '../lib/stationRatings'

export default function StationReviewDialog({ stationId, stationName, initialView = 'rating', onClose }) {
  const [view, setView] = useState(initialView)
  const [reviews, setReviews] = useState([])
  const [status, setStatus] = useState('loading')
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const panelRef = useRef(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key !== 'Tab') return
      const controls = [...panelRef.current.querySelectorAll('button:not(:disabled), textarea, input, [tabindex="0"]')]
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault(); last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [onClose])

  useEffect(() => {
    if (view !== 'reviews') return
    const refresh = () => setRevision((n) => n + 1)
    const unsubscribe = subscribeToStationReviews(stationId, refresh)
    const timer = setInterval(refresh, 30000)
    return () => { unsubscribe(); clearInterval(timer) }
  }, [stationId, view])

  useEffect(() => {
    if (view !== 'reviews') return
    let cancelled = false
    setStatus('loading')
    getStationReviews(stationId, page).then((rows) => {
      if (!cancelled) { setReviews(rows); setStatus('ready') }
    }).catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [stationId, page, revision, view])

  return createPortal(
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/50 p-4" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose() }} onPointerDown={(event) => event.stopPropagation()}>
      <section ref={panelRef} role="dialog" aria-modal="true" aria-label={`${view === 'rating' ? 'Write a review' : 'Station reviews'}: ${stationName}`} tabIndex={-1} className="relative max-h-[calc(100dvh-2rem)] w-[min(27.5rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-white shadow-2xl outline-none">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="font-bold text-slate-900">{view === 'rating' ? 'Write a review' : 'Station reviews'}</h2>
          <button type="button" onClick={onClose} aria-label="Close station reviews" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </div>
        {view === 'rating' ? <StationRatingForm stationId={stationId} stationName={stationName} onCancel={onClose} onSubmitted={() => { setPage(0); setRevision((n) => n + 1); setView('reviews') }} /> : <div className="p-4">
          <button type="button" onClick={onClose} className="mb-3 flex items-center gap-1 text-xs font-semibold text-slate-500"><ArrowLeft size={14} /> Back to station</button>
          <h3 className="mb-3 text-base font-bold text-slate-900">Reviews for {stationName}</h3>
          {status === 'loading' ? <p role="status" className="text-sm text-slate-500">Loading reviews…</p> : status === 'error' ? <div role="alert" className="text-sm text-slate-600"><p>Reviews could not be loaded.</p><button type="button" onClick={() => setRevision((n) => n + 1)} className="mt-2 font-semibold text-blue-700">Try again</button></div> : reviews.length === 0 ? <p className="text-sm text-slate-500">{page === 0 ? 'No reviews yet. Be the first to share your experience.' : 'No more reviews. Return to the previous page.'}</p> : <div className="max-h-[45dvh] space-y-3 overflow-y-auto">
            {reviews.map((review) => <article key={review.id} className="border-b border-slate-100 pb-3 last:border-0">
              <div className="mb-1 flex items-center gap-1">
                {review.overall_rating != null && <Star size={13} className="fill-amber-400 text-amber-400" />}
                <span className="text-xs font-semibold text-slate-700">{review.overall_rating != null ? `${Number(review.overall_rating).toFixed(1)}/5` : 'Passenger review'}</span>
                <time dateTime={review.created_at} className="ml-auto text-[10px] text-slate-400">{new Date(review.created_at).toLocaleDateString('en-GB')}</time>
              </div>
              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{review.review_text || 'This passenger left a star rating.'}</p>
            </article>)}
          </div>}
          {(page > 0 || reviews.length === 20) && <div className="mt-3 flex items-center justify-between text-xs"><button type="button" disabled={page === 0 || status === 'loading'} onClick={() => setPage((n) => n - 1)} className="font-semibold text-blue-700 disabled:text-slate-300">Previous</button><span>Page {page + 1}</span><button type="button" disabled={reviews.length < 20 || status === 'loading'} onClick={() => setPage((n) => n + 1)} className="font-semibold text-blue-700 disabled:text-slate-300">Next</button></div>}
          <button type="button" onClick={() => setView('rating')} className="mt-3 w-full rounded-lg bg-yellow-400 py-2 text-xs font-semibold text-slate-950">Write a review</button>
        </div>}
      </section>
    </div>, document.body
  )
}
