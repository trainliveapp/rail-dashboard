// Leaflet-rotate's TouchGestures handles two-finger pan, pinch and rotation.
// Suppress only Leaflet's single-pointer drag handler during a touch sequence;
// mouse/keyboard navigation and marker taps remain available.
export function attachCooperativeMapGestures(map, { onHint, onInteraction, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const container = map.getContainer()
  let origin = null
  let hinted = false
  let timer = null
  let restoreDragging = false
  const start = (event) => {
    if (event.target.closest?.('.leaflet-popup, .leaflet-control')) return
    if (map.dragging.enabled()) {
      restoreDragging = true
      map.dragging.disable()
    }
    if (event.touches.length === 1) {
      origin = [event.touches[0].clientX, event.touches[0].clientY]
      hinted = false
    } else {
      origin = null
      onHint(false)
      onInteraction()
    }
  }
  const move = (event) => {
    if (event.touches.length !== 1 || !origin || hinted) return
    const touch = event.touches[0]
    if (Math.hypot(touch.clientX - origin[0], touch.clientY - origin[1]) < 10) return
    hinted = true
    onHint(true)
    clearTimer(timer)
    timer = setTimer(() => onHint(false), 2000)
  }
  const end = (event) => {
    origin = null
    if (event.touches.length) return
    if (restoreDragging) map.dragging.enable()
    restoreDragging = false
  }
  const options = { capture: true, passive: true }
  container.classList.add('cooperative-map')
  container.addEventListener('touchstart', start, options)
  container.addEventListener('touchmove', move, options)
  container.addEventListener('touchend', end, options)
  container.addEventListener('touchcancel', end, options)
  return () => {
    clearTimer(timer)
    container.removeEventListener('touchstart', start, options)
    container.removeEventListener('touchmove', move, options)
    container.removeEventListener('touchend', end, options)
    container.removeEventListener('touchcancel', end, options)
    container.classList.remove('cooperative-map')
    if (restoreDragging) map.dragging.enable()
  }
}
