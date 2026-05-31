const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export const buildGpxFromRouteFeature = (routeFeature, options = {}) => {
  const coordinates = routeFeature?.geometry?.coordinates
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    throw new Error('Brak współrzędnych trasy do eksportu GPX.')
  }

  const trackName = options.trackName || 'Cycle Your Way - trasa'
  const createdAt = new Date().toISOString()

  const trackPoints = coordinates
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return ''
      const lon = point[0]
      const lat = point[1]
      const elevation =
        point.length >= 3 && Number.isFinite(point[2]) ? `<ele>${point[2]}</ele>` : ''

      return `      <trkpt lat="${lat}" lon="${lon}">${elevation}</trkpt>`
    })
    .filter(Boolean)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Cycle Your Way" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(trackName)}</name>
    <time>${createdAt}</time>
  </metadata>
  <trk>
    <name>${escapeXml(trackName)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`
}

export const downloadRouteAsGpx = (routeFeature, options = {}) => {
  const gpxContent = buildGpxFromRouteFeature(routeFeature, options)
  const filename =
    options.filename ||
    `cycle-your-way-${options.routeMode === 'Loop' ? 'petla' : 'trasa'}-${Date.now()}.gpx`

  const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.click()
  URL.revokeObjectURL(objectUrl)
}
