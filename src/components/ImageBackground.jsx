import { useEffect, useState } from 'react'
import { loadImage } from '../lib/imageLoading'

// Keep the previous background visible until its replacement has decoded.
export default function ImageBackground({ src, srcSet, sizes, enabled = true, shaded = false, fit = 'cover', imageStyle, photoViewport }) {
  const [images, setImages] = useState({ visible: null, previous: null })
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    loadImage(src, { srcSet, sizes }).then(() => {
      if (cancelled) return
      setImages((current) => ({ visible: { src, srcSet, sizes, style: { ...imageStyle, objectFit: fit }, photoViewport }, previous: current.visible }))
    }).catch(() => { /* Retain the current image or the panel's base colour. */ })
    return () => { cancelled = true }
  }, [src, srcSet, sizes, enabled, imageStyle, fit, photoViewport])

  useEffect(() => {
    const timer = setTimeout(() => setImages((current) => ({ ...current, previous: null })), 400)
    return () => clearTimeout(timer)
  }, [images.visible])

  const renderImage = (image, className) => {
    if (!image) return null
    if (image.photoViewport) {
      const { x, y, width, height, sourceWidth, sourceHeight } = image.photoViewport
      return <svg key={image.src} className={className} viewBox={`${x} ${y} ${width} ${height}`} preserveAspectRatio="xMidYMid slice" focusable="false">
        <image href={image.src} width={sourceWidth} height={sourceHeight} />
      </svg>
    }
    return <img key={image.src} src={image.src} srcSet={image.srcSet} sizes={image.sizes} style={image.style} alt="" className={className} decoding="async" />
  }

  return <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
    {renderImage(images.previous, 'absolute inset-0 h-full w-full object-cover')}
    {renderImage(images.visible, 'image-background-reveal absolute inset-0 h-full w-full object-cover')}
    {shaded && <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/35" />}
  </div>
}
