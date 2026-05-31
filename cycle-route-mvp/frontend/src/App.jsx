import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { GeoJSON, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import ElevationChart from './ElevationChart'
import FloatingLines from './FloatingLines'
import { API_BASE } from './api'
import AuthModal from './AuthModal'
import { useAuth } from './useAuth'
import { downloadRouteAsGpx } from './exportToGpx'
import { openRouteInGoogleMaps } from './exportToGoogleMaps'
import SaveRouteModal from './SaveRouteModal'
import SavedRoutes from './SavedRoutes'
import { supabase } from './supabaseClient'

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

const getRouteSummary = (feature) => {
  const summary = feature?.properties?.summary
  const distanceMeters =
    typeof summary?.distance === 'number'
      ? summary.distance
      : typeof feature?.properties?.distance === 'number'
        ? feature.properties.distance
        : null
  const durationSeconds =
    typeof summary?.duration === 'number'
      ? summary.duration
      : typeof feature?.properties?.duration === 'number'
        ? feature.properties.duration
        : null

  if (distanceMeters === null || durationSeconds === null) return null

  return { distanceMeters, durationSeconds }
}

const formatDurationShort = (durationSeconds) => {
  const totalMinutes = Math.round(durationSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return `${hours} h ${minutes} min`
}

const SURFACE_LABELS = {
  0: 'Nieznana',
  1: 'Asfalt / utwardzona',
  2: 'Nieutwardzona',
  3: 'Asfalt',
  4: 'Beton',
  5: 'Kostka brukowa',
  6: 'Metal',
  7: 'Drewno',
  8: 'Ubity szuter',
  9: 'Drobny szuter',
  10: 'Szuter',
  11: 'Ziemia',
  12: 'Grunt',
  13: 'Lód',
  14: 'Kostka / płyty',
  15: 'Piasek',
  16: 'Wióry drzewne',
  17: 'Trawa',
  18: 'Płyty trawnikowe',
}

const SURFACE_COLORS = [
  'bg-emerald-500',
  'bg-lime-500',
  'bg-amber-600',
  'bg-stone-500',
  'bg-green-700',
  'bg-yellow-700',
]

const getLineCoordinates = (feature) => {
  const geometry = feature?.geometry
  if (!geometry) return []
  if (geometry.type === 'LineString') return geometry.coordinates
  if (geometry.type === 'MultiLineString') return geometry.coordinates.flat()
  return []
}

const pointFromCoordinate = (coordinate) => {
  if (!Array.isArray(coordinate) || coordinate.length < 2) return null
  return { lat: coordinate[1], lng: coordinate[0] }
}

function App() {
  const { user, isAuthenticated, logout } = useAuth()
  const plannerSectionRef = useRef(null)
  const [routeMode, setRouteMode] = useState('AtoB')
  const [startPoint, setStartPoint] = useState(null)
  const [endPoint, setEndPoint] = useState(null)
  const [startInput, setStartInput] = useState('')
  const [endInput, setEndInput] = useState('')
  const [loopDistanceKm, setLoopDistanceKm] = useState(() => {
    const savedLoopDistance = window.localStorage.getItem('loopDistanceKm')
    const numericValue = Number(savedLoopDistance)
    if (Number.isFinite(numericValue) && numericValue >= 5 && numericValue <= 100) {
      return numericValue
    }
    return 20
  })
  const [isSearchingStart, setIsSearchingStart] = useState(false)
  const [isSearchingEnd, setIsSearchingEnd] = useState(false)
  const [avoidMainRoads, setAvoidMainRoads] = useState(false)
  const [routeGeoJson, setRouteGeoJson] = useState(null)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [lockedPoint, setLockedPoint] = useState(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [error, setError] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showSaveRouteModal, setShowSaveRouteModal] = useState(false)
  const [savedRoutesRefreshKey, setSavedRoutesRefreshKey] = useState(0)
  const [isSavingRoute, setIsSavingRoute] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('')

  useEffect(() => {
    window.localStorage.setItem('loopDistanceKm', String(loopDistanceKm))
  }, [loopDistanceKm])

  const routeAlternatives = useMemo(() => {
    const features = Array.isArray(routeGeoJson?.features) ? routeGeoJson.features : []
    return features
      .map((feature, index) => {
        const summary = getRouteSummary(feature)
        if (!summary) return null
        return {
          index,
          distanceKm: (summary.distanceMeters / 1000).toFixed(1),
          durationLabel: formatDurationShort(summary.durationSeconds),
          durationSeconds: summary.durationSeconds,
        }
      })
      .filter(Boolean)
  }, [routeGeoJson])

  const selectedFeature = useMemo(() => {
    const features = Array.isArray(routeGeoJson?.features) ? routeGeoJson.features : []
    return features[selectedRouteIndex] || features[0] || null
  }, [routeGeoJson, selectedRouteIndex])

  const selectedRouteGeoJson = useMemo(() => {
    if (!selectedFeature) return null
    return {
      ...routeGeoJson,
      features: [selectedFeature],
    }
  }, [routeGeoJson, selectedFeature])

  const routeStats = useMemo(() => {
    const summary = getRouteSummary(selectedFeature)
    if (!summary) return null
    const distanceKm = (summary.distanceMeters / 1000).toFixed(1)
    const totalMinutes = Math.round(summary.durationSeconds / 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return { distanceKm, hours, minutes }
  }, [selectedFeature])

  const selectedRouteSurfaces = useMemo(() => {
    const summary = selectedFeature?.properties?.extras?.surface?.summary
    if (!Array.isArray(summary) || summary.length === 0) return []

    return summary
      .map((item, index) => {
        const code = item?.value
        const amount = typeof item?.amount === 'number' ? item.amount : null
        const distanceMeters = typeof item?.distance === 'number' ? item.distance : null
        if (amount === null || distanceMeters === null) return null

        return {
          code,
          label: SURFACE_LABELS[code] || `Typ ${code}`,
          percentage: Number(amount.toFixed(1)),
          distanceKm: (distanceMeters / 1000).toFixed(2),
          colorClass: SURFACE_COLORS[index % SURFACE_COLORS.length],
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.percentage - a.percentage)
  }, [selectedFeature])

  const requestRoute = async (start, end) => {
    setIsLoadingRoute(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start,
          end,
          profile: 'cycling-mountain',
          avoidMainRoads,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Route request failed.')
      }

      setRouteGeoJson(data)
      setSelectedRouteIndex(0)
    } catch (requestError) {
      setRouteGeoJson(null)
      setSelectedRouteIndex(0)
      setError(requestError.message || 'Unexpected route error.')
    } finally {
      setIsLoadingRoute(false)
    }
  }

  const mapSelectionLabel = (point) =>
    `Wybrano punkt na mapie [${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}]`

  const handleRouteModeChange = (nextMode) => {
    setRouteMode(nextMode)
    if (nextMode === 'Loop') {
      setEndPoint(null)
      setEndInput('')
    }
    setRouteGeoJson(null)
    setSelectedRouteIndex(0)
    setLockedPoint(null)
    setError('')
  }

  const clearCurrentPlan = () => {
    setStartPoint(null)
    setEndPoint(null)
    setStartInput('')
    setEndInput('')
    setRouteGeoJson(null)
    setSelectedRouteIndex(0)
    setError('')
  }

  const handlePointInputChange = (type, value) => {
    if (type === 'start') {
      setStartInput(value)
      setStartPoint(null)
    } else {
      setEndInput(value)
      setEndPoint(null)
    }

    setRouteGeoJson(null)
    setSelectedRouteIndex(0)
    setError('')
  }

  const geocodeAddress = async (type) => {
    const rawAddress = type === 'start' ? startInput : endInput
    const address = rawAddress.trim()

    if (!address) {
      setError('Wpisz adres przed wyszukaniem.')
      return
    }

    if (type === 'start') setIsSearchingStart(true)
    else setIsSearchingEnd(true)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE}/api/geocode?address=${encodeURIComponent(address)}`,
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Geocode request failed.')
      }

      const firstResult = data?.results?.[0]
      if (!firstResult) {
        throw new Error('Nie znaleziono wyników dla podanego adresu.')
      }

      const selectedPoint = { lat: firstResult.lat, lng: firstResult.lon }
      if (type === 'start') {
        setStartPoint(selectedPoint)
        setStartInput(firstResult.name)
        setLockedPoint(selectedPoint)
      } else {
        setEndPoint(selectedPoint)
        setEndInput(firstResult.name)
        setLockedPoint(selectedPoint)
      }
      setRouteGeoJson(null)
      setSelectedRouteIndex(0)
    } catch (requestError) {
      setError(requestError.message || 'Unexpected geocoding error.')
    } finally {
      if (type === 'start') setIsSearchingStart(false)
      else setIsSearchingEnd(false)
    }
  }

  const handleRouteSubmit = () => {
    if (!startPoint || !endPoint) {
      setError('Najpierw wybierz punkt początkowy i końcowy.')
      return
    }
    requestRoute(startPoint, endPoint)
  }

  const handleLoopSubmit = async () => {
    if (!startPoint) {
      setError('Najpierw wybierz punkt startowy pętli.')
      return
    }

    setIsLoadingRoute(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/api/loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: startPoint,
          distance: loopDistanceKm,
          avoidMainRoads,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Loop generation request failed.')
      }

      setRouteGeoJson(data)
      setSelectedRouteIndex(0)
    } catch (requestError) {
      setRouteGeoJson(null)
      setSelectedRouteIndex(0)
      setError(requestError.message || 'Unexpected loop generation error.')
    } finally {
      setIsLoadingRoute(false)
    }
  }

  const handleExportToGoogleMaps = () => {
    if (!selectedFeature) {
      setError('Najpierw wyznacz trasę, aby wyeksportować ją do Google Maps.')
      return
    }

    try {
      openRouteInGoogleMaps(selectedFeature)
    } catch (exportError) {
      setError(exportError.message || 'Nie udało się otworzyć trasy w Google Maps.')
    }
  }

  const handleSaveRouteClick = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    if (!routeGeoJson?.features?.length) {
      setError('Najpierw wyznacz trasę do zapisania.')
      return
    }

    setSaveSuccessMessage('')
    setShowSaveRouteModal(true)
  }

  const handleSaveRouteConfirm = async (name) => {
    setIsSavingRoute(true)
    setError('')
    setSaveSuccessMessage('')

    try {
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !authUser) {
        throw new Error('Sesja wygasła. Zaloguj się ponownie.')
      }

      const feature = selectedFeature ?? routeGeoJson?.features?.[0]
      const summary = feature?.properties?.summary
      const distanceMeters =
        typeof summary?.distance === 'number'
          ? summary.distance
          : typeof feature?.properties?.distance === 'number'
            ? feature.properties.distance
            : null
      const durationSeconds =
        typeof summary?.duration === 'number'
          ? summary.duration
          : typeof feature?.properties?.duration === 'number'
            ? feature.properties.duration
            : null

      const { error: saveError } = await supabase.from('saved_routes').insert({
        user_id: authUser.id,
        name: name.trim(),
        mode: routeMode,
        geojson: routeGeoJson,
        distance_km:
          distanceMeters != null
            ? Math.round((distanceMeters / 1000) * 100) / 100
            : null,
        duration_seconds:
          durationSeconds != null ? Math.round(durationSeconds) : null,
      })

      if (saveError) throw new Error(saveError.message)

      setSavedRoutesRefreshKey((current) => current + 1)
      setSaveSuccessMessage(`Zapisano trasę „${name}”.`)
      setShowSaveRouteModal(false)
    } catch (saveError) {
      setError(saveError.message || 'Nie udało się zapisać trasy.')
    } finally {
      setIsSavingRoute(false)
    }
  }

  const handleLoadSavedRoute = (savedRoute) => {
    const geojson = savedRoute?.geojson
    const feature = geojson?.features?.[0]
    if (!feature) {
      setError('Zapisana trasa nie zawiera poprawnych danych.')
      return
    }

    const coordinates = getLineCoordinates(feature)
    const start = pointFromCoordinate(coordinates[0])
    const end = pointFromCoordinate(coordinates[coordinates.length - 1])

    setRouteMode(savedRoute.mode)
    setRouteGeoJson(geojson)
    setSelectedRouteIndex(0)
    setLockedPoint(null)
    setError('')

    if (start) {
      setStartPoint(start)
      setStartInput(
        `Wczytana trasa [${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}]`,
      )
    }

    if (savedRoute.mode === 'AtoB' && end) {
      setEndPoint(end)
      setEndInput(`Koniec trasy [${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}]`)
    } else {
      setEndPoint(null)
      setEndInput('')
    }
  }

  const handleExportToGpx = () => {
    if (!selectedFeature) {
      setError('Najpierw wyznacz trasę, aby pobrać plik GPX.')
      return
    }

    try {
      downloadRouteAsGpx(selectedFeature, {
        routeMode,
        trackName:
          routeMode === 'Loop'
            ? 'Cycle Your Way - pętla treningowa'
            : `Cycle Your Way - trasa ${selectedRouteIndex + 1}`,
      })
    } catch (exportError) {
      setError(exportError.message || 'Nie udało się wyeksportować trasy do GPX.')
    }
  }

  const handleMapClick = (latlng) => {
    if (routeGeoJson && routeMode === 'AtoB') {
      return
    }

    const clickedPoint = { lat: latlng.lat, lng: latlng.lng }
    if (routeMode === 'Loop') {
      setStartPoint(clickedPoint)
      setStartInput(mapSelectionLabel(clickedPoint))
      setLockedPoint(clickedPoint)
      setRouteGeoJson(null)
      setSelectedRouteIndex(0)
      setError('')
      return
    }

    if (!startPoint || (startPoint && endPoint)) {
      setStartPoint(clickedPoint)
      setStartInput(mapSelectionLabel(clickedPoint))
      setLockedPoint(clickedPoint)
      setEndPoint(null)
      setEndInput('')
      setRouteGeoJson(null)
      setSelectedRouteIndex(0)
      setError('')
      return
    }

    setEndPoint(clickedPoint)
    setEndInput(mapSelectionLabel(clickedPoint))
    setLockedPoint(clickedPoint)
    setRouteGeoJson(null)
    setSelectedRouteIndex(0)
    setError('')
  }

  const scrollToPlanner = () => {
    plannerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const accountBar = (
    <div className="soft-panel flex items-center justify-between gap-3 rounded-xl border border-[#e8dfcf] bg-[#fcfaf5] px-4 py-3 text-sm">
      {isAuthenticated ? (
        <>
          <p className="min-w-0 truncate text-stone-700" title={user?.email}>
            <span className="font-medium text-[#2e5f43]">Konto:</span> {user?.email}
          </p>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded-lg border border-[#dfd4c2] bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-[#f3ede2]"
          >
            Wyloguj
          </button>
        </>
      ) : (
        <>
          <p className="text-xs leading-5 text-stone-600">
            Zaloguj się, aby zapisywać trasy.
          </p>
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="shrink-0 rounded-lg bg-[#3f7b57] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#356b4b]"
          >
            Konto
          </button>
        </>
      )}
    </div>
  )

  return (
    <div className="relative w-full overflow-x-hidden bg-transparent text-stone-800">
      <div className="pointer-events-none fixed inset-0 z-0">
        <FloatingLines
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={10}
          lineDistance={9}
          bendRadius={10}
          bendStrength={-2.4}
          interactive
          parallax
          animationSpeed={0.95}
          gradientStart="#cfe7d2"
          gradientMid="#56775b"
          gradientEnd="#8e6f4f"
        />
      </div>

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4 md:px-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2e5f43]">
          Cycle Your Way
        </p>
        <div className="max-w-xs flex-1">{accountBar}</div>
      </header>

      <section className="relative z-10 mx-auto min-h-[88vh] w-full max-w-6xl px-6 py-10 md:px-10 md:py-12">
        <div className="soft-panel relative flex min-h-[620px] items-center justify-center overflow-hidden rounded-3xl border border-[#e6dccb] bg-[rgba(247,242,233,0.74)] p-8 text-center shadow-[0_18px_45px_rgba(95,74,53,0.14)] backdrop-blur-[2px]">
          <div className="relative mx-auto max-w-3xl">
            <p className="mb-4 inline-block rounded-full border border-emerald-200/70 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 backdrop-blur-sm">
              Cycle Your Way
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-[#2e5f43] md:text-5xl">
              Zaplanuj trasę rowerową, która naprawdę płynie.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-700 md:text-lg">
              Twórz klasyczne trasy A-B lub treningowe pętle, analizuj elewację i nawierzchnię,
              a potem eksportuj wszystko do Google Maps lub GPX.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={scrollToPlanner}
                className="soft-button rounded-xl bg-[#3f7b57] px-6 py-3 text-sm font-semibold text-white hover:bg-[#356b4b]"
              >
                Rozpocznij planowanie
              </button>
              <button
                type="button"
                onClick={scrollToPlanner}
                className="soft-button rounded-xl border border-[#d8cbb7] bg-white/90 px-6 py-3 text-sm font-semibold text-stone-700 hover:bg-[#f3ede2]"
              >
                Utwórz trasę
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-12 md:px-10">
        <div className="soft-panel rounded-2xl border border-[#e3d9c8] bg-white/80 p-6 text-center md:p-8">
          <h2 className="text-2xl font-semibold text-[#2e5f43]">Jak utworzyć trasę? (krok po kroku)</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[#ece3d4] bg-[#fcfaf5] p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Krok 1</p>
              <p className="mt-2 text-sm text-stone-700">
                Wybierz tryb: <strong>A do B</strong> albo <strong>Pętla treningowa</strong>.
              </p>
            </div>
            <div className="rounded-xl border border-[#ece3d4] bg-[#fcfaf5] p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Krok 2</p>
              <p className="mt-2 text-sm text-stone-700">
                Ustaw punkty na mapie lub wpisz adresy, a potem kliknij przycisk wyznaczania.
              </p>
            </div>
            <div className="rounded-xl border border-[#ece3d4] bg-[#fcfaf5] p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Krok 3</p>
              <p className="mt-2 text-sm text-stone-700">
                Sprawdź statystyki, elewację i nawierzchnię, a na końcu eksportuj trasę.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={scrollToPlanner}
            className="soft-button mt-6 rounded-xl bg-[#7a6248] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6c563f]"
          >
            Przejdź do tworzenia trasy
          </button>
        </div>
      </section>

      <section ref={plannerSectionRef} className="relative z-10 px-3 pb-3 md:px-5 md:pb-5">
        <div className="flex h-[calc(100vh-1.5rem)] min-h-[680px] w-full flex-col overflow-hidden rounded-2xl bg-[#f7f5ef] text-stone-800 shadow-[0_10px_28px_rgba(95,74,53,0.12)] md:flex-row">
      <aside className="flex h-full min-h-0 w-full flex-col border-r border-[#e9e1d2] bg-white/95 shadow-[0_12px_44px_rgba(95,74,53,0.12)] backdrop-blur-sm md:w-[26rem] md:shrink-0">
        <div className="shrink-0 space-y-4 border-b border-[#ebe3d6] p-6 pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#2e5f43]">
              Planer tras
            </h1>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Ustaw punkty, wyznacz trasę i zapisz ją na koncie.
            </p>
          </div>

          {accountBar}

          {saveSuccessMessage && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              {saveSuccessMessage}
            </p>
          )}

          <SavedRoutes
            onLoadRoute={handleLoadSavedRoute}
            refreshKey={savedRoutesRefreshKey}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-4">
          <div className="soft-panel mb-4 grid grid-cols-2 rounded-xl border border-[#eadfcf] bg-[#f4efe6] p-1">
            <button
              type="button"
              onClick={() => handleRouteModeChange('AtoB')}
              className={`soft-button rounded-lg px-3 py-2 text-sm font-medium transition ${
                routeMode === 'AtoB'
                  ? 'bg-white text-[#2e5f43] shadow-sm'
                  : 'text-stone-600 hover:text-[#6f553b]'
              }`}
            >
              Trasa z A do B
            </button>
            <button
              type="button"
              onClick={() => handleRouteModeChange('Loop')}
              className={`soft-button rounded-lg px-3 py-2 text-sm font-medium transition ${
                routeMode === 'Loop'
                  ? 'bg-white text-[#2e5f43] shadow-sm'
                  : 'text-stone-600 hover:text-[#6f553b]'
              }`}
            >
              Pętla treningowa
            </button>
          </div>

          <div className="soft-panel space-y-4 rounded-xl border border-[#e8dfcf] bg-[#fcfaf5] p-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#dfd4c2] bg-white px-3 py-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={avoidMainRoads}
                onChange={(event) => setAvoidMainRoads(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#3f7b57]"
              />
              <span>
                Unikaj dróg głównych
                <span className="mt-1 block text-xs font-normal text-stone-500">
                  Wybieramy trasę z najmniejszym udziałem dróg głównych (gdy pełne
                  uniknięcie nie jest możliwe).
                </span>
              </span>
            </label>

            {routeMode === 'AtoB' ? (
              <>
                <div>
                  <label
                    htmlFor="start-point-input"
                    className="mb-1 block text-sm font-medium text-stone-700"
                  >
                    Punkt początkowy
                    {startPoint && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Ustawiony
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="start-point-input"
                      type="text"
                      value={startInput}
                      onChange={(event) =>
                        handlePointInputChange('start', event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') geocodeAddress('start')
                      }}
                      placeholder="Wpisz adres lub kliknij mapę"
                      className="w-full rounded-lg border border-[#dbcdb8] bg-white px-3 py-2 text-sm outline-none ring-[#83a58b] transition focus:ring-2"
                    />
                    <button
                      type="button"
                      onClick={() => geocodeAddress('start')}
                      disabled={isSearchingStart}
                      className="soft-button rounded-lg bg-[#3f7b57] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#356b4b] disabled:cursor-not-allowed disabled:bg-[#9ab3a1]"
                    >
                      {isSearchingStart ? '...' : 'Szukaj'}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="end-point-input"
                    className="mb-1 block text-sm font-medium text-stone-700"
                  >
                    Punkt końcowy
                    {endPoint && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Ustawiony
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="end-point-input"
                      type="text"
                      value={endInput}
                      onChange={(event) => handlePointInputChange('end', event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') geocodeAddress('end')
                      }}
                      placeholder="Wpisz adres lub kliknij mapę"
                      className="w-full rounded-lg border border-[#dbcdb8] bg-white px-3 py-2 text-sm outline-none ring-[#83a58b] transition focus:ring-2"
                    />
                    <button
                      type="button"
                      onClick={() => geocodeAddress('end')}
                      disabled={isSearchingEnd}
                      className="soft-button rounded-lg bg-[#3f7b57] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#356b4b] disabled:cursor-not-allowed disabled:bg-[#9ab3a1]"
                    >
                      {isSearchingEnd ? '...' : 'Szukaj'}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRouteSubmit}
                  disabled={!startPoint || !endPoint || isLoadingRoute}
                  className="soft-button w-full rounded-xl bg-[#3f7b57] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#356b4b] disabled:cursor-not-allowed disabled:bg-[#9ab3a1]"
                >
                  {isLoadingRoute ? 'Wyznaczanie trasy...' : 'Wyznacz trasę'}
                </button>
                <button
                  type="button"
                  onClick={clearCurrentPlan}
                  className="soft-button w-full rounded-xl border border-[#d8cbb7] bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-[#f3ede2]"
                >
                  Wyczyść
                </button>
              </>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="loop-start-point-input"
                    className="mb-1 block text-sm font-medium text-stone-700"
                  >
                    Punkt startowy pętli
                    {startPoint && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Ustawiony
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="loop-start-point-input"
                      type="text"
                      value={startInput}
                      onChange={(event) =>
                        handlePointInputChange('start', event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') geocodeAddress('start')
                      }}
                      placeholder="Wpisz adres lub kliknij mapę"
                      className="w-full rounded-lg border border-[#dbcdb8] bg-white px-3 py-2 text-sm outline-none ring-[#83a58b] transition focus:ring-2"
                    />
                    <button
                      type="button"
                      onClick={() => geocodeAddress('start')}
                      disabled={isSearchingStart}
                      className="soft-button rounded-lg bg-[#3f7b57] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#356b4b] disabled:cursor-not-allowed disabled:bg-[#9ab3a1]"
                    >
                      {isSearchingStart ? '...' : 'Szukaj'}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-sm font-medium text-stone-700">
                    <label htmlFor="loop-distance-range">Dystans pętli</label>
                    <span className="rounded-md bg-white px-2 py-1 text-[#2e5f43] shadow-sm">
                      {loopDistanceKm} km
                    </span>
                  </div>
                  <input
                    id="loop-distance-range"
                    type="range"
                    min={5}
                    max={100}
                    step={1}
                    value={loopDistanceKm}
                    onChange={(event) => setLoopDistanceKm(Number(event.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#d9e6dc]"
                  />
                  <div className="mt-1 flex justify-between text-xs text-stone-500">
                    <span>5 km</span>
                    <span>100 km</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLoopSubmit}
                  disabled={!startPoint || isLoadingRoute}
                  className="soft-button w-full rounded-xl bg-[#7a6248] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#6c563f] disabled:cursor-not-allowed disabled:bg-[#b8a493]"
                >
                  {isLoadingRoute ? 'Generowanie pętli...' : 'Wygeneruj pętlę'}
                </button>
                <button
                  type="button"
                  onClick={clearCurrentPlan}
                  className="soft-button w-full rounded-xl border border-[#d8cbb7] bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-[#f3ede2]"
                >
                  Wyczyść
                </button>
              </>
            )}

            {routeAlternatives.length > 1 && (
              <div className="soft-panel rounded-xl border border-emerald-100 bg-[#f4faf4] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Dostępne trasy
                </p>
                <div className="mt-2 space-y-2">
                  {routeAlternatives.map((routeOption) => (
                    <button
                      key={routeOption.index}
                      type="button"
                      onClick={() => setSelectedRouteIndex(routeOption.index)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                        selectedRouteIndex === routeOption.index
                          ? 'border-emerald-500 bg-white text-emerald-800'
                          : 'border-emerald-200 bg-[#f4faf4] text-stone-700 hover:bg-white'
                      }`}
                    >
                      Trasa {routeOption.index + 1}: {routeOption.durationLabel} ({routeOption.distanceKm} km)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {routeStats && (
              <div className="soft-panel rounded-xl border border-emerald-100 bg-[#f5fbf6] p-4 text-sm text-stone-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Statystyki trasy
                </p>
                <p className="mt-2">
                  Dystans: <span className="font-semibold">{routeStats.distanceKm} km</span>
                </p>
                <p className="mt-1">
                  Czas: <span className="font-semibold">{routeStats.hours} h {routeStats.minutes} min</span>
                </p>
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={handleExportToGoogleMaps}
                    className="soft-button w-full rounded-xl border border-[#d8cbb7] bg-white px-4 py-2.5 text-sm font-semibold text-[#2e5f43] transition hover:bg-[#f3ede2]"
                  >
                    Otwórz w Google Maps
                  </button>
                  <button
                    type="button"
                    onClick={handleExportToGpx}
                    className="soft-button w-full rounded-xl bg-[#7a6248] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6c563f]"
                  >
                    Pobierz GPX
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRouteClick}
                    disabled={isSavingRoute}
                    className="soft-button w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    {isSavingRoute
                      ? 'Zapisywanie...'
                      : isAuthenticated
                        ? 'Zapisz trasę'
                        : 'Zapisz trasę (wymaga konta)'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  Google: do ok. 10 punktów (przybliżenie). GPX: pełna trasa 1:1 do nawigacji
                  (Komoot, Garmin, Strava itd.).
                </p>
              </div>
            )}

            {selectedRouteGeoJson && <ElevationChart routeData={selectedRouteGeoJson} />}

            {selectedRouteSurfaces.length > 0 && (
              <div className="soft-panel rounded-xl border border-[#e7dbc9] bg-[#faf7f1] p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7a6248]">
                  Nawierzchnia trasy
                </p>
                <div className="mt-3 space-y-3">
                  {selectedRouteSurfaces.map((surface) => (
                    <div key={`${surface.code}-${surface.label}`}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-stone-700">
                        <span className="font-medium">{surface.label}</span>
                        <span>{surface.percentage}% ({surface.distanceKm} km)</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-[#efe6d8]">
                        <div
                          className={`h-2.5 rounded-full ${surface.colorClass}`}
                          style={{ width: `${surface.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 p-6 pt-0">
          <div className="soft-panel rounded-xl border border-[#e8dfcf] bg-[#fcfaf5] p-4 text-sm text-stone-700">
            {isLoadingRoute && <p className="font-medium">Wyznaczanie trasy...</p>}
            {!isLoadingRoute && !startPoint && routeMode === 'AtoB' && (
              <p>Kliknij mapę, aby wybrać punkt startowy.</p>
            )}
            {!isLoadingRoute && startPoint && !endPoint && routeMode === 'AtoB' && (
              <p>Kliknij drugi raz, aby wybrać punkt końcowy.</p>
            )}
            {!isLoadingRoute && routeMode === 'Loop' && !startPoint && (
              <p>Kliknij mapę lub wpisz adres, aby ustawić punkt startowy pętli.</p>
            )}
            {!isLoadingRoute && routeMode === 'Loop' && startPoint && (
              <p>Ustaw dystans i kliknij „Wygeneruj pętlę”.</p>
            )}
            {error && <p className="mt-2 font-medium text-rose-700">{error}</p>}
          </div>
        </div>
      </aside>

      <div className="relative min-h-[320px] flex-1 md:min-h-0">
        <MapContainer
          center={[52.0, 19.2]}
          zoom={6}
          scrollWheelZoom
          className="h-full w-full"
        >
          <MapClickHandler onMapClick={handleMapClick} />
          <FocusOnLockedPoint lockedPoint={lockedPoint} disabled={Boolean(selectedRouteGeoJson)} />
          <RouteFitBounds routeGeoJson={selectedRouteGeoJson} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {startPoint && <Marker position={[startPoint.lat, startPoint.lng]} />}
          {routeMode === 'AtoB' && endPoint && <Marker position={[endPoint.lat, endPoint.lng]} />}
          {routeGeoJson?.features?.map((feature, index) => (
            <GeoJSON
              key={`route-${index}`}
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
        </div>
      </section>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <SaveRouteModal
        key={showSaveRouteModal ? 'save-open' : 'save-closed'}
        isOpen={showSaveRouteModal}
        defaultName={`Trasa ${new Date().toLocaleDateString('pl-PL')}`}
        isSaving={isSavingRoute}
        onClose={() => setShowSaveRouteModal(false)}
        onSave={handleSaveRouteConfirm}
      />
    </div>
  )
}

export default App
