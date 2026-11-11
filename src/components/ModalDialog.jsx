import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Native modal dialogs handle focus trapping, nested modals and focus return.
export default function ModalDialog({ onClose, children, ...props }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])
  return createPortal(<dialog {...props} ref={ref} tabIndex={-1} onKeyDown={(event) => {
    if (event.key !== 'Tab') return
    event.stopPropagation()
    const dialog = ref.current
    const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length)
    const first = controls[0]
    const last = controls.at(-1)
    if (!first) { event.preventDefault(); dialog.focus(); return }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus() }
  }} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose() }} onClick={(event) => {
    event.stopPropagation()
    if (event.target !== ref.current) return
    const rect = ref.current.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
  }}>{children}</dialog>, document.body)
}
