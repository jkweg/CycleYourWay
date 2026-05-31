function Grainient({
  color1 = '#c8e6cc',
  color2 = '#5b7f61',
  color3 = '#9a7b59',
  timeSpeed = 0.25,
  warpStrength = 1,
  rotationAmount = 500,
  grainAmount = 0.1,
  zoom = 0.9,
}) {
  const animationDuration = `${Math.max(18, 70 / Math.max(0.05, timeSpeed))}s`

  return (
    <div
      className="grainient-root"
      style={{
        '--g-color-1': color1,
        '--g-color-2': color2,
        '--g-color-3': color3,
        '--g-zoom': zoom,
        '--g-opacity': Math.min(1, Math.max(0.25, 0.35 + grainAmount)),
        '--g-rotation': `${rotationAmount}deg`,
        '--g-warp': `${Math.max(0.2, warpStrength)}%`,
        '--g-duration': animationDuration,
      }}
    >
      <div className="grainient-layer grainient-layer-a" />
      <div className="grainient-layer grainient-layer-b" />
      <div className="grainient-layer grainient-layer-c" />
      <div className="grainient-grain" />
    </div>
  )
}

export default Grainient

