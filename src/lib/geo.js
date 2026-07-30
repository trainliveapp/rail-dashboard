// Distance in km between two lat/lng points, used to find the nearest
// known station to a GPS reading. Good enough at UK city distances, no
// need for anything more precise than this for "which station am I at".
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Returns { station, distanceKm } for the closest entry in `stations`, or
// null if the list is empty. Also returns null (treated as "no match") by
// the caller if distanceKm is too large to be a believable "you're here".
export function findNearestStation(lat, lng, stations, maxKm = 1.5) {
  let closest = null
  let closestDist = Infinity

  for (const station of stations) {
    const dist = haversineKm(lat, lng, station.lat, station.lng)
    if (dist < closestDist) {
      closestDist = dist
      closest = station
    }
  }

  if (!closest || closestDist > maxKm) return null
  return { station: closest, distanceKm: closestDist }
}
