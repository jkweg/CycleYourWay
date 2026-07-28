import { lazy, Suspense } from 'react'
import { getElevationGainMeters } from '../lib/routeStats'
import ChunkFallback from './ChunkFallback'

const ElevationChart = lazy(() => import('../ElevationChart'))

function MapRouteDetailsBar({
  routeStats,
  selectedFeature,
  selectedRouteGeoJson,
  routeDisplayKey,
  surfaces = { known: [], unknownPercent: null },
  steepness = { climbs: [], totalClimbPercent: null },
  preferAsphalt = false,
  asphaltSharePercent = null,
}) {
  if (!routeStats || !selectedRouteGeoJson) return null

  const elevationGain = getElevationGainMeters(selectedFeature)
  const knownSurfaces = Array.isArray(surfaces) ? surfaces : surfaces.known || []
  const unknownPercent = Array.isArray(surfaces)
    ? null
    : surfaces.unknownPercent
  const climbs = steepness?.climbs || []
  const hasSurfaceInfo = knownSurfaces.length > 0 || unknownPercent != null
  const hasSteepness = climbs.length > 0
  const showAsphaltWarning =
    preferAsphalt &&
    asphaltSharePercent != null &&
    asphaltSharePercent < 85

  const timeLabel =
    routeStats.hours > 0
      ? `${routeStats.hours} h ${routeStats.minutes} min`
      : `${routeStats.minutes} min`

  return (
    <div className="shrink-0 border-t border-[#C4A574] bg-[#F5E6C0]/95 backdrop-blur-sm">
      {showAsphaltWarning && (
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 md:px-4">
          Preferujesz asfalt, a wybrana trasa ma ok. {asphaltSharePercent}% asfaltu
          w danych mapy. Reszta to inna nawierzchnia albo brak tagu w OSM.
        </p>
      )}
      {preferAsphalt && asphaltSharePercent != null && asphaltSharePercent >= 85 && (
        <p className="border-b border-orange-100 bg-orange-50 px-3 py-1.5 text-xs text-orange-950 md:px-4">
          Asfalt według mapy: ok. {asphaltSharePercent}% trasy.
        </p>
      )}

      {/* Mobile: stacked and readable. Desktop: fixed-height row with scrollable surfaces. */}
      <div className="grid max-h-[65vh] gap-3 overflow-y-auto p-3 md:max-h-none md:grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)_minmax(0,15rem)] md:items-stretch md:gap-3 md:overflow-visible md:p-3.5">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-orange-100 bg-[#FFF4D6] px-3 py-3 sm:grid-cols-4 md:flex md:h-[192px] md:flex-col md:justify-between md:gap-1 md:overflow-visible">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase leading-none tracking-wide text-orange-800">
              Dystans
            </p>
            <p className="mt-1 text-lg font-semibold leading-none tabular-nums text-[#FC6C26] md:text-base">
              {routeStats.distanceKm} km
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase leading-none tracking-wide text-orange-800">
              Czas
            </p>
            <p className="mt-1 text-lg font-semibold leading-none tabular-nums text-[#FC6C26] md:text-base">
              {timeLabel}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase leading-none tracking-wide text-orange-800">
              Wznios
            </p>
            <p className="mt-1 text-lg font-semibold leading-none tabular-nums text-[#FC6C26] md:text-base">
              {elevationGain == null ? '—' : `${Math.round(elevationGain)} m`}
            </p>
          </div>
          {steepness?.totalClimbPercent != null && (
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase leading-none tracking-wide text-orange-800">
                Podjazdy
              </p>
              <p className="mt-1 text-lg font-semibold leading-none tabular-nums text-[#FC6C26] md:text-base">
                {steepness.totalClimbPercent}%
              </p>
            </div>
          )}
        </div>

        <div className="h-[234px] overflow-hidden rounded-xl border border-[#C4A574] bg-[#FFF4D6] md:h-[192px]">
          <Suspense
            fallback={
              <ChunkFallback
                label="Profil wysokości…"
                className="h-full bg-transparent"
              />
            }
          >
            <ElevationChart
              key={`elevation-bar-${routeDisplayKey}`}
              routeData={selectedRouteGeoJson}
              compact
            />
          </Suspense>
        </div>

        <div className="max-h-none space-y-2 md:h-[192px] md:overflow-y-auto md:pr-1">
          {hasSurfaceInfo ? (
            <div className="rounded-xl border border-[#C4A574] bg-[#FFF4D6] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase leading-none tracking-wide text-[#7a6248]">
                Nawierzchnia
              </p>
              <div className="mt-2.5 space-y-2">
                {knownSurfaces.map((surface) => (
                  <div key={`${surface.code}-${surface.label}`}>
                    <div className="mb-0.5 flex justify-between gap-2 text-xs leading-4 text-stone-700 md:text-[11px]">
                      <span className="truncate font-medium">{surface.label}</span>
                      <span className="shrink-0 tabular-nums font-semibold text-[#FC6C26]">
                        {surface.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#f5e6c0]">
                      <div
                        className={`h-1.5 rounded-full ${surface.colorClass}`}
                        style={{ width: `${surface.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {unknownPercent != null && unknownPercent > 0 && (
                <p className="mt-2 border-t border-[#f0d4b8] pt-2 text-[10px] leading-4 text-stone-500">
                  {unknownPercent}% trasy bez tagu nawierzchni w OSM.
                </p>
              )}
            </div>
          ) : null}

          {hasSteepness ? (
            <div className="rounded-xl border border-[#C4A574] bg-[#FFF4D6] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase leading-none tracking-wide text-[#7a6248]">
                Stromizny
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {climbs.map((climb) => (
                  <li
                    key={`${climb.code}-${climb.label}`}
                    className="flex justify-between gap-2 text-xs leading-4 text-stone-700 md:text-[11px]"
                  >
                    <span className="truncate font-medium">{climb.label}</span>
                    <span className="shrink-0 tabular-nums text-[#FC6C26]">
                      {climb.percentage}% · {climb.distanceKm} km
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : !hasSurfaceInfo ? (
            <div className="hidden rounded-xl border border-dashed border-[#f0d4b8] bg-[#FFF4D6]/30 p-3 text-xs text-stone-500 md:flex md:h-full md:items-center">
              Brak danych o nawierzchni / stromiźnie dla tej trasy.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default MapRouteDetailsBar
