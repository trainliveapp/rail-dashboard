export function locationErrorMessage(error) {
  if (error?.code === 1) return 'Location access denied. Allow location in your browser settings, then retry.'
  if (error?.code === 2) return 'Your location is unavailable. Check your location settings and retry.'
  if (error?.code === 3) return 'Location request timed out. Please retry.'
  return error?.message || 'Could not get your location. Please retry.'
}

export function positionToLocation(position) {
  const { latitude: lat, longitude: lng, heading, accuracy } = position.coords
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error('No valid location was returned. Please retry.')
  }
  return { lat, lng, heading: Number.isFinite(heading) ? heading : 0, accuracy }
}

export function requestMapLocation(geolocation = navigator.geolocation, secure = window.isSecureContext) {
  if (!secure) return Promise.reject(new Error('Location needs a secure HTTPS connection. Open the secure site and retry.'))
  if (!geolocation) return Promise.reject(new Error('Location is not available on this device.'))
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(position => {
      try { resolve(positionToLocation(position)) } catch (error) { reject(error) }
    }, reject, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 })
  })
}
