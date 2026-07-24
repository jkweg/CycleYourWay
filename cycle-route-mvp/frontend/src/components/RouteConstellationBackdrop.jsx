/**
 * Animated route constellation — landing backdrop only.
 * Soft orange orbits/trails on vanilla; pointer-events none.
 */
function RouteConstellationBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-vanilla" />

      {/* Soft color blobs */}
      <div className="route-constellation__blob route-constellation__blob--a absolute -left-[20%] top-[-10%] h-[55vmin] w-[55vmin] rounded-full bg-burnt-orange/20 blur-3xl" />
      <div className="route-constellation__blob route-constellation__blob--b absolute -right-[15%] top-[30%] h-[50vmin] w-[50vmin] rounded-full bg-burnt-orange/15 blur-3xl" />
      <div className="route-constellation__blob route-constellation__blob--c absolute bottom-[-10%] left-[20%] h-[45vmin] w-[45vmin] rounded-full bg-burnt-orange/12 blur-3xl" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Orbit rings */}
        <g className="route-constellation__orbit route-constellation__orbit--slow" stroke="#FC6C26" strokeOpacity="0.22">
          <circle cx="600" cy="420" r="180" strokeWidth="1.5" strokeDasharray="6 14" />
          <circle cx="600" cy="420" r="280" strokeWidth="1.2" strokeDasharray="2 10" />
          <circle cx="600" cy="420" r="380" strokeWidth="1" strokeDasharray="1 16" />
        </g>

        <g className="route-constellation__orbit route-constellation__orbit--rev" stroke="#FC6C26" strokeOpacity="0.16">
          <ellipse cx="280" cy="200" rx="160" ry="90" strokeWidth="1.5" strokeDasharray="8 12" />
          <ellipse cx="980" cy="680" rx="200" ry="110" strokeWidth="1.5" strokeDasharray="4 14" />
        </g>

        {/* Crossing route trails */}
        <g className="route-constellation__trails" stroke="#FC6C26" strokeLinecap="round" fill="none">
          <path
            className="route-constellation__trail route-constellation__trail--a"
            d="M -40 720 C 180 640 320 520 480 480 C 700 420 820 280 1280 160"
            strokeWidth="3"
            strokeOpacity="0.35"
          />
          <path
            className="route-constellation__trail route-constellation__trail--b"
            d="M -20 120 C 220 200 360 360 520 400 C 760 460 900 620 1240 780"
            strokeWidth="2.5"
            strokeOpacity="0.28"
            strokeDasharray="10 18"
          />
          <path
            className="route-constellation__trail route-constellation__trail--c"
            d="M 80 900 C 260 700 400 560 600 500 C 820 430 980 300 1100 -20"
            strokeWidth="2"
            strokeOpacity="0.22"
          />
          <path
            className="route-constellation__trail route-constellation__trail--d"
            d="M 1200 400 C 980 380 860 460 720 520 C 520 600 340 640 -40 580"
            strokeWidth="2.2"
            strokeOpacity="0.25"
            strokeDasharray="2 12"
          />
        </g>

        {/* Route nodes */}
        <g fill="#FC6C26">
          <circle className="route-constellation__node" cx="480" cy="480" r="5" opacity="0.55" />
          <circle className="route-constellation__node" cx="600" cy="500" r="4" opacity="0.4" />
          <circle className="route-constellation__node" cx="720" cy="520" r="5" opacity="0.5" />
          <circle className="route-constellation__node" cx="860" cy="300" r="3.5" opacity="0.45" />
          <circle className="route-constellation__node" cx="340" cy="640" r="3.5" opacity="0.4" />
        </g>
      </svg>
    </div>
  )
}

export default RouteConstellationBackdrop
