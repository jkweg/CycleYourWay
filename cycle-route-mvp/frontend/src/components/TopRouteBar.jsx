import { useState } from 'react'

/** Thin route-coloured bar shown on returning visits instead of the intro. */
function TopRouteBar() {
  const [done, setDone] = useState(false)
  if (done) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-[3px] bg-burnt-orange/15"
    >
      <div className="cyw-topbar h-full rounded-r-full bg-burnt-orange" onAnimationEnd={() => setDone(true)} />
    </div>
  )
}

export default TopRouteBar
