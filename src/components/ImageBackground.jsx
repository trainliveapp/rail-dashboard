import { useEffect, useState } from 'react'
import { loadImage } from '../lib/imageLoading'

// Keep the previous background visible until its replacement has decoded.
export default function ImageBackground({ src, srcSet, sizes, enabled = true, shaded = false }) {
  const [images, setImages] = useState({ visible: null, previous: null })
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    loadImage(src, { srcSet, sizes }).then(() => {
      if (cancelled) return
      setImages((current) => ({ visible: { src, srcSet, sizes }, previous: current.visible }))
    }).catch(() => { /* Retain the current image or the panel's base colour. */ })
    return () => { cancelled = true }
  }, [src, srcSet, sizes, enabled])

  useEffect(() => {
    const timer = setTimeout(() => setImages((current) => ({ ...current, previous: null })), 400)
    return () => clearTimeout(timer)
  }, [images.visible])

  return <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
    {images.previous && <img {...images.previous} alt="" className="absolute inset-0 h-full w-full object-cover" />}
    {images.visible && <img key={images.visible.src} {...images.visible} alt="" className="image-background-reveal absolute inset-0 h-full w-full object-cover" decoding="async" />}
    {shaded && <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/35" />}
  </div>
}
