import { useEffect, useRef, useState } from 'react'

// Reveal decoded pixels while the image's width/height reserve its layout space.
export default function SmoothImage({ src, srcSet, alt = '', className = '', loading = 'lazy', style, onLoad, onError, ...props }) {
  const elementRef = useRef(null)
  const [readySource, setReadySource] = useState('')
  const source = `${src}|${srcSet || ''}`

  const reveal = async (element) => {
    try { await element.decode() } catch { /* Some browsers cannot decode cached SVGs. */ }
    if (elementRef.current === element && element.complete && element.naturalWidth) setReadySource(source)
  }

  useEffect(() => {
    const element = elementRef.current
    if (element?.complete && element.naturalWidth) void reveal(element)
  }, [source])

  return <img
    {...props}
    key={source}
    ref={elementRef}
    src={src}
    srcSet={srcSet}
    alt={alt}
    loading={loading}
    decoding="async"
    className={`image-reveal ${className}`}
    style={{ ...style, opacity: readySource === source ? 1 : 0 }}
    onLoad={(event) => { void reveal(event.currentTarget); onLoad?.(event) }}
    onError={(event) => { setReadySource(source); onError?.(event) }}
  />
}
