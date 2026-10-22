import { useCallback, useEffect, useRef, useState } from 'react'
import { constrainPanelPosition } from './panelPosition.js'
import { visibleViewportBounds } from './viewportBounds.js'

export default function useDraggablePanel() {
  const panelRef = useRef(null)
  const dragRef = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  const constrain = useCallback((next, current) => {
    const rect = panelRef.current.getBoundingClientRect()
    return constrainPanelPosition(next,
      { left: rect.left - current.x, top: rect.top - current.y }, rect,
      visibleViewportBounds({ width: document.documentElement.clientWidth, height: window.innerHeight }, window.visualViewport))
  }, [])

  useEffect(() => {
    const keepInView = () => setPosition((current) => constrain(current, current))
    const observer = new ResizeObserver(keepInView)
    observer.observe(panelRef.current)
    window.addEventListener('resize', keepInView)
    window.visualViewport?.addEventListener('resize', keepInView)
    window.visualViewport?.addEventListener('scroll', keepInView)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', keepInView)
      window.visualViewport?.removeEventListener('resize', keepInView)
      window.visualViewport?.removeEventListener('scroll', keepInView)
    }
  }, [constrain])

  const endDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return {
    panelRef,
    style: { transform: `translate(${position.x}px, ${position.y}px)` },
    dragging,
    handleProps: {
      onPointerDown: (event) => {
        if (!event.isPrimary || event.button !== 0) return
        event.preventDefault()
        dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, position }
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
      },
      onPointerMove: (event) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        setPosition((current) => constrain({
          x: drag.position.x + event.clientX - drag.x,
          y: drag.position.y + event.clientY - drag.y,
        }, current))
      },
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onLostPointerCapture: endDrag,
      onKeyDown: (event) => {
        const movement = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[event.key]
        if (!movement) return
        event.preventDefault()
        setPosition((current) => constrain({ x: current.x + movement[0], y: current.y + movement[1] }, current))
      },
      onDoubleClick: () => setPosition({ x: 0, y: 0 }),
    },
  }
}
