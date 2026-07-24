/**
 * Loading bike — road-bike silhouette inspired by brand reference.
 * Thick rims spin with travel; drivetrain stays static.
 */
function LoadingCyclist({ className = '', progress = 0 }) {
  const wheelAngle = progress * 3.6 * 3

  return (
    <svg
      className={className}
      viewBox="0 0 220 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* Rear tire — solid thick rim */}
        <circle cx="48" cy="90" r="31" fill="none" strokeWidth="14" />
        <g transform={`rotate(${wheelAngle} 48 90)`}>
          <circle cx="48" cy="90" r="4" stroke="none" />
          <line x1="48" y1="72" x2="48" y2="78" strokeWidth="3.5" />
          <line x1="48" y1="102" x2="48" y2="108" strokeWidth="3.5" />
          <line x1="30" y1="90" x2="36" y2="90" strokeWidth="3.5" />
          <line x1="60" y1="90" x2="66" y2="90" strokeWidth="3.5" />
        </g>

        {/* Front tire */}
        <circle cx="170" cy="90" r="31" fill="none" strokeWidth="14" />
        <g transform={`rotate(${wheelAngle} 170 90)`}>
          <circle cx="170" cy="90" r="4" stroke="none" />
          <line x1="170" y1="72" x2="170" y2="78" strokeWidth="3.5" />
          <line x1="170" y1="102" x2="170" y2="108" strokeWidth="3.5" />
          <line x1="152" y1="90" x2="158" y2="90" strokeWidth="3.5" />
          <line x1="182" y1="90" x2="188" y2="90" strokeWidth="3.5" />
        </g>

        {/* Chain */}
        <g fill="none" strokeWidth="2.4">
          <line x1="48" y1="86" x2="90" y2="84" />
          <line x1="48" y1="94" x2="90" y2="96" />
        </g>

        {/* Rear cassette */}
        <circle cx="48" cy="90" r="9" stroke="none" />

        {/* Frame */}
        <g fill="none">
          <line x1="90" y1="90" x2="88" y2="36" strokeWidth="7.5" />
          <path d="M88 44 C112 42, 132 38, 148 34" strokeWidth="7" />
          <path d="M90 90 C114 72, 132 52, 148 34" strokeWidth="10" />
          <line x1="48" y1="90" x2="90" y2="90" strokeWidth="6.5" />
          <line x1="48" y1="90" x2="88" y2="44" strokeWidth="6" />
          <line x1="148" y1="34" x2="148" y2="42" strokeWidth="7.5" />
          <line x1="148" y1="42" x2="170" y2="90" strokeWidth="7" />
        </g>

        {/* Chainring + static crank (silhouette) */}
        <circle cx="90" cy="90" r="15" stroke="none" />
        <line x1="90" y1="75" x2="90" y2="68" strokeWidth="4.5" />
        <line x1="90" y1="105" x2="90" y2="114" strokeWidth="4.5" />
        <line x1="85" y1="114" x2="95" y2="114" strokeWidth="4" />

        {/* Raised saddle — level, slightly rearward */}
        <line x1="88" y1="36" x2="84" y2="20" strokeWidth="5" />
        <path
          d="M68 20 C72 17, 78 16, 86 16 C94 16, 100 17, 104 20 C100 22, 94 23, 86 23 C78 23, 72 22, 68 20 Z"
          stroke="none"
        />

        {/* Drop bars */}
        <path
          d="M148 34
             L152 26
             C154 18, 162 16, 168 20
             C172 24, 172 32, 168 38
             C164 44, 156 44, 154 38"
          fill="none"
          strokeWidth="6.5"
        />
      </g>
    </svg>
  )
}

export default LoadingCyclist
