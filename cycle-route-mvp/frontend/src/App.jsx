import { useMemo, useState } from 'react'
import { GeoJSON, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (event) => {
      onMapClick(event.latlng)
    },
  })

  return null
}

function App() {
  const [startPoint, setStartPoint] = useState(null)
  const [endPoint, setEndPoint] = useState(null)
  const [routeGeoJson, setRouteGeoJson] = useState(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [error, setError] = useState('')

  const routeStyle = useMemo(
    () => ({
      color: '#2563eb',
      weight: 5,
      opacity: 0.9,
    }),
    []
  )

  const requestRoute = async (start, end) => {
    setIsLoadingRoute(true)
    setError('')

    try {
      const response = await fetch('http://localhost:5000/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start,
          end,
          profile: 'cycling-mountain',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Route request failed.')
      }

      setRouteGeoJson(data)
    } catch (requestError) {
      setRouteGeoJson(null)
      setError(requestError.message || 'Unexpected route error.')
    } finally {
      setIsLoadingRoute(false)
    }
  }

  const handleMapClick = (latlng) => {
    const clickedPoint = { lat: latlng.lat, lng: latlng.lng }

    if (!startPoint || (startPoint && endPoint)) {
      setStartPoint(clickedPoint)
      setEndPoint(null)
      setRouteGeoJson(null)
      setError('')
      return
    }

    setEndPoint(clickedPoint)
    requestRoute(startPoint, clickedPoint)
  }

  return (
    <div className="app-shell">
      <div className="map-status">
        {isLoadingRoute && <p>Wyznaczanie trasy...</p>}
        {!isLoadingRoute && !startPoint && <p>Kliknij mapę, aby wybrać punkt startowy.</p>}
        {!isLoadingRoute && startPoint && !endPoint && (
          <p>Kliknij drugi raz, aby wybrać punkt końcowy.</p>
        )}
        {error && <p>{error}</p>}
      </div>
      <MapContainer
        center={[50.0647, 19.945]}
        zoom={13}
        scrollWheelZoom
        className="map-container"
      >
        <MapClickHandler onMapClick={handleMapClick} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {startPoint && <Marker position={[startPoint.lat, startPoint.lng]} />}
        {endPoint && <Marker position={[endPoint.lat, endPoint.lng]} />}
        {routeGeoJson && <GeoJSON data={routeGeoJson} style={routeStyle} />}
      </MapContainer>
    </div>
  )
}

export default App
