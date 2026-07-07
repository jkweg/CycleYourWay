import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { GeoJSON, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { plannerMarkerIcon } from './lib/leafletIcons'

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (event) => {
      onMapClick(event.latlng)
    },
  })
  return null
}

function RouteFitBounds({ routeGeoJson }) {
  const map = useMap()

  useEffect(() => {
    if (!routeGeoJson) return

    const routeLayer = L.geoJSON(routeGeoJson)
    const bounds = routeLayer.getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [36, 36] })
    }
  }, [map, routeGeoJson])

  return null
}

function FocusOnLockedPoint({ lockedPoint, disabled }) {
  const map = useMap()

  useEffect(() => {
    if (disabled || !lockedPoint) return
    map.flyTo([lockedPoint.lat, lockedPoint.lng], 9, {
      animate: true,
      duration: 0.8,
    })
  }, [disabled, lockedPoint, map])

  return null
}

function MapResizeFix() {
  const map = useMap()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [map])

  return null
}

function PlannerMap({
  onMapClick,
  lockedPoint,
  selectedRouteGeoJson,
  startPoint,
  endPoint,
  routeMode,
  routeGeoJson,
  routeDisplayKey,
  selectedRouteIndex,
}) {
  return (
    <div className="h-full w-full min-h-[320px]">
      <MapContainer center={[52.0, 19.2]} zoom={6} scrollWheelZoom className="h-full w-full">
        <MapResizeFix />
        <MapClickHandler onMapClick={onMapClick} />
        <FocusOnLockedPoint lockedPoint={lockedPoint} disabled={Boolean(selectedRouteGeoJson)} />
        <RouteFitBounds routeGeoJson={selectedRouteGeoJson} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {startPoint && (
          <Marker
            key={`start-${startPoint.lat.toFixed(5)}-${startPoint.lng.toFixed(5)}`}
            position={[startPoint.lat, startPoint.lng]}
            icon={plannerMarkerIcon}
          />
        )}
        {routeMode === 'AtoB' && endPoint && (
          <Marker
            key={`end-${endPoint.lat.toFixed(5)}-${endPoint.lng.toFixed(5)}`}
            position={[endPoint.lat, endPoint.lng]}
            icon={plannerMarkerIcon}
          />
        )}
        {routeGeoJson?.features?.map((feature, index) => (
          <GeoJSON
            key={`route-${routeDisplayKey}-${index}`}
            data={feature}
            style={{
              color:
                selectedRouteIndex === index
                  ? routeMode === 'Loop'
                    ? '#7a6248'
                    : '#3f7b57'
                  : '#94a3b8',
              weight: selectedRouteIndex === index ? 6 : 4,
              opacity: selectedRouteIndex === index ? 0.95 : 0.7,
            }}
          />
        ))}
      </MapContainer>
    </div>
  )
}

export default PlannerMap
