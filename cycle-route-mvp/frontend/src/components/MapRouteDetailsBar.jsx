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
}) {
  if (!routeStats || !selectedRouteGeoJson) return null

  const elevationGain = getElevationGainMeters(selectedFeature)
  const knownSurfaces = Array.isArray(surfaces) ? surfaces : surfaces.known || []
  const unknownPercent = Array.isArray(surfaces)
    ? null
    : surfaces.unknownPercent
  const hasSurfaceInfo = knownSurfaces.length > 0 || unknownPercent != null

  return (
    <div className="shrink-0 border-t border-[#e8e2d6] bg-white/95 backdrop-blur-sm">
      <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,12rem)] md:items-stretch md:gap-4 md:p-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-100 bg-[#f5fbf6] px-3 py-3 md:flex-col md:items-stretch md:justify-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Dystans
            </p>
            <p className="text-lg font-semibold text-[#2e5f43]">
              {routeStats.distanceKm} km
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Czas
            </p>
            <p className="text-lg font-semibold text-[#2e5f43]">
              {routeStats.hours > 0
                ? `${routeStats.hours} h ${routeStats.minutes} min`
                : `${routeStats.minutes} min`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Wznios
            </p>
            <p className="text-lg font-semibold text-[#2e5f43]">
              {elevationGain == null ? '—' : `${Math.round(elevationGain)} m`}
            </p>
          </div>
        </div>

        <div className="min-h-[140px] overflow-hidden rounded-xl border border-[#e7dbc9] bg-[#faf7f1] md:min-h-[160px]">
          <Suspense
            fallback={
              <ChunkFallback
                label="Profil wysokości…"
                className="min-h-[140px] bg-transparent md:min-h-[160px]"
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

        {hasSurfaceInfo ? (
          <div className="max-h-[160px] overflow-y-auto rounded-xl border border-[#e7dbc9] bg-[#faf7f1] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7a6248]">
              Nawierzchnia
            </p>
            <div className="mt-2 space-y-2">
              {knownSurfaces.slice(0, 4).map((surface) => (
                <div key={`${surface.code}-${surface.label}`}>
                  <div className="mb-0.5 flex justify-between gap-2 text-[11px] text-stone-700">
                    <span className="truncate font-medium">{surface.label}</span>
                    <span className="shrink-0">{surface.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#efe6d8]">
                    <div
                      className={`h-1.5 rounded-full ${surface.colorClass}`}
                      style={{ width: `${surface.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {unknownPercent != null && unknownPercent > 0 && (
              <p className="mt-2 border-t border-[#eadfcf] pt-2 text-[10px] leading-4 text-stone-500">
                {unknownPercent}% trasy bez tagu nawierzchni w OpenStreetMap —
                nie znaczy to „zła droga”, tylko brak danych w mapie.
              </p>
            )}
          </div>
        ) : (
          <div className="hidden rounded-xl border border-dashed border-[#e7dbc9] bg-[#faf7f1]/30 p-3 text-xs text-stone-500 md:flex md:items-center">
            Brak danych o nawierzchni dla tej trasy.
          </div>
        )}
      </div>
    </div>
  )
}

export default MapRouteDetailsBar
