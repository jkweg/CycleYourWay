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

  return (
    <div className="shrink-0 border-t-2 border-[#C4A574] bg-[#F5E6C0]">
      {showAsphaltWarning && (
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900 md:px-4">
          Preferujesz asfalt, a wybrana trasa ma ok. {asphaltSharePercent}% asfaltu
          w danych mapy. Reszta to inna nawierzchnia albo brak tagu w OSM.
        </p>
      )}
      {preferAsphalt && asphaltSharePercent != null && asphaltSharePercent >= 85 && (
        <p className="border-b border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-950 md:px-4">
          Asfalt według mapy: ok. {asphaltSharePercent}% trasy.
        </p>
      )}
      <div className="grid gap-2 p-2 md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_minmax(0,12rem)] md:items-stretch md:gap-3 md:p-3">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-orange-100 bg-[#FFF4D6] px-2.5 py-2 sm:grid-cols-4 md:flex md:flex-col md:items-stretch md:justify-center md:gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-800">
              Dystans
            </p>
            <p className="text-base font-semibold text-[#FC6C26] md:text-sm">
              {routeStats.distanceKm} km
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-800">
              Czas
            </p>
            <p className="text-base font-semibold text-[#FC6C26] md:text-sm">
              {routeStats.hours > 0
                ? `${routeStats.hours} h ${routeStats.minutes} min`
                : `${routeStats.minutes} min`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-800">
              Wznios
            </p>
            <p className="text-base font-semibold text-[#FC6C26] md:text-sm">
              {elevationGain == null ? '—' : `${Math.round(elevationGain)} m`}
            </p>
          </div>
          {steepness?.totalClimbPercent != null && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-800">
                Podjazdy
              </p>
              <p className="text-base font-semibold text-[#FC6C26] md:text-sm">
                {steepness.totalClimbPercent}%
              </p>
            </div>
          )}
        </div>

        <div className="min-h-[140px] overflow-hidden rounded-xl border border-[#C4A574] bg-[#FFF4D6] md:min-h-[110px]">
          <Suspense
            fallback={
              <ChunkFallback
                label="Profil wysokości…"
                className="min-h-[140px] bg-transparent md:min-h-[110px]"
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

        <div className="space-y-3">
          {hasSurfaceInfo ? (
            <div className="rounded-xl border border-[#C4A574] bg-[#FFF4D6] p-3 md:p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#7a6248]">
                Nawierzchnia
              </p>
              <div className="mt-2 space-y-2">
                {knownSurfaces.slice(0, 4).map((surface) => (
                  <div key={`${surface.code}-${surface.label}`}>
                    <div className="mb-1 flex justify-between gap-2 text-xs text-stone-700">
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
                <p className="mt-3 border-t border-[#f0d4b8] pt-2 text-xs leading-5 text-stone-600">
                  {unknownPercent}% trasy bez tagu nawierzchni w OSM.
                </p>
              )}
            </div>
          ) : null}

          {hasSteepness ? (
            <div className="rounded-xl border border-[#C4A574] bg-[#FFF4D6] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#7a6248]">
                Stromizny
              </p>
              <ul className="mt-2 space-y-1.5">
                {climbs.slice(0, 3).map((climb) => (
                  <li
                    key={`${climb.code}-${climb.label}`}
                    className="flex justify-between gap-2 text-xs text-stone-700"
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
            <div className="hidden rounded-xl border border-dashed border-[#f0d4b8] bg-[#FFF4D6]/30 p-3 text-xs text-stone-500 md:flex md:items-center">
              Brak danych o nawierzchni / stromiźnie dla tej trasy.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default MapRouteDetailsBar
