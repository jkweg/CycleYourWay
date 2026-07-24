/** Porównanie wariantów tras A→B. */
function RouteAlternativesCompare({ alternatives, selectedIndex, onSelect }) {
  if (!Array.isArray(alternatives) || alternatives.length <= 1) return null

  const bestDistance = Math.min(...alternatives.map((a) => a.distanceKm))
  const bestDuration = Math.min(...alternatives.map((a) => a.durationSeconds))
  const bestMainRoad = Math.min(
    ...alternatives
      .map((a) => a.mainRoadShare)
      .filter((v) => typeof v === 'number'),
  )

  return (
    <div className="soft-panel rounded-xl border border-orange-100 bg-[#FFF4D6] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">
        Porównanie wariantów
      </p>
      <p className="mt-1 text-xs text-stone-500">
        Wybierz trasę — mapa i wykres aktualizują się od razu.
      </p>
      <div className="mt-3 grid gap-2">
        {alternatives.map((option) => {
          const isSelected = selectedIndex === option.index
          const isShortest = option.distanceKm === bestDistance
          const isFastest = option.durationSeconds === bestDuration
          const isQuietest =
            typeof option.mainRoadShare === 'number' &&
            option.mainRoadShare === bestMainRoad

          return (
            <button
              key={option.index}
              type="button"
              onClick={() => onSelect(option.index)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                isSelected
                  ? 'border-orange-500 bg-[#FFF8E8] text-orange-950 shadow-sm ring-1 ring-orange-200'
                  : 'border-orange-200 bg-[#FFF4D6] text-stone-700 hover:bg-[#FFF8E8]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">Trasa {option.index + 1}</span>
                <span className="text-xs text-stone-500">{option.durationLabel}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] leading-4 text-stone-600">
                <div>
                  <p className="uppercase tracking-wide text-stone-400">Dystans</p>
                  <p className="font-semibold text-stone-800">{option.distanceKm} km</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-stone-400">Drogi gł.</p>
                  <p className="font-semibold text-stone-800">
                    {option.mainRoadShare == null ? '—' : `${option.mainRoadShare}%`}
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-stone-400">Wznios</p>
                  <p className="font-semibold text-stone-800">
                    {option.elevationGain == null ? '—' : `${option.elevationGain} m`}
                  </p>
                </div>
              </div>
              {(isShortest || isFastest || isQuietest) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {isShortest && (
                    <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-900">
                      Najkrótsza
                    </span>
                  )}
                  {isFastest && (
                    <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                      Najszybsza
                    </span>
                  )}
                  {isQuietest && (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                      Mniej dróg gł.
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default RouteAlternativesCompare
