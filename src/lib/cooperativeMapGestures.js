// Leaflet handles one-finger panning while Leaflet-rotate handles two-finger
// pan, pinch and rotation.
export function attachCooperativeMapGestures(map, { onInteraction }) {
  const container = map.getContainer()
  const start = (event) => {
    if (event.target.closest?.('.leaflet-popup, .leaflet-control')) return
    if (event.touches.length > 1) onInteraction()
  }
  const options = { capture: true, passive: true }
  container.classList.add('cooperative-map')
  container.addEventListener('touchstart', start, options)
  return () => {
    container.removeEventListener('touchstart', start, options)
    container.classList.remove('cooperative-map')
  }
}
