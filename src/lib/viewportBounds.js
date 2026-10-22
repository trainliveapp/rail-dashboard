export function visibleViewportBounds(layout, visual) {
  return {
    left: visual?.offsetLeft ?? 0,
    top: visual?.offsetTop ?? 0,
    width: visual?.width ?? layout.width,
    height: visual?.height ?? layout.height,
  }
}
