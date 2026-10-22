export function constrainPanelPosition(position, origin, size, viewport, margin = 12) {
  const clamp = (value, min, max) => min > max ? (min + max) / 2 : Math.max(min, Math.min(max, value))
  return {
    x: clamp(position.x, (viewport.left || 0) + margin - origin.left, (viewport.left || 0) + viewport.width - margin - origin.left - size.width),
    y: clamp(position.y, (viewport.top || 0) + margin - origin.top, (viewport.top || 0) + viewport.height - margin - origin.top - size.height),
  }
}
