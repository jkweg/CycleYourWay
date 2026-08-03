import { useEffect, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { GeoJSON, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { createViaMarkerIcon, plannerMarkerIcon } from './lib/leafletIcons'
import { getMapTileLayer } from './lib/mapTiles'

function MapClickHandler({ onMapClick, enabled }) {
  useMapEvents({
    click: (event) => {
      if (!enabled) return
      onMapClick(event.latlng)
    },
  })
  return null
}

function MapInteractionController({ interactive }) {
  const map = useMap()

  useEffect(() => {
    if (interactive) {
      map.dragging.enable()
      map.touchZoom.enable()
      map.doubleClickZoom.enable()
      map.scrollWheelZoom.enable()
      map.boxZoom.enable()
      map.keyboard.enable()
    } else {
      map.dragging.disable()
      map.touchZoom.disable()
      map.doubleClickZoom.disable()
      map.scrollWheelZoom.disable()
      map.boxZoom.disable()
      map.keyboard.disable()
    }
  }, [interactive, map])

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

function MapResizeFix({ bump }) {
  const map = useMap()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [map, bump])

  return null
}

function DraggableMarker({ point, icon, onDragEnd, enabled }) {
  if (!point) return null
  return (
    <Marker
      position={[point.lat, point.lng]}
      icon={icon}
      draggable={Boolean(onDragEnd) && enabled}
      eventHandlers={
        onDragEnd && enabled
          ? {
              dragend: (event) => {
                const next = event.target.getLatLng()
                onDragEnd({ lat: next.lat, lng: next.lng })
              },
            }
          : undefined
      }
    />
  )
}

function usePreferMapLock() {
  const [preferLock, setPreferLock] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(pointer: coarse), (max-width: 767px)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse), (max-width: 767px)')
    const sync = () => setPreferLock(mq.matches)
    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [])

  return preferLock
}

function PlannerMap({
  onMapClick,
  lockedPoint,
  selectedRouteGeoJson,
  startPoint,
  endPoint,
  viaStops = [],
  routeMode,
  routeGeoJson,
  routeDisplayKey,
  selectedRouteIndex,
  onStartDrag,
  onEndDrag,
  onViaDrag,
}) {
  const preferLock = usePreferMapLock()
  const [unlocked, setUnlocked] = useState(false)
  const markersLocked = Boolean(selectedRouteGeoJson || routeGeoJson)
  const interactive = preferLock ? unlocked : true

  return (
    <div className="relative h-full w-full min-h-[320px]">
      <MapContainer
        center={[52.0, 19.2]}
        zoom={6}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <MapResizeFix bump={interactive} />
        <MapInteractionController interactive={interactive} />
        <MapClickHandler onMapClick={onMapClick} enabled={interactive} />
        <FocusOnLockedPoint lockedPoint={lockedPoint} disabled={Boolean(selectedRouteGeoJson)} />
        <RouteFitBounds routeGeoJson={selectedRouteGeoJson} />
        <TileLayer
          attribution={getMapTileLayer().attribution}
          url={getMapTileLayer().url}
          maxZoom={getMapTileLayer().maxZoom}
        />
        <DraggableMarker
          point={startPoint}
          icon={plannerMarkerIcon}
          enabled={interactive && !markersLocked}
          onDragEnd={markersLocked ? undefined : onStartDrag}
        />
        {routeMode === 'AtoB' &&
          viaStops.map((stop, index) => (
            <DraggableMarker
              key={stop.id}
              point={stop.point}
              icon={createViaMarkerIcon(String(index + 1))}
              enabled={interactive && !markersLocked}
              onDragEnd={
                markersLocked || !onViaDrag
                  ? undefined
                  : (point) => onViaDrag(stop.id, point)
              }
            />
          ))}
        {routeMode === 'AtoB' && (
          <DraggableMarker
            point={endPoint}
            icon={plannerMarkerIcon}
            enabled={interactive && !markersLocked}
            onDragEnd={markersLocked ? undefined : onEndDrag}
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
                    : '#FC6C26'
                  : '#94a3b8',
              weight: selectedRouteIndex === index ? 6 : 4,
              opacity: selectedRouteIndex === index ? 0.95 : 0.7,
            }}
          />
        ))}
      </MapContainer>

      {preferLock && !unlocked && (
        <button
          type="button"
          onClick={() => setUnlocked(true)}
          className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#4a3226]/35 px-4 backdrop-blur-[1px]"
        >
          <span className="rounded-2xl border border-[#C4A574] bg-[#FFF4D6] px-5 py-3 text-center text-sm font-semibold text-[#4a3226] shadow-lg">
            Dotknij, aby używać mapy
            <span className="mt-1 block text-xs font-normal text-stone-600">
              Powiększanie, przesuwanie i zaznaczanie punktów
            </span>
          </span>
        </button>
      )}

      {preferLock && unlocked && (
        <button
          type="button"
          onClick={() => setUnlocked(false)}
          className="absolute right-3 top-3 z-[1000] rounded-xl border border-[#C4A574] bg-[#FFF4D6]/95 px-3 py-2 text-xs font-semibold text-[#4a3226] shadow-md"
        >
          Zablokuj mapę
        </button>
      )}
    </div>
  )
}

export default PlannerMap
