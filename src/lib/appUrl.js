const PRODUCTION_ORIGIN = 'https://www.avviso.co.uk'

function isLocalOrigin(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

export function getAppUrl(path = '') {
  const origin = typeof window !== 'undefined' && isLocalOrigin(window.location.hostname)
    ? window.location.origin
    : (import.meta.env.VITE_PUBLIC_SITE_URL || PRODUCTION_ORIGIN)

  return new URL(path.replace(/^\/+/, ''), `${origin}/`).toString()
}
