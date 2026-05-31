import { useMemo } from 'react'

const WAVE_BASELINES = {
  top: 22,
  middle: 50,
  bottom: 78,
}

function FloatingLines({
  enabledWaves = ['top', 'middle', 'bottom'],
  lineCount = 8,
  lineDistance = 8,
  bendRadius = 8,
  bendStrength = -2,
  interactive = true,
  parallax = true,
  animationSpeed = 1,
  gradientStart = '#d6ead8',
  gradientMid = '#6b8a6f',
  gradientEnd = '#9e805e',
}) {
  const waves = useMemo(
    () => (Array.isArray(enabledWaves) && enabledWaves.length ? enabledWaves : ['middle']),
    [enabledWaves]
  )

  const normalizedLineCount = Math.max(3, Number(lineCount) || 8)
  const normalizedDistance = Math.max(3, Number(lineDistance) || 8)
  const amplitude = (Number(bendRadius) || 8) * (Number(bendStrength) || -2)
  const duration = `${Math.max(16, 48 / Math.max(0.2, animationSpeed))}s`

  const lines = []
  waves.forEach((wave, waveIndex) => {
    const base = WAVE_BASELINES[wave] ?? 50
    for (let i = 0; i < normalizedLineCount; i += 1) {
      const offset = (i - (normalizedLineCount - 1) / 2) * normalizedDistance * 0.52
      const y = base + offset
      const curve = amplitude * (1 - i / (normalizedLineCount + 1))
      const c1x = 25 + waveIndex * 5
      const c2x = 75 - waveIndex * 5
      lines.push({
        key: `${wave}-${i}`,
        d: `M -8 ${y} C ${c1x} ${y + curve}, ${c2x} ${y - curve}, 108 ${y}`,
        opacity: Math.max(0.2, 0.62 - i * 0.045),
        delay: `${(i + waveIndex) * -0.9}s`,
      })
    }
  })

  return (
    <div
      className={`floating-lines-root ${interactive ? 'floating-lines-interactive' : ''} ${parallax ? 'floating-lines-parallax' : ''}`}
      style={{ '--fl-duration': duration }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="floating-lines-svg">
        <defs>
          <linearGradient id="floatingLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="50%" stopColor={gradientMid} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
        </defs>
        {lines.map((line) => (
          <path
            key={line.key}
            d={line.d}
            fill="none"
            stroke="url(#floatingLineGradient)"
            strokeWidth="0.38"
            strokeLinecap="round"
            style={{
              opacity: line.opacity,
              animationDelay: line.delay,
            }}
            className="floating-line-path"
          />
        ))}
      </svg>
    </div>
  )
}

export default FloatingLines

