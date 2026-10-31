const pending = new Map()

// Share downloads/decodes across the slideshow and background switches.
// Failed requests are removed so a later attempt can retry.
export function loadImage(src, { srcSet, sizes } = {}) {
  const key = `${src}|${srcSet || ''}|${sizes || ''}`
  if (!pending.has(key)) {
    const promise = new Promise((resolve, reject) => {
      const image = new Image()
      image.decoding = 'async'
      image.onload = async () => {
        try { await image.decode() } catch { /* onload already guarantees usable pixels. */ }
        resolve(src)
      }
      image.onerror = () => reject(new Error('Image could not be loaded.'))
      if (sizes) image.sizes = sizes
      if (srcSet) image.srcset = srcSet
      image.src = src
    })
    pending.set(key, promise)
    promise.catch(() => { if (pending.get(key) === promise) pending.delete(key) })
  }
  return pending.get(key)
}
