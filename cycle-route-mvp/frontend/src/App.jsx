import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { GeoJSON, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import ElevationChart from './ElevationChart'
import FloatingLines from './FloatingLines'
import { API_BASE } from './api'
import AuthModal from './AuthModal'
import { useAuth } from './useAuth'
import { downloadRouteAsGpx } from './exportToGpx'
import { buildGoogleMapsDirectionsUrl, openRouteInGoogleMaps } from './exportToGoogleMaps'
import SaveRouteModal from './SaveRouteModal'
import GoogleMapsExportNoticeModal from './GoogleMapsExportNoticeModal'
import OpenOnPhoneModal from './OpenOnPhoneModal'
import RideView from './RideView'
import SavedRoutes from './SavedRoutes'
import { supabase } from './supabaseClient'
import Footer from './components/Footer'
import LandingPage from './components/LandingPage'
import Navbar from './components/Navbar'
import AddressAutocomplete from './components/AddressAutocomplete'
import PlannerSidebar from './components/PlannerSidebar'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

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
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth()
  const plannerSectionRef = useRef(null)
  const savedRoutesRef = useRef(null)
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
  const [isLocating, setIsLocating] = useState(false)
  const [avoidMainRoads, setAvoidMainRoads] = useState(false)
  const [routeGeoJson, setRouteGeoJson] = useState(null)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [lockedPoint, setLockedPoint] = useState(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [error, setError] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showSaveRouteModal, setShowSaveRouteModal] = useState(false)
  const [showGoogleMapsExportNotice, setShowGoogleMapsExportNotice] = useState(false)
  const [savedRoutesRefreshKey, setSavedRoutesRefreshKey] = useState(0)
  const [loadedSavedRouteId, setLoadedSavedRouteId] = useState(null)
  const [loadedSavedRouteName, setLoadedSavedRouteName] = useState('')
  const [showOpenOnPhone, setShowOpenOnPhone] = useState(false)
  const [openOnPhoneTarget, setOpenOnPhoneTarget] = useState(null)
  const [rideRoute, setRideRoute] = useState(null)
  const [pendingRideId, setPendingRideId] = useState(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('ride')
  })
  const [routeDisplayKey, setRouteDisplayKey] = useState(0)
  const [isSavingRoute, setIsSavingRoute] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('')
  const [view, setView] = useState('landing')
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

      setLoadedSavedRouteId(null)
      setRouteGeoJson(data)
      setSelectedRouteIndex(0)
      bumpRouteDisplay()
    } catch (requestError) {
      setRouteGeoJson(null)
      setSelectedRouteIndex(0)
      setLoadedSavedRouteId(null)
      bumpRouteDisplay()
      setError(requestError.message || 'Unexpected route error.')
    } finally {
      setIsLoadingRoute(false)
    }
  }

  const mapSelectionLabel = (point) =>
    `Wybrano punkt na mapie [${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}]`

  const bumpRouteDisplay = () => {
    setRouteDisplayKey((current) => current + 1)
  }

  const cloneGeoJson = (geojson) => {
    try {
      return structuredClone(geojson)
    } catch {
      return JSON.parse(JSON.stringify(geojson))
    }
  }

  const handleRouteModeChange = (nextMode) => {
    setRouteMode(nextMode)
    if (nextMode === 'Loop') {
      setEndPoint(null)
      setEndInput('')
    }
    setRouteGeoJson(null)
    setSelectedRouteIndex(0)
    setLockedPoint(null)
    setLoadedSavedRouteId(null)
    bumpRouteDisplay()
    setError('')
  }

  const clearCurrentPlan = () => {
    setStartPoint(null)
    setEndPoint(null)
    setStartInput('')
    setEndInput('')
    setLockedPoint(null)
    setRouteGeoJson(null)
    setSelectedRouteIndex(0)
    setLoadedSavedRouteId(null)
    setLoadedSavedRouteName('')
    bumpRouteDisplay()
    setSaveSuccessMessage('')
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

  const applyGeocodeResult = (type, result) => {
    const selectedPoint = { lat: result.lat, lng: result.lon }
    if (type === 'start') {
      setStartPoint(selectedPoint)
      setStartInput(result.name)
      setLockedPoint(selectedPoint)
    } else {
      setEndPoint(selectedPoint)
      setEndInput(result.name)
      setLockedPoint(selectedPoint)
    }
    setRouteGeoJson(null)
    setSelectedRouteIndex(0)
    setError('')
  }

  const handleUseMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Twoja przeglądarka nie udostępnia lokalizacji.')
      return
    }

    setIsLocating(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setStartPoint(point)
        setStartInput('Moja lokalizacja')
        setLockedPoint(point)
        if (routeMode === 'AtoB') {
          setEndPoint(null)
          setEndInput('')
        }
        setRouteGeoJson(null)
        setSelectedRouteIndex(0)
        setLoadedSavedRouteId(null)
        setLoadedSavedRouteName('')
        bumpRouteDisplay()
        setIsLocating(false)
      },
      (geoError) => {
        const message =
          geoError?.code === 1
            ? 'Brak zgody na lokalizację. Zezwól na dostęp do GPS w przeglądarce.'
            : geoError?.code === 2
              ? 'Nie udało się ustalić pozycji. Sprawdź sygnał GPS.'
              : geoError?.code === 3
                ? 'Przekroczono czas oczekiwania na GPS.'
                : 'Nie udało się pobrać lokalizacji.'
        setError(message)
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )
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
        `${API_BASE}/api/geocode?address=${encodeURIComponent(address)}&limit=1`,
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Geocode request failed.')
      }

      const firstResult = data?.results?.[0]
      if (!firstResult) {
        throw new Error('Nie znaleziono wyników dla podanego adresu.')
      }

      applyGeocodeResult(type, firstResult)
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

      setLoadedSavedRouteId(null)
      setRouteGeoJson(data)
      setSelectedRouteIndex(0)
      bumpRouteDisplay()
    } catch (requestError) {
      setRouteGeoJson(null)
      setSelectedRouteIndex(0)
      setLoadedSavedRouteId(null)
      bumpRouteDisplay()
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

    const coordinates = selectedFeature?.geometry?.coordinates
    const url = buildGoogleMapsDirectionsUrl(coordinates)
    if (!url) {
      setError('Nie udało się przygotować linku do Google Maps.')
      return
    }

    setShowGoogleMapsExportNotice(true)
  }

  const handleConfirmGoogleMapsExport = () => {
    if (!selectedFeature) return

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

    setRouteGeoJson(null)
    setSelectedRouteIndex(0)
    setLoadedSavedRouteId(null)
    bumpRouteDisplay()

    setRouteMode(savedRoute.mode)
    setSaveSuccessMessage('')
    setError('')
    setIsLoadingRoute(false)

    if (savedRoute.mode === 'Loop') {
      setEndPoint(null)
      setEndInput('')
      if (savedRoute.distanceKm != null) {
        const roundedDistance = Math.round(savedRoute.distanceKm)
        setLoopDistanceKm(Math.min(100, Math.max(5, roundedDistance)))
      }
      if (start) {
        setStartPoint(start)
        setStartInput(savedRoute.name || mapSelectionLabel(start))
        setLockedPoint(start)
      } else {
        setStartPoint(null)
        setStartInput('')
        setLockedPoint(null)
      }
    } else {
      if (start) {
        setStartPoint(start)
        setStartInput(mapSelectionLabel(start))
      } else {
        setStartPoint(null)
        setStartInput('')
      }

      if (end) {
        setEndPoint(end)
        setEndInput(mapSelectionLabel(end))
      } else {
        setEndPoint(null)
        setEndInput('')
      }
      setLockedPoint(null)
    }

    setLoadedSavedRouteId(savedRoute.id)
    setLoadedSavedRouteName(savedRoute.name || '')
    setRouteGeoJson(cloneGeoJson(geojson))
    bumpRouteDisplay()
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

  const currentRouteName =
    loadedSavedRouteName ||
    (routeMode === 'Loop' ? 'Pętla treningowa' : 'Trasa A → B')

  const rideUrl = loadedSavedRouteId
    ? `${window.location.origin}/?ride=${loadedSavedRouteId}`
    : ''

  const handleStartRide = () => {
    if (!selectedFeature) {
      setError('Najpierw wyznacz trasę, aby rozpocząć nawigację.')
      return
    }
    setRideRoute({ feature: selectedFeature, name: currentRouteName, mode: routeMode })
  }

  const handleOpenOnPhone = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }
    if (!loadedSavedRouteId) {
      setError('Najpierw zapisz trasę („Zapisz trasę”), aby otworzyć ją na telefonie.')
      return
    }
    setOpenOnPhoneTarget({ rideUrl, routeName: currentRouteName })
    setShowOpenOnPhone(true)
  }

  // Akcje "Jedź" / "Otwórz na telefonie" bezpośrednio z listy zapisanych tras.
  const handleRideSavedRoute = (savedRoute) => {
    const feature = savedRoute?.geojson?.features?.[0]
    if (!feature) {
      setError('Zapisana trasa nie zawiera danych do nawigacji.')
      return
    }
    setRideRoute({
      feature,
      name: savedRoute.name || (savedRoute.mode === 'Loop' ? 'Pętla treningowa' : 'Trasa A → B'),
      mode: savedRoute.mode,
    })
  }

  const handleOpenSavedRouteOnPhone = (savedRoute) => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }
    if (!savedRoute?.id) {
      setError('Nie udało się przygotować linku do tej trasy.')
      return
    }
    setOpenOnPhoneTarget({
      rideUrl: `${window.location.origin}/?ride=${savedRoute.id}`,
      routeName: savedRoute.name || 'Trasa',
    })
    setShowOpenOnPhone(true)
  }

  useEffect(() => {
    if (!pendingRideId || isAuthLoading) return undefined

    let cancelled = false

    const loadRideRoute = async () => {
      if (!isAuthenticated) {
        setView('planner')
        setShowAuthModal(true)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('saved_routes')
        .select('id, name, mode, geojson')
        .eq('id', pendingRideId)
        .single()

      if (cancelled) return

      if (fetchError || !data) {
        setView('planner')
        setError(
          'Nie udało się wczytać trasy do nawigacji. Sprawdź, czy jesteś zalogowany właściwym kontem.',
        )
        setPendingRideId(null)
        return
      }

      const feature = data.geojson?.features?.[0]
      if (!feature) {
        setView('planner')
        setError('Zapisana trasa nie zawiera danych do nawigacji.')
        setPendingRideId(null)
        return
      }

      setRideRoute({ feature, name: data.name, mode: data.mode })
      setPendingRideId(null)
      window.history.replaceState({}, '', window.location.pathname)
    }

    loadRideRoute()

    return () => {
      cancelled = true
    }
  }, [pendingRideId, isAuthLoading, isAuthenticated])

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

  const goToPlanner = () => {
    setView('planner')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToHome = () => {
    setView('landing')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  if (rideRoute) {
    return (
      <RideView
        feature={rideRoute.feature}
        routeName={rideRoute.name}
        mode={rideRoute.mode}
        onExit={() => setRideRoute(null)}
      />
    )
  }

  return (
    <div className="relative min-h-full w-full overflow-x-hidden bg-transparent text-stone-800">
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

      <Navbar
        view={view}
        onGoHome={goToHome}
        onStartPlanning={goToPlanner}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={logout}
        isAuthenticated={isAuthenticated}
        userEmail={user?.email}
      />

      {view === 'landing' ? (
        <>
          <LandingPage onStartPlanning={goToPlanner} />
          <Footer onStartPlanning={goToPlanner} onGoHome={goToHome} />
        </>
      ) : (
        <section ref={plannerSectionRef} className="relative z-10 px-3 pb-3 md:px-5 md:pb-5">
          <div className="mx-auto flex max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-[#e8e2d6] bg-[#f7f5ef] text-stone-800 shadow-[0_10px_28px_rgba(95,74,53,0.12)] md:h-[calc(100vh-4.5rem)] md:min-h-[680px] md:flex-row">
            <PlannerSidebar
              open={sidebarOpen}
              setOpen={setSidebarOpen}
              onGoHome={goToHome}
              onOpenAuth={() => setShowAuthModal(true)}
              onLogout={logout}
              isAuthenticated={isAuthenticated}
              userEmail={user?.email}
              routeMode={routeMode}
              onRouteModeChange={handleRouteModeChange}
              onScrollToSaved={() =>
                savedRoutesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            />

            <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
      <aside className="flex w-full flex-col border-r border-[#e9e1d2] bg-white/95 shadow-[0_12px_44px_rgba(95,74,53,0.12)] backdrop-blur-sm md:h-full md:min-h-0 md:w-[26rem] md:shrink-0">
        <div className="shrink-0 space-y-4 border-b border-[#ebe3d6] p-6 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {routeMode === 'AtoB' ? 'Tryb: Trasa A → B' : 'Tryb: Pętla treningowa'}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#2e5f43]">
              Planer tras
            </h1>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Ustaw punkty, wyznacz trasę i zapisz ją na koncie.
            </p>
          </div>

          <div className="md:hidden">{accountBar}</div>

          {saveSuccessMessage && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              {saveSuccessMessage}
            </p>
          )}

          <div ref={savedRoutesRef}>
            <SavedRoutes
              onLoadRoute={handleLoadSavedRoute}
              onRideRoute={handleRideSavedRoute}
              onOpenOnPhone={handleOpenSavedRouteOnPhone}
              refreshKey={savedRoutesRefreshKey}
              activeRouteId={loadedSavedRouteId}
            />
          </div>
        </div>

        <div className="p-6 pt-4 md:min-h-0 md:flex-1 md:overflow-y-auto">
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
                    <AddressAutocomplete
                      id="start-point-input"
                      value={startInput}
                      onChange={(nextValue) => handlePointInputChange('start', nextValue)}
                      onSelect={(result) => applyGeocodeResult('start', result)}
                      onSubmit={() => geocodeAddress('start')}
                      placeholder="Wpisz miejscowość lub adres"
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
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={isLocating}
                    className="soft-button mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#cfe7d2] bg-[#f4faf4] px-3 py-2 text-sm font-medium text-[#2e5f43] transition hover:bg-[#e9f5ec] disabled:opacity-60"
                  >
                    {isLocating ? 'Pobieranie lokalizacji…' : 'Użyj mojej lokalizacji'}
                  </button>
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
                    <AddressAutocomplete
                      id="end-point-input"
                      value={endInput}
                      onChange={(nextValue) => handlePointInputChange('end', nextValue)}
                      onSelect={(result) => applyGeocodeResult('end', result)}
                      onSubmit={() => geocodeAddress('end')}
                      placeholder="Wpisz miejscowość lub adres"
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
                    <AddressAutocomplete
                      id="loop-start-point-input"
                      value={startInput}
                      onChange={(nextValue) => handlePointInputChange('start', nextValue)}
                      onSelect={(result) => applyGeocodeResult('start', result)}
                      onSubmit={() => geocodeAddress('start')}
                      placeholder="Wpisz miejscowość lub adres"
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
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={isLocating}
                    className="soft-button mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#cfe7d2] bg-[#f4faf4] px-3 py-2 text-sm font-medium text-[#2e5f43] transition hover:bg-[#e9f5ec] disabled:opacity-60"
                  >
                    {isLocating ? 'Pobieranie lokalizacji…' : 'Użyj mojej lokalizacji (start pętli)'}
                  </button>
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
                    onClick={handleStartRide}
                    className="soft-button w-full rounded-xl bg-[#2e5f43] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#264f38]"
                  >
                    Nawiguj (tryb jazdy)
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleOpenOnPhone}
                      className="soft-button rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      Otwórz na telefonie
                    </button>
                    <button
                      type="button"
                      onClick={handleExportToGpx}
                      className="soft-button rounded-xl bg-[#7a6248] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6c563f]"
                    >
                      Pobierz GPX
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveRouteClick}
                    disabled={isSavingRoute}
                    className="soft-button w-full rounded-xl border border-[#dfd4c2] bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-[#f3ede2] disabled:opacity-60"
                  >
                    {isSavingRoute
                      ? 'Zapisywanie...'
                      : isAuthenticated
                        ? 'Zapisz trasę'
                        : 'Zapisz trasę (wymaga konta)'}
                  </button>
                </div>
                <div className="mt-3 border-t border-emerald-100 pt-3">
                  <button
                    type="button"
                    onClick={handleExportToGoogleMaps}
                    className="text-xs font-medium text-stone-500 underline-offset-2 transition hover:text-[#2e5f43] hover:underline"
                  >
                    Otwórz w Google Maps (przybliżone)
                  </button>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    Najdokładniejsza nawigacja: tryb jazdy lub GPX (Komoot, Garmin, OsmAnd). Google
                    Maps pokazuje tylko przybliżony przebieg.
                  </p>
                </div>
              </div>
            )}

            {selectedRouteGeoJson && (
              <ElevationChart
                key={`elevation-${routeDisplayKey}`}
                routeData={selectedRouteGeoJson}
              />
            )}

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

      <div className="relative h-[60vh] min-h-[320px] w-full shrink-0 md:h-full md:min-h-0 md:w-auto md:flex-1 md:shrink">
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
            </div>
          </div>
        </section>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <SaveRouteModal
        key={showSaveRouteModal ? 'save-open' : 'save-closed'}
        isOpen={showSaveRouteModal}
        defaultName={`Trasa ${new Date().toLocaleDateString('pl-PL')}`}
        isSaving={isSavingRoute}
        onClose={() => setShowSaveRouteModal(false)}
        onSave={handleSaveRouteConfirm}
      />
      <GoogleMapsExportNoticeModal
        isOpen={showGoogleMapsExportNotice}
        onClose={() => setShowGoogleMapsExportNotice(false)}
        onConfirm={handleConfirmGoogleMapsExport}
        onDownloadGpx={handleExportToGpx}
      />
      <OpenOnPhoneModal
        isOpen={showOpenOnPhone}
        onClose={() => setShowOpenOnPhone(false)}
        rideUrl={openOnPhoneTarget?.rideUrl ?? rideUrl}
        routeName={openOnPhoneTarget?.routeName ?? currentRouteName}
      />
    </div>
  )
}

export default App
