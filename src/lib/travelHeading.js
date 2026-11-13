const radians = degrees => degrees * Math.PI / 180
export const normalizeHeading = degrees => ((degrees % 360) + 360) % 360
export const headingDelta = (from, to) => ((to - from + 540) % 360) - 180

export function bearingBetween(a, b) {
  const lat1 = radians(a.lat), lat2 = radians(b.lat), lng = radians(b.lng - a.lng)
  return normalizeHeading(Math.atan2(Math.sin(lng) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng)) * 180 / Math.PI)
}

function distanceBetween(a, b) {
  const dLat = radians(b.lat - a.lat), dLng = radians(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Retain an anchor through small fixes so slow movement can accumulate,
// but never derive a direction across an outage or an inaccurate fix.
export function updateTravelHeading(previous, fix, now = Date.now()) {
  const result = { heading: previous?.heading ?? null, moving: false, anchor: previous?.anchor ?? null }
  if (!Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 40 ||
      !Number.isFinite(fix.timestamp) || now - fix.timestamp > 15000 || fix.timestamp > now + 1000) {
    return { ...result, anchor: null }
  }
  const anchor = result.anchor
  if (anchor && fix.timestamp <= anchor.timestamp) return result
  const elapsed = anchor ? (fix.timestamp - anchor.timestamp) / 1000 : 0
  const distance = anchor ? distanceBetween(anchor, fix) : 0
  const displaced = elapsed > 0 && elapsed <= 15 && distance >= Math.max(8, anchor.accuracy + fix.accuracy) && distance / elapsed <= 100
  const stopped = fix.speed != null && fix.speed < 1
  const reliableHeading = Number.isFinite(fix.heading) && fix.heading >= 0 && fix.heading < 360 && fix.speed >= 1
  if (!stopped && (reliableHeading || displaced)) {
    result.heading = reliableHeading ? fix.heading : bearingBetween(anchor, fix)
    result.moving = true
    result.anchor = fix
  } else if (!anchor || stopped || elapsed > 15) result.anchor = fix
  return result
}

// Leaflet-rotate uses clockwise map rotation: geographic heading H needs -H.
// Animate plugin geometry each frame so markers, hit testing and tiles agree.
export function animateHeadingUp(map, heading, scheduler = globalThis) {
  const start = map.getBearing()
  const delta = headingDelta(normalizeHeading(start), normalizeHeading(-heading))
  let frame, started
  const tick = time => {
    started ??= time
    const progress = Math.min(1, (time - started) / 900)
    const eased = progress * progress * (3 - 2 * progress)
    map.setBearing(start + delta * eased)
    if (progress < 1) frame = scheduler.requestAnimationFrame(tick)
  }
  frame = scheduler.requestAnimationFrame(tick)
  return () => scheduler.cancelAnimationFrame(frame)
}
