import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import brandTitle from '../assets/brandTitlePath.json'

const BRAND_TITLE = 'Cycle Your Way'

/** Mask stroke thick enough to cover Great Vibes letter bodies while revealing fill. */
const FILLED_MASK_STROKE = 18

function getStrokeState(length, remaining) {
  if (length <= 0 || remaining <= 0) {
    return { dasharray: length, dashoffset: length, drawn: 0 }
  }

  if (remaining >= length) {
    return { dasharray: length, dashoffset: 0, drawn: length }
  }

  return {
    dasharray: length,
    dashoffset: length - remaining,
    drawn: remaining,
  }
}

/**
 * Handwriting title.
 * - variant="filled"  → reveals solid letters while drawing (default)
 * - variant="outline" → previous contour-first draw, then fill
 */
function LoadingHandwritingTitle({
  progress = 0,
  className = '',
  variant = 'filled',
}) {
  const pathRefs = useRef([])
  const [pathLengths, setPathLengths] = useState([])

  const glyphs = useMemo(
    () => brandTitle.glyphs.filter((glyph) => glyph.d),
    [],
  )

  useLayoutEffect(() => {
    setPathLengths(
      glyphs.map((_, index) => pathRefs.current[index]?.getTotalLength() ?? 0),
    )
  }, [glyphs])

  const ratio = Math.min(1, Math.max(0, progress / 100))
  const totalLength = pathLengths.reduce((sum, length) => sum + length, 0)
  let remaining = totalLength * ratio

  let penGlyphIndex = -1
  let penPoint = null

  const strokeStates = pathLengths.map((length, index) => {
    const state = getStrokeState(length, remaining)
    remaining -= state.drawn

    if (state.drawn > 0) {
      penGlyphIndex = index
      const node = pathRefs.current[index]
      if (node) {
        penPoint = node.getPointAtLength(state.drawn)
      }
    }

    return state
  })

  const isOutline = variant === 'outline'
  const fillOpacity = isOutline
    ? ratio >= 0.9
      ? Math.min(1, (ratio - 0.9) / 0.1)
      : 0
    : 1
  const strokeOpacity = isOutline ? 1 - fillOpacity * 0.85 : 0
  const showPen = penPoint && ratio > 0.01 && ratio < 0.995

  return (
    <div className={className}>
      <svg
        viewBox={brandTitle.viewBox}
        className="loading-screen__title-svg h-full w-full overflow-visible"
        role="img"
        aria-label={BRAND_TITLE}
        preserveAspectRatio="xMidYMid meet"
      >
        {!isOutline ? (
          <defs>
            {glyphs.map((glyph, index) => {
              const stroke = strokeStates[index]
              return (
                <mask
                  key={`mask-${glyph.char}-${index}`}
                  id={`handwriting-mask-${index}`}
                  maskUnits="userSpaceOnUse"
                >
                  <path
                    d={glyph.d}
                    fill="none"
                    stroke="white"
                    strokeWidth={FILLED_MASK_STROKE}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={stroke?.dasharray || 0}
                    strokeDashoffset={stroke?.dashoffset || 0}
                    transform={glyph.transform}
                  />
                </mask>
              )
            })}
          </defs>
        ) : null}

        {glyphs.map((glyph, index) => {
          const stroke = strokeStates[index]

          return (
            <g key={`${glyph.char}-${index}`} transform={glyph.transform}>
              {/* Invisible path used only to measure length / pen position */}
              <path
                ref={(node) => {
                  pathRefs.current[index] = node
                }}
                d={glyph.d}
                fill="none"
                stroke="transparent"
                strokeWidth={1}
                aria-hidden="true"
              />

              {isOutline ? (
                <>
                  <path
                    d={glyph.d}
                    fill="currentColor"
                    fillOpacity={fillOpacity}
                    stroke="none"
                  />
                  <path
                    d={glyph.d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={stroke?.dasharray || 0}
                    strokeDashoffset={stroke?.dashoffset || 0}
                    opacity={strokeOpacity}
                  />
                </>
              ) : (
                <path
                  d={glyph.d}
                  fill="currentColor"
                  stroke="none"
                  mask={`url(#handwriting-mask-${index})`}
                />
              )}

              {showPen && penGlyphIndex === index && penPoint ? (
                <circle
                  className="loading-screen__pen-tip"
                  cx={penPoint.x}
                  cy={penPoint.y}
                  r={2.4}
                  fill="currentColor"
                />
              ) : null}
            </g>
          )
        })}
      </svg>
      <span className="sr-only">{BRAND_TITLE}</span>
    </div>
  )
}

export default LoadingHandwritingTitle
