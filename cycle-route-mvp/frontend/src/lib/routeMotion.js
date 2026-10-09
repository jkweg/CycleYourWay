// Moves an SVG element along an SVG path and reveals the path behind it.
// Works in the path's own coordinates, so it stays exact at any scale.

// Brand bike (components/brand/BikeGlyph.jsx) box; its wheels rest on groundY.
export const BIKE_SIZE = { width: 120, height: 76, groundY: 70 }

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/**
 * @param {SVGPathElement} path route the rider follows
 * @param {number} progress 0..1
 * @param {{ rider?: SVGGraphicsElement | null, trail?: SVGPathElement | null,
 *   rotate?: boolean, scale?: number, anchor?: [number, number] }} options
 *   trail: a path with pathLength="1000" drawn up to `progress`;
 *   anchor: point of the rider graphic (in its own units) that sits on the path.
 */
export function placeOnPath(path, progress, { rider, trail, rotate = true, scale = 1, anchor = [0, 0] } = {}) {
  const p = Math.min(1, Math.max(0, progress))
  if (trail) trail.style.strokeDashoffset = String(1000 * (1 - p))
  if (!rider) return
  const length = path.getTotalLength()
  const at = path.getPointAtLength(length * p)
  let angle = 0
  if (rotate) {
    const ahead = path.getPointAtLength(Math.min(length, length * p + 2))
    const behind = path.getPointAtLength(Math.max(0, length * p - 2))
    angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI
  }
  rider.setAttribute(
    'transform',
    `translate(${at.x} ${at.y}) rotate(${angle}) scale(${scale}) translate(${-anchor[0]} ${-anchor[1]})`,
  )
}

/**
 * Animates progress 0→1 over `duration` ms; returns a cancel function.
 * `onFrame(p)` receives the eased progress.
 */
export function animateProgress({ duration, onFrame, onDone, ease = easeInOutCubic }) {
  let frame = 0
  const start = performance.now()
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration)
    onFrame(ease(t))
    if (t < 1) frame = requestAnimationFrame(tick)
    else onDone?.()
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}
