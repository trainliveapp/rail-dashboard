import { useEffect, useRef } from 'react'

// Only the handle owns gestures; the rest of the sheet keeps native scrolling.
export default function useBottomSheet({ panelRef, onClose, dirty, busy, discardMessage }) {
  const gesture = useRef(null)
  const timer = useRef(null)
  const closing = useRef(false)
  useEffect(() => () => clearTimeout(timer.current), [])
  const mobile = () => window.matchMedia('(max-width: 767px)').matches
  function move(distance, animate = true) {
    const panel = panelRef.current
    if (!panel) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    panel.style.transition = animate && !reduced ? 'translate 220ms ease' : 'none'
    panel.style.translate = `0 ${distance}px`
  }
  function requestClose() {
    if (closing.current) return
    if (busy) { move(0); return }
    if (dirty && !window.confirm(discardMessage)) { move(0); return }
    if (!mobile()) { onClose(); return }
    closing.current = true
    move(window.innerHeight + panelRef.current.offsetHeight)
    timer.current = setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220)
  }
  function finish(event, cancel = false) {
    const drag = gesture.current
    if (!drag?.active || drag.id !== event.pointerId) return
    drag.active = false
    drag.moved ||= cancel || Math.abs(event.clientY - drag.y) > 5
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const distance = Math.max(0, event.clientY - drag.y)
    const velocity = distance / Math.max(1, performance.now() - drag.time)
    if (!cancel && (distance >= 120 || (distance > 45 && velocity > 0.7))) requestClose()
    else move(0)
  }
  return { requestClose, handleProps: {
    onPointerDown(event) {
      if (!mobile() || !event.isPrimary || event.button !== 0 || closing.current) return
      gesture.current = { id: event.pointerId, y: event.clientY, time: performance.now(), active: true, moved: false }
      event.currentTarget.setPointerCapture(event.pointerId)
      move(0, false)
    },
    onPointerMove(event) {
      const drag = gesture.current
      if (!drag?.active || drag.id !== event.pointerId) return
      drag.moved ||= Math.abs(event.clientY - drag.y) > 5
      move(Math.max(0, event.clientY - drag.y), false)
    },
    onPointerUp: finish,
    onPointerCancel: event => finish(event, true),
    onLostPointerCapture: event => finish(event, true),
    onClick(event) {
      if (event.detail === 0 || !gesture.current?.moved) requestClose()
      gesture.current = null
    },
  } }
}
