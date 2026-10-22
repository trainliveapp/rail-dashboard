export function constrainPanelPosition(position, origin, size, viewport, margin = 12) {
  const clamp = (value, min, max) => min > max ? (min + max) / 2 : Math.max(min, Math.min(max, value))
  return {
    x: clamp(position.x, margin - origin.left, viewport.width - margin - origin.left - size.width),
    y: clamp(position.y, margin - origin.top, viewport.height - margin - origin.top - size.height),
  }
}
