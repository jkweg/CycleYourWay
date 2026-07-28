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
    <div className="shrink-0 border-t border-[#C4A574] bg-[#F5E6C0]">
      {showAsphaltWarning && (
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-1 text-[11px] text-amber-900 md:px-3">
          Preferujesz asfalt, a wybrana trasa ma ok. {asphaltSharePercent}% asfaltu
          w danych mapy.
        </p>
      )}
      {preferAsphalt && asphaltSharePercent != null && asphaltSharePercent >= 85 && (
        <p className="border-b border-orange-100 bg-orange-50 px-3 py-1 text-[11px] text-orange-950 md:px-3">
          Asfalt według mapy: ok. {asphaltSharePercent}% trasy.
        </p>
      )}

      <div className="flex flex-col gap-2 p-2 md:flex-row md:items-start md:gap-2 md:p-2">
        <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1 rounded-lg border border-orange-100 bg-[#FFF4D6] px-2.5 py-1.5 sm:grid-cols-4 md:w-[13.5rem] md:grid-cols-2">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-orange-800">
              Dystans
            </p>
            <p className="text-sm font-semibold tabular-nums text-[#FC6C26]">
              {routeStats.distanceKm} km
            </p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-orange-800">
              Czas
            </p>
            <p className="text-sm font-semibold tabular-nums text-[#FC6C26]">{timeLabel}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-orange-800">
              Wznios
            </p>
            <p className="text-sm font-semibold tabular-nums text-[#FC6C26]">
              {elevationGain == null ? '—' : `${Math.round(elevationGain)} m`}
            </p>
          </div>
          {steepness?.totalClimbPercent != null && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-orange-800">
                Podjazdy
              </p>
              <p className="text-sm font-semibold tabular-nums text-[#FC6C26]">
                {steepness.totalClimbPercent}%
              </p>
            </div>
          )}
        </div>

        <div className="h-[88px] min-h-0 flex-1 overflow-hidden rounded-lg border border-[#C4A574] bg-[#FFF4D6] md:h-[84px]">
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

        <div className="grid shrink-0 gap-2 sm:grid-cols-2 md:w-[17rem] md:grid-cols-1 md:gap-1.5">
          {hasSurfaceInfo ? (
            <div className="rounded-lg border border-[#C4A574] bg-[#FFF4D6] px-2 py-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-[#7a6248]">
                Nawierzchnia
              </p>
              <div className="mt-1 space-y-1">
                {knownSurfaces.slice(0, 3).map((surface) => (
                  <div key={`${surface.code}-${surface.label}`}>
                    <div className="mb-0.5 flex justify-between gap-2 text-[11px] leading-4 text-stone-700">
                      <span className="truncate">{surface.label}</span>
                      <span className="shrink-0 tabular-nums font-semibold text-[#FC6C26]">
                        {surface.percentage}%
                      </span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-[#f5e6c0]">
                      <div
                        className={`h-1 rounded-full ${surface.colorClass}`}
                        style={{ width: `${surface.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {hasSteepness ? (
            <div className="rounded-lg border border-[#C4A574] bg-[#FFF4D6] px-2 py-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-[#7a6248]">
                Stromizny
              </p>
              <ul className="mt-1 space-y-0.5">
                {climbs.slice(0, 2).map((climb) => (
                  <li
                    key={`${climb.code}-${climb.label}`}
                    className="flex justify-between gap-2 text-[11px] leading-4 text-stone-700"
                  >
                    <span className="truncate">{climb.label}</span>
                    <span className="shrink-0 tabular-nums text-[#FC6C26]">
                      {climb.percentage}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : !hasSurfaceInfo ? (
            <div className="hidden rounded-lg border border-dashed border-[#f0d4b8] bg-[#FFF4D6]/30 px-2 py-1.5 text-[11px] text-stone-500 md:block">
              Brak danych o nawierzchni / stromiźnie.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default MapRouteDetailsBar
