// Brand bicycle drawn in a 120×76 box (BIKE_SIZE in lib/routeMotion.js).
// Render it inside an <svg> (as a <g>) so it can be moved along a route path.

const REAR_SPOKES = 'M26 31V69M7 50H45M12.6 36.6L39.4 63.4M39.4 36.6L12.6 63.4'
const FRONT_SPOKES = 'M94 31V69M75 50H113M80.6 36.6L107.4 63.4M107.4 36.6L80.6 63.4'

export function BikeShapes({
  tire = '#2A1A12',
  spoke = 'rgba(42,26,18,0.45)',
  frame = '#FC6C26',
  hub = '#FFF4D6',
  weight = 1,
  spinning = false,
}) {
  const spin = spinning ? 'cyw-spin' : undefined
  const crank = spinning ? 'cyw-spin cyw-spin--slow' : undefined
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <g className={spin} fill="none">
        <circle cx="26" cy="50" r="20" stroke={tire} strokeWidth={4 * weight} />
        <path d={REAR_SPOKES} stroke={spoke} strokeWidth={1.3 * weight} />
        <circle cx="26" cy="50" r={3 * weight} fill={tire} stroke="none" />
      </g>
      <g className={spin} fill="none">
        <circle cx="94" cy="50" r="20" stroke={tire} strokeWidth={4 * weight} />
        <path d={FRONT_SPOKES} stroke={spoke} strokeWidth={1.3 * weight} />
        <circle cx="94" cy="50" r={3 * weight} fill={tire} stroke="none" />
      </g>
      <g fill="none" stroke={frame} strokeWidth={4.5 * weight}>
        <path d="M26 50 L52 50 L45 26 Z" />
        <path d="M45 26 L83 24 L52 50" />
        <path d="M83 24 L94 50" />
      </g>
      <path d="M45 26 L43 16" stroke={tire} strokeWidth={3.5 * weight} />
      <path d="M35 14.5 Q43 10.5 51 14" stroke={tire} strokeWidth={5 * weight} fill="none" />
      <path d="M83 24 L81 15 L89 13.5 Q95.5 13 94.5 19" stroke={tire} strokeWidth={3.5 * weight} fill="none" />
      <g className={crank} stroke={tire}>
        <circle cx="52" cy="50" r="6.5" fill={hub} strokeWidth={2.5 * weight} />
        <path d="M52 50 L57 59 M52 50 L47 41" strokeWidth={3.5 * weight} />
      </g>
    </g>
  )
}

export function BrandMark({ size = 28, color = '#E05518', className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className={className}>
      <circle cx="14" cy="14" r="13" fill="none" stroke={color} strokeWidth="2" />
      <path d="M7 17 C 11 9 17 21 21 11" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
