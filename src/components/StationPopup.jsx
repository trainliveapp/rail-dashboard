import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import StationReportSummary from './StationReportSummary'
import StationReviewDialog from './StationReviewDialog'

export default function StationPopup({ stationId, stationName, stationLines, mobile = false, onClose }) {
  const [reviewView, setReviewView] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [entered, setEntered] = useState(!mobile)
  const [closing, setClosing] = useState(false)
  const dragStart = useRef(null)
  const closeTimer = useRef(null)
  const closeReviews = useCallback(() => setReviewView(null), [])

  useEffect(() => {
    setReviewView(null)
    setExpanded(false)
    setDragOffset(0)
    setClosing(false)
    setEntered(!mobile)
  }, [stationId, mobile])

  useEffect(() => {
    if (!mobile) return undefined
    const frame = window.requestAnimationFrame(() => setEntered(true))
    const scrollY = window.scrollY
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
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
      document.body.style.overflow = previousBodyStyles.overflow
      document.body.style.position = previousBodyStyles.position
      document.body.style.top = previousBodyStyles.top
      document.body.style.width = previousBodyStyles.width
      window.scrollTo(0, scrollY)
    }
  }, [mobile, stationId])

  const closeSheet = () => {
    if (!mobile || closing) return
    setClosing(true)
    closeTimer.current = window.setTimeout(onClose, 300)
  }

  const handlePointerDown = (event) => {
    if (!mobile || closing) return
    dragStart.current = { y: event.clientY, offset: 0 }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (!dragStart.current) return
    const delta = event.clientY - dragStart.current.y
    setDragOffset(Math.max(-180, Math.min(180, delta)))
  }

  const handlePointerUp = (event) => {
    if (!dragStart.current) return
    const delta = event.clientY - dragStart.current.y
    if (delta < -55) setExpanded(true)
    if (delta > 55) {
      if (expanded) setExpanded(false)
      else closeSheet()
    }
    setDragOffset(0)
    dragStart.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  // Review controls replace the clicked button during the same event. Stop the
  // event here so Leaflet cannot mistake that detached target for a map click.
  const content = <div
    className={mobile ? `station-sheet${entered ? ' station-sheet--open' : ''}${expanded ? ' station-sheet--expanded' : ''}${closing ? ' station-sheet--closing' : ''}` : undefined}
    style={mobile ? { '--station-sheet-drag': `${dragOffset}px` } : undefined}
    onClick={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()}
    onPointerDown={(event) => event.stopPropagation()}
    onTouchStart={(event) => event.stopPropagation()}
    onWheel={(event) => event.stopPropagation()}
  >
    {mobile && <div
      className="station-sheet-handle"
      role="button"
      tabIndex={0}
      aria-label={expanded ? 'Collapse station details' : 'Expand station details'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setExpanded((value) => !value) }}
    >
      <span />
    </div>}
    {mobile && <button type="button" className="station-sheet-close" aria-label="Close station details" onClick={closeSheet}><X size={20} /></button>}
    <StationReportSummary
      station={{ id: stationId, name: stationName, lines: stationLines }}
      mobile={mobile}
      onRate={() => setReviewView('rating')}
      onViewReviews={() => setReviewView('reviews')}
      reviewView={reviewView}
      reviewContent={reviewView && <StationReviewDialog key={`${stationId}-${reviewView}`} stationId={stationId} stationName={stationName} initialView={reviewView} onClose={closeReviews} embedded />}
    />
  </div>

  return mobile ? createPortal(content, document.body) : content
}
