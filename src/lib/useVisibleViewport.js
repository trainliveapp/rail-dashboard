import { useEffect } from 'react'
import { visibleViewportBounds } from './viewportBounds.js'

// Mobile keyboards resize the visible area without always resizing 100vh.
export default function useVisibleViewport() {
  useEffect(() => {
    const root = document.documentElement
    const visual = window.visualViewport
    const update = () => {
      const bounds = visibleViewportBounds({ width: root.clientWidth, height: window.innerHeight }, visual)
      for (const [key, value] of Object.entries(bounds)) {
        root.style.setProperty(`--visible-${key}`, `${value}px`)
      }
    }
    update()
    window.addEventListener('resize', update)
    visual?.addEventListener('resize', update)
    visual?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      visual?.removeEventListener('resize', update)
      visual?.removeEventListener('scroll', update)
      for (const key of ['left', 'top', 'width', 'height']) root.style.removeProperty(`--visible-${key}`)
    }
  }, [])
}
