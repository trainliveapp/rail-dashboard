// Leave one-finger swipes to the page. Leaflet-rotate handles intentional
// two-finger pan, pinch and rotation; mouse dragging stays available.
export function attachCooperativeMapGestures(map, { onInteraction, onHint = () => {} }) {
  const container = map.getContainer()
  let restoreDragging = false
  let touchOrigin = null
  let interacted = false
  let hinted = false
  let hintTimer
  const dismissHint = () => {
    clearTimeout(hintTimer)
    onHint(false)
  }
  const end = (event) => {
    if (event.touches.length || !restoreDragging) return
    map.dragging.enable()
    restoreDragging = false
  }
  const start = (event) => {
    if (event.target.closest?.('.leaflet-popup, .leaflet-control')) return
    if (map.dragging.enabled()) {
      restoreDragging = true
      map.dragging.disable()
    }
    if (event.touches.length > 1) {
      dismissHint()
      touchOrigin = Array.from(event.touches, t => [t.clientX, t.clientY])
      interacted = false
    } else if (!hinted) {
      hinted = true
      onHint(true)
      hintTimer = setTimeout(dismissHint, 3500)
    }
  }
  const move = (event) => {
    if (interacted || event.touches.length !== 2 || !touchOrigin) return
    if (Array.from(event.touches).some((t, i) => Math.hypot(t.clientX - touchOrigin[i][0], t.clientY - touchOrigin[i][1]) > 4)) {
      interacted = true
      onInteraction()
    }
  }
  const options = { capture: true, passive: true }
  container.classList.add('cooperative-map')
  container.addEventListener('touchstart', start, options)
  container.addEventListener('touchmove', move, options)
  container.addEventListener('touchend', end, options)
  container.addEventListener('touchcancel', end, options)
  return () => {
    clearTimeout(hintTimer)
    container.removeEventListener('touchstart', start, options)
    container.removeEventListener('touchmove', move, options)
    container.removeEventListener('touchend', end, options)
    container.removeEventListener('touchcancel', end, options)
    if (restoreDragging) map.dragging.enable()
    container.classList.remove('cooperative-map')
  }
}
