import { useEffect, useRef } from 'react'

// Keep keyboard and assistive-technology navigation inside the open report.
export default function useReportDialog(onClose, { watchBack = false } = {}) {
  const panelRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const panel = panelRef.current
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.focus({ preventScroll: true })
    const onKeyDown = (event) => {
      if (event.defaultPrevented) return
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
      }
      if (event.key !== 'Tab') return
      const controls = [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
        .filter((element) => element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls.at(-1)
      if (!first) {
        event.preventDefault()
        panel.focus()
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    // Android Back can dismiss this custom dialog without navigating the page.
    // Re-arm after a close request because discarding may be cancelled.
    let watcher
    function watch() {
      if (!watchBack || !window.CloseWatcher) return
      watcher = new window.CloseWatcher()
      watcher.addEventListener('close', () => {
        watch()
        closeRef.current()
      })
    }
    watch()
    return () => {
      watcher?.destroy()
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [watchBack])
  return panelRef
}
