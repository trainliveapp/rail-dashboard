// Leave one-finger swipes to the page. Leaflet-rotate handles intentional
// two-finger pan, pinch and rotation; mouse dragging stays available.
export function attachCooperativeMapGestures(map, { onInteraction, onHint = () => {} }) {
  const container = map.getContainer()
  let restoreDragging = false
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
      onInteraction()
    } else if (!hinted) {
      hinted = true
      onHint(true)
      hintTimer = setTimeout(dismissHint, 3500)
    }
  }
  const options = { capture: true, passive: true }
  container.classList.add('cooperative-map')
  container.addEventListener('touchstart', start, options)
  container.addEventListener('touchend', end, options)
  container.addEventListener('touchcancel', end, options)
  return () => {
    clearTimeout(hintTimer)
    container.removeEventListener('touchstart', start, options)
    container.removeEventListener('touchend', end, options)
    container.removeEventListener('touchcancel', end, options)
    if (restoreDragging) map.dragging.enable()
    container.classList.remove('cooperative-map')
  }
}
