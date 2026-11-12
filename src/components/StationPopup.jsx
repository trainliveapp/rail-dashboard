import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import StationReportSummary from './StationReportSummary'
import StationReviewDialog from './StationReviewDialog'

export default function StationPopup({ stationId, stationName, stationLines, mobile = false, onClose }) {
  const [reviewView, setReviewView] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [entered, setEntered] = useState(!mobile)
  const [closing, setClosing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const reviewDraft = useRef({ dirty: false, busy: false })
  const closeRef = useRef(null)
  const updateDraft = useCallback((state) => { reviewDraft.current = state }, [])
  const dragStart = useRef(null)
  const closeTimer = useRef(null)
  const closeReviews = useCallback(() => setReviewView(null), [])

  useEffect(() => {
    setReviewView(null)
    setExpanded(false)
    setDragOffset(0)
    setClosing(false)
    setDragging(false)
    reviewDraft.current = { dirty: false, busy: false }
    setEntered(!mobile)
  }, [stationId, mobile])

  useEffect(() => {
    if (!mobile) return undefined
    const frame = window.requestAnimationFrame(() => setEntered(true))
    const scrollY = window.scrollY
    const previousFocus = document.activeElement
    let watcher
    const watch = () => {
      if (!window.CloseWatcher) return
      watcher = new window.CloseWatcher()
      watcher.addEventListener('close', () => { watch(); closeRef.current?.() })
    }
    watch()
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); closeRef.current?.() }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      window.cancelAnimationFrame(frame)
      watcher?.destroy()
      document.removeEventListener('keydown', onKeyDown)
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
      document.body.style.overflow = previousBodyStyles.overflow
      document.body.style.position = previousBodyStyles.position
      document.body.style.top = previousBodyStyles.top
      document.body.style.width = previousBodyStyles.width
      window.scrollTo(0, scrollY)
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [mobile, stationId])

  const closeSheet = () => {
    if (!mobile || closing) return
    setDragging(false)
    setDragOffset(0)
    if (reviewDraft.current.busy) return
    if (reviewDraft.current.dirty && !window.confirm('Discard your unsent station review?')) return
    setClosing(true)
    closeTimer.current = window.setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220)
  }
  closeRef.current = closeSheet

  const handlePointerDown = (event) => {
    if (!mobile || closing || !event.isPrimary || event.button !== 0) return
    dragStart.current = { id: event.pointerId, y: event.clientY, time: performance.now(), moved: false, active: true }
    setDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (!dragStart.current?.active || dragStart.current.id !== event.pointerId) return
    const delta = event.clientY - dragStart.current.y
    dragStart.current.moved ||= Math.abs(delta) > 5
    setDragOffset(Math.max(0, delta))
  }

  const handlePointerUp = (event, cancelled = false) => {
    const drag = dragStart.current
    if (!drag?.active || drag.id !== event.pointerId) return
    drag.active = false
    const delta = event.clientY - drag.y
    drag.moved ||= cancelled || Math.abs(delta) > 5
    const velocity = Math.max(0, delta) / Math.max(1, performance.now() - drag.time)
    setDragging(false)
    if (!cancelled && (delta >= 120 || (delta > 45 && velocity > 0.7))) closeSheet()
    else if (!cancelled && delta < -55) setExpanded(true)
    setDragOffset(0)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  // Review controls replace the clicked button during the same event. Stop the
  // event here so Leaflet cannot mistake that detached target for a map click.
  const content = <div
    className={mobile ? `station-sheet${entered ? ' station-sheet--open' : ''}${expanded ? ' station-sheet--expanded' : ''}${closing ? ' station-sheet--closing' : ''}` : undefined}
    style={mobile ? { '--station-sheet-drag': `${dragOffset}px`, ...(dragging ? { transition: 'none' } : {}) } : undefined}
    onClick={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()}
    onPointerDown={(event) => event.stopPropagation()}
    onTouchStart={(event) => event.stopPropagation()}
    onWheel={(event) => event.stopPropagation()}
  >
    {mobile && <button type="button"
      className="station-sheet-handle"
      aria-label="Close station details"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={event => handlePointerUp(event, true)}
      onLostPointerCapture={event => handlePointerUp(event, true)}
      onClick={event => {
        if (event.detail === 0 || !dragStart.current?.moved) closeSheet()
        dragStart.current = null
      }}
    >
      <span aria-hidden="true" />
    </button>}
    <StationReportSummary
      station={{ id: stationId, name: stationName, lines: stationLines }}
      mobile={mobile}
      onRate={() => setReviewView('rating')}
      onViewReviews={() => setReviewView('reviews')}
      reviewView={reviewView}
      reviewContent={reviewView && <StationReviewDialog key={`${stationId}-${reviewView}`} stationId={stationId} stationName={stationName} initialView={reviewView} onClose={closeReviews} onDraftStateChange={mobile ? updateDraft : undefined} embedded />}
    />
  </div>

  return mobile ? createPortal(content, document.body) : content
}
