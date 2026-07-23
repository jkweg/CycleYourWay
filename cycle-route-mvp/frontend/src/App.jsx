import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import FloatingLines from './FloatingLines'
import { API_BASE } from './api'
import AuthModal from './AuthModal'
import { useAuth } from './useAuth'
import { downloadRouteAsGpx } from './exportToGpx'
import { buildGoogleMapsDirectionsUrl, openRouteInGoogleMaps } from './exportToGoogleMaps'
import SaveRouteModal from './SaveRouteModal'
import GoogleMapsExportNoticeModal from './GoogleMapsExportNoticeModal'
import OpenOnPhoneModal from './OpenOnPhoneModal'
import SavedRoutes from './SavedRoutes'
import { supabase } from './supabaseClient'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import AddressAutocomplete from './components/AddressAutocomplete'
import PlannerSidebar from './components/PlannerSidebar'
import ChunkFallback from './components/ChunkFallback'
import RouteAlternativesCompare from './components/RouteAlternativesCompare'
import MapRouteDetailsBar from './components/MapRouteDetailsBar'
import PlannerOnboarding from './components/PlannerOnboarding'
import { shouldShowPlannerOnboarding } from './lib/plannerOnboarding'
import ProfileModal from './components/ProfileModal'
import LegalPage from './components/LegalPage'
import { ensureNavigableFeature } from './lib/routeRefresh'
import {
  buildRouteAlternatives,
  getLineCoordinates,
  getRouteSummary,
  pointFromCoordinate,
  summarizeRouteSurfaces,
} from './lib/routeStats'

const LandingPage = lazy(() => import('./components/LandingPage'))
const RideView = lazy(() => import('./RideView'))
const PlannerMap = lazy(() => import('./PlannerMap'))

let viaStopSequentialId = 0

function createViaStop(point = null, input = '') {
  viaStopSequentialId += 1
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `via-${viaStopSequentialId}`
  return { id, point, input }
}

function App() {
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    logout,
    passwordRecovery,
  } = useAuth()
  const plannerSectionRef = useRef(null)
  const [routeMode, setRouteMode] = useState('AtoB')
  const [plannerPanel, setPlannerPanel] = useState('plan')
  const [startPoint, setStartPoint] = useState(null)
  const [endPoint, setEndPoint] = useState(null)
  const [startInput, setStartInput] = useState('')
  const [endInput, setEndInput] = useState('')
  const [viaStops, setViaStops] = useState([])
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
  const [isPreparingRide, setIsPreparingRide] = useState(false)
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
  const [rideSessionKey, setRideSessionKey] = useState(0)
  const [pendingRideId, setPendingRideId] = useState(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('ride')
  })
  const [pendingShareId, setPendingShareId] = useState(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('share')
  })
  const [routeDisplayKey, setRouteDisplayKey] = useState(0)
  const [isSavingRoute, setIsSavingRoute] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('')
  const [view, setView] = useState('landing')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [legalDoc, setLegalDoc] = useState(null)

  useEffect(() => {
    window.localStorage.setItem('loopDistanceKm', String(loopDistanceKm))
  }, [loopDistanceKm])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined

    let cancelled = false

    const loadProfilePreferences = async () => {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('prefer_avoid_main_roads, default_loop_distance_km')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled || profileError || !data) return

      if (typeof data.prefer_avoid_main_roads === 'boolean') {
        setAvoidMainRoads(data.prefer_avoid_main_roads)
      }
      if (
        Number.isFinite(data.default_loop_distance_km) &&
        data.default_loop_distance_km >= 5 &&
        data.default_loop_distance_km <= 100
      ) {
        setLoopDistanceKm(data.default_loop_distance_km)
      }
    }

    loadProfilePreferences()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id])

  const routeAlternatives = useMemo(
    () => buildRouteAlternatives(routeGeoJson),
    [routeGeoJson],
  )

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

  const selectedRouteSurfaces = useMemo(
    () => summarizeRouteSurfaces(selectedFeature),
    [selectedFeature],
  )

  const clearPlannedRoute = () => {
    setRouteGeoJson(null)
    setSelectedRouteIndex(0)
    setLoadedSavedRouteId(null)
    setLoadedSavedRouteName('')
    bumpRouteDisplay()
  }

  const requestRoute = async (waypoints) => {
    setIsLoadingRoute(true)
    setError('')

    try {
      const payload =
        waypoints.length === 2
          ? {
              start: waypoints[0],
              end: waypoints[1],
              profile: 'cycling-mountain',
              avoidMainRoads,
            }
          : {
              waypoints,
              profile: 'cycling-mountain',
              avoidMainRoads,
            }

      const response = await fetch(`${API_BASE}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Route request failed.')
      }

      setLoadedSavedRouteId(null)
      setLoadedSavedRouteName('')
      setRouteGeoJson(data)
      setSelectedRouteIndex(0)
      bumpRouteDisplay()
    } catch (requestError) {
      setRouteGeoJson(null)
      setSelectedRouteIndex(0)
      setLoadedSavedRouteId(null)
      setLoadedSavedRouteName('')
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
    setPlannerPanel('plan')
    setRouteMode(nextMode)
    if (nextMode === 'Loop') {
      setEndPoint(null)
      setEndInput('')
      setViaStops([])
    }
    setRouteGeoJson(null)
    setSelectedRouteIndex(0)
    setLockedPoint(null)
    setLoadedSavedRouteId(null)
    setLoadedSavedRouteName('')
    bumpRouteDisplay()
    setError('')
  }

  const clearCurrentPlan = () => {
    setStartPoint(null)
    setEndPoint(null)
    setStartInput('')
    setEndInput('')
    setViaStops([])
    setLockedPoint(null)
    setRouteGeoJson(null)
    setSelectedRouteIndex(0)
    setLoadedSavedRouteId(null)
    setLoadedSavedRouteName('')
    bumpRouteDisplay()
    setSaveSuccessMessage('')
    setError('')
    setPlannerPanel('plan')
  }

  const openSavedPanel = () => {
    setPlannerPanel('saved')
  }

  const handlePointInputChange = (type, value) => {
    if (type === 'start') {
      setStartInput(value)
      setStartPoint(null)
    } else {
      setEndInput(value)
      setEndPoint(null)
    }

    clearPlannedRoute()
    setError('')
  }

  const handleViaInputChange = (viaId, value) => {
    setViaStops((current) =>
      current.map((stop) =>
        stop.id === viaId ? { ...stop, input: value, point: null } : stop,
      ),
    )
    clearPlannedRoute()
    setError('')
  }

  const applyGeocodeResult = (type, result, viaId = null) => {
    const selectedPoint = { lat: result.lat, lng: result.lon }
    if (type === 'start') {
      setStartPoint(selectedPoint)
      setStartInput(result.name)
      setLockedPoint(selectedPoint)
    } else if (type === 'via' && viaId) {
      setViaStops((current) =>
        current.map((stop) =>
          stop.id === viaId
            ? { ...stop, point: selectedPoint, input: result.name }
            : stop,
        ),
      )
      setLockedPoint(selectedPoint)
    } else {
      setEndPoint(selectedPoint)
      setEndInput(result.name)
      setLockedPoint(selectedPoint)
    }
    clearPlannedRoute()
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
          setViaStops([])
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

  const geocodeAddress = async (type, viaId = null) => {
    const rawAddress =
      type === 'start'
        ? startInput
        : type === 'via'
          ? viaStops.find((stop) => stop.id === viaId)?.input || ''
          : endInput
    const address = rawAddress.trim()

    if (!address) {
      setError('Wpisz adres przed wyszukaniem.')
      return
    }

    if (type === 'start') setIsSearchingStart(true)
    else if (type === 'end') setIsSearchingEnd(true)
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

      applyGeocodeResult(type, firstResult, viaId)
    } catch (requestError) {
      setError(requestError.message || 'Unexpected geocoding error.')
    } finally {
      if (type === 'start') setIsSearchingStart(false)
      else if (type === 'end') setIsSearchingEnd(false)
    }
  }

  const handleRouteSubmit = () => {
    if (!startPoint || !endPoint) {
      setError('Najpierw wybierz punkt początkowy i końcowy.')
      return
    }

    const incompleteVia = viaStops.find((stop) => !stop.point)
    if (incompleteVia) {
      setError('Uzupełnij wszystkie punkty pośrednie albo je usuń.')
      return
    }

    const waypoints = [
      startPoint,
      ...viaStops.map((stop) => stop.point),
      endPoint,
    ]
    requestRoute(waypoints)
  }

  const handleReverseRoute = () => {
    if (routeMode !== 'AtoB') return

    const nextStart = endPoint
    const nextStartInput = endInput
    const nextEnd = startPoint
    const nextEndInput = startInput

    setStartPoint(nextStart)
    setStartInput(nextStartInput)
    setEndPoint(nextEnd)
    setEndInput(nextEndInput)
    setViaStops((current) => [...current].reverse())
    if (nextStart) setLockedPoint(nextStart)
    clearPlannedRoute()
    setError('')
  }

  const handleAddViaStop = () => {
    if (viaStops.length >= 5) {
      setError('Możesz dodać maksymalnie 5 punktów pośrednich.')
      return
    }
    setViaStops((current) => [...current, createViaStop()])
    setError('')
  }

  const handleRemoveViaStop = (viaId) => {
    setViaStops((current) => current.filter((stop) => stop.id !== viaId))
    clearPlannedRoute()
    setError('')
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

  const handleSaveRouteConfirm = async (name, saveMode = 'insert') => {
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

      const features = Array.isArray(routeGeoJson?.features)
        ? [...routeGeoJson.features]
        : []
      if (features.length === 0) {
        throw new Error('Najpierw wyznacz trasę do zapisania.')
      }

      const selected =
        features[selectedRouteIndex] || selectedFeature || features[0]
      const remaining = features.filter((feature) => feature !== selected)
      // Selected alternative first so ride / load always use features[0].
      const geojsonToSave = {
        type: 'FeatureCollection',
        features: [selected, ...remaining],
      }

      const summary = selected?.properties?.summary
      const distanceMeters =
        typeof summary?.distance === 'number'
          ? summary.distance
          : typeof selected?.properties?.distance === 'number'
            ? selected.properties.distance
            : null
      const durationSeconds =
        typeof summary?.duration === 'number'
          ? summary.duration
          : typeof selected?.properties?.duration === 'number'
            ? selected.properties.duration
            : null

      const payload = {
        name: name.trim(),
        mode: routeMode,
        geojson: geojsonToSave,
        distance_km:
          distanceMeters != null
            ? Math.round((distanceMeters / 1000) * 100) / 100
            : null,
        duration_seconds:
          durationSeconds != null ? Math.round(durationSeconds) : null,
      }

      const shouldUpdate =
        saveMode === 'update' && Boolean(loadedSavedRouteId)

      if (shouldUpdate) {
        const { error: saveError } = await supabase
          .from('saved_routes')
          .update(payload)
          .eq('id', loadedSavedRouteId)
          .eq('user_id', authUser.id)

        if (saveError) throw new Error(saveError.message)

        setLoadedSavedRouteName(payload.name)
        setRouteGeoJson(geojsonToSave)
        setSelectedRouteIndex(0)
        setSaveSuccessMessage(`Zaktualizowano trasę „${payload.name}”.`)
      } else {
        const { data: inserted, error: saveError } = await supabase
          .from('saved_routes')
          .insert({
            user_id: authUser.id,
            ...payload,
          })
          .select('id')
          .maybeSingle()

        if (saveError) throw new Error(saveError.message)

        if (inserted?.id) {
          setLoadedSavedRouteId(inserted.id)
        }
        setLoadedSavedRouteName(payload.name)
        setRouteGeoJson(geojsonToSave)
        setSelectedRouteIndex(0)
        setSaveSuccessMessage(`Zapisano trasę „${payload.name}”.`)
      }

      setSavedRoutesRefreshKey((current) => current + 1)
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
    setViaStops([])

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
    setPlannerPanel('savedDetail')
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

  const startRideWithFeature = async ({ feature, name, mode, distanceKm }) => {
    setIsPreparingRide(true)
    setError('')
    setSaveSuccessMessage('')

    try {
      const { feature: navigableFeature, refreshed } = await ensureNavigableFeature({
        feature,
        mode,
        distanceKm,
        avoidMainRoads,
      })

      if (refreshed) {
        setSaveSuccessMessage(
          'Stara trasa została odświeżona instrukcjami nawigacji przed startem jazdy.',
        )
      }

      setRideSessionKey((current) => current + 1)
      setRideRoute({
        feature: navigableFeature,
        name,
        mode,
        avoidMainRoads,
      })
    } catch (prepareError) {
      setError(
        prepareError.message ||
          'Nie udało się przygotować nawigacji. Spróbuj ponownie wyznaczyć trasę w planerze.',
      )
    } finally {
      setIsPreparingRide(false)
    }
  }

  const handleStartRide = async () => {
    if (!selectedFeature) {
      setError('Najpierw wyznacz trasę, aby rozpocząć nawigację.')
      return
    }
    await startRideWithFeature({
      feature: selectedFeature,
      name: currentRouteName,
      mode: routeMode,
      distanceKm: routeMode === 'Loop' ? loopDistanceKm : undefined,
    })
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
  const handleRideSavedRoute = async (savedRoute) => {
    const feature = savedRoute?.geojson?.features?.[0]
    if (!feature) {
      setError('Zapisana trasa nie zawiera danych do nawigacji.')
      return
    }
    await startRideWithFeature({
      feature,
      name: savedRoute.name || (savedRoute.mode === 'Loop' ? 'Pętla treningowa' : 'Trasa A → B'),
      mode: savedRoute.mode,
      distanceKm: savedRoute.distanceKm,
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
    if (!pendingShareId) return undefined

    let cancelled = false

    const loadSharedRoute = async () => {
      setView('planner')
      setError('')

      const { data, error: fetchError } = await supabase
        .from('saved_routes')
        .select('id, name, mode, geojson, distance_km, is_public')
        .eq('id', pendingShareId)
        .maybeSingle()

      if (cancelled) return

      if (fetchError || !data) {
        setError(
          'Nie udało się wczytać udostępnionej trasy. Link może być nieaktualny albo trasa nie jest publiczna.',
        )
        setPendingShareId(null)
        window.history.replaceState({}, '', window.location.pathname)
        return
      }

      handleLoadSavedRoute({
        id: data.id,
        name: data.name,
        mode: data.mode,
        geojson: data.geojson,
        distanceKm: data.distance_km != null ? Number(data.distance_km) : null,
      })
      setSaveSuccessMessage(`Wczytano udostępnioną trasę „${data.name}”.`)
      setPendingShareId(null)
      window.history.replaceState({}, '', window.location.pathname)
    }

    loadSharedRoute()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingShareId])

  useEffect(() => {
    if (!pendingRideId || isAuthLoading) return undefined

    let cancelled = false

    const loadRideRoute = async () => {
      if (!isAuthenticated) {
        setView('planner')
        setShowAuthModal(true)
        return
      }

      setView('planner')

      const { data, error: fetchError } = await supabase
        .from('saved_routes')
        .select('id, name, mode, geojson, distance_km')
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

      await startRideWithFeature({
        feature,
        name: data.name,
        mode: data.mode,
        distanceKm: data.distance_km,
      })
      setPendingRideId(null)
      window.history.replaceState({}, '', window.location.pathname)
    }

    loadRideRoute()

    return () => {
      cancelled = true
    }
    // startRideWithFeature is recreated each render; deep-link bootstrap runs once per pendingRideId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRideId, isAuthLoading, isAuthenticated])

  const handleMapClick = (latlng) => {
    const clickedPoint = { lat: latlng.lat, lng: latlng.lng }

    if (routeMode === 'Loop') {
      setStartPoint(clickedPoint)
      setStartInput(mapSelectionLabel(clickedPoint))
      setLockedPoint(clickedPoint)
      clearPlannedRoute()
      setError('')
      return
    }

    if (!startPoint) {
      setStartPoint(clickedPoint)
      setStartInput(mapSelectionLabel(clickedPoint))
      setLockedPoint(clickedPoint)
      clearPlannedRoute()
      setError('')
      return
    }

    if (!endPoint) {
      setEndPoint(clickedPoint)
      setEndInput(mapSelectionLabel(clickedPoint))
      setLockedPoint(clickedPoint)
      clearPlannedRoute()
      setError('')
      return
    }

    const emptyVia = viaStops.find((stop) => !stop.point)
    if (emptyVia) {
      setViaStops((current) =>
        current.map((stop) =>
          stop.id === emptyVia.id
            ? {
                ...stop,
                point: clickedPoint,
                input: mapSelectionLabel(clickedPoint),
              }
            : stop,
        ),
      )
      setLockedPoint(clickedPoint)
      clearPlannedRoute()
      setError('')
      return
    }

    if (viaStops.length < 5) {
      setViaStops((current) => [
        ...current,
        createViaStop(clickedPoint, mapSelectionLabel(clickedPoint)),
      ])
      setLockedPoint(clickedPoint)
      clearPlannedRoute()
      setError('')
      return
    }

    setStartPoint(clickedPoint)
    setStartInput(mapSelectionLabel(clickedPoint))
    setLockedPoint(clickedPoint)
    setEndPoint(null)
    setEndInput('')
    setViaStops([])
    clearPlannedRoute()
    setError('')
  }

  const handleStartDrag = (point) => {
    setStartPoint(point)
    setStartInput(mapSelectionLabel(point))
    setLockedPoint(point)
    clearPlannedRoute()
  }

  const handleEndDrag = (point) => {
    setEndPoint(point)
    setEndInput(mapSelectionLabel(point))
    setLockedPoint(point)
    clearPlannedRoute()
  }

  const handleViaDrag = (viaId, point) => {
    setViaStops((current) =>
      current.map((stop) =>
        stop.id === viaId
          ? { ...stop, point, input: mapSelectionLabel(point) }
          : stop,
      ),
    )
    setLockedPoint(point)
    clearPlannedRoute()
  }

  const goToPlanner = () => {
    setView('planner')
    if (shouldShowPlannerOnboarding()) {
      setShowOnboarding(true)
    }
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
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="rounded-lg border border-[#dfd4c2] bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-[#f3ede2]"
            >
              Profil
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-[#dfd4c2] bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-[#f3ede2]"
            >
              Wyloguj
            </button>
          </div>
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
      <Suspense fallback={<ChunkFallback label="Ładowanie nawigacji..." className="fixed inset-0 z-[3000] bg-[#0f1a14] text-emerald-100" />}>
        <RideView
          key={rideSessionKey}
          feature={rideRoute.feature}
          routeName={rideRoute.name}
          mode={rideRoute.mode}
          avoidMainRoads={Boolean(rideRoute.avoidMainRoads)}
          onExit={() => setRideRoute(null)}
        />
      </Suspense>
    )
  }

  return (
    <div className="relative min-h-full w-full overflow-x-clip bg-transparent text-stone-800">
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
          <Suspense fallback={<ChunkFallback label="Ładowanie strony..." className="min-h-[50vh]" />}>
            <LandingPage onStartPlanning={goToPlanner} />
          </Suspense>
          <Footer
            onStartPlanning={goToPlanner}
            onGoHome={goToHome}
            onOpenPrivacy={() => setLegalDoc('privacy')}
            onOpenTerms={() => setLegalDoc('terms')}
          />
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
              onOpenSaved={openSavedPanel}
              plannerPanel={plannerPanel}
            />

            <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
      <aside className="flex w-full flex-col border-r border-[#e9e1d2] bg-white/95 shadow-[0_12px_44px_rgba(95,74,53,0.12)] backdrop-blur-sm md:h-full md:min-h-0 md:w-[26rem] md:shrink-0">
        <div className="shrink-0 space-y-4 border-b border-[#ebe3d6] p-6 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {plannerPanel === 'saved' || plannerPanel === 'savedDetail'
                ? 'Biblioteka tras'
                : routeMode === 'AtoB'
                  ? 'Tryb: Trasa A → B'
                  : 'Tryb: Pętla treningowa'}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#2e5f43]">
              {plannerPanel === 'saved'
                ? 'Zapisane trasy'
                : plannerPanel === 'savedDetail'
                  ? 'Szczegóły trasy'
                  : 'Planer tras'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {plannerPanel === 'saved'
                ? 'Wybierz trasę z listy, aby zobaczyć ją na mapie i zarządzać nią.'
                : plannerPanel === 'savedDetail'
                  ? 'Jedź, udostępnij albo wróć do listy. Szczegóły trasy są pod mapą.'
                  : 'Ustaw punkty, wyznacz trasę i zapisz ją na koncie.'}
            </p>
          </div>

          <div className="md:hidden">{accountBar}</div>

          {saveSuccessMessage && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              {saveSuccessMessage}
            </p>
          )}
        </div>

        <div className="p-6 pt-4 md:min-h-0 md:flex-1 md:overflow-y-auto">
          {(plannerPanel === 'saved' || (plannerPanel === 'savedDetail' && isAuthenticated)) && (
            <SavedRoutes
              onLoadRoute={handleLoadSavedRoute}
              onRideRoute={handleRideSavedRoute}
              onOpenOnPhone={handleOpenSavedRouteOnPhone}
              refreshKey={savedRoutesRefreshKey}
              activeRouteId={loadedSavedRouteId}
              isPreparingRide={isPreparingRide}
              detailMode={plannerPanel === 'savedDetail'}
              onBackToList={() => setPlannerPanel('saved')}
              onRouteRemoved={(routeId) => {
                if (loadedSavedRouteId === routeId) {
                  clearCurrentPlan()
                  setPlannerPanel('saved')
                }
              }}
            />
          )}

          {plannerPanel === 'savedDetail' && !isAuthenticated && (
            <div className="soft-panel rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-stone-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Udostępniona trasa
              </p>
              <p className="mt-2 text-lg font-semibold text-[#2e5f43]">
                {loadedSavedRouteName || 'Trasa'}
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-600">
                Szczegóły (dystans, czas, profil) są pod mapą. Zaloguj się, aby zapisywać własne trasy.
              </p>
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="soft-button mt-3 w-full rounded-xl bg-[#3f7b57] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Zaloguj się
              </button>
            </div>
          )}

          {plannerPanel === 'plan' && (
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
                      placeholder="np. Rynek 1, Krosno"
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

                {viaStops.map((stop, index) => (
                  <div key={stop.id}>
                    <label
                      htmlFor={`via-point-input-${stop.id}`}
                      className="mb-1 flex items-center justify-between gap-2 text-sm font-medium text-stone-700"
                    >
                      <span>
                        Punkt pośredni {index + 1}
                        {stop.point && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Ustawiony
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveViaStop(stop.id)}
                        className="text-xs font-semibold text-rose-700 hover:underline"
                      >
                        Usuń
                      </button>
                    </label>
                    <div className="flex gap-2">
                      <AddressAutocomplete
                        id={`via-point-input-${stop.id}`}
                        value={stop.input}
                        onChange={(nextValue) =>
                          handleViaInputChange(stop.id, nextValue)
                        }
                        onSelect={(result) =>
                          applyGeocodeResult('via', result, stop.id)
                        }
                        onSubmit={() => geocodeAddress('via', stop.id)}
                        placeholder="np. Jedlicze"
                      />
                      <button
                        type="button"
                        onClick={() => geocodeAddress('via', stop.id)}
                        className="soft-button rounded-lg bg-[#3f7b57] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#356b4b]"
                      >
                        Szukaj
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleAddViaStop}
                    disabled={viaStops.length >= 5}
                    className="soft-button flex-1 rounded-xl border border-[#cfe7d2] bg-[#f4faf4] px-3 py-2 text-sm font-semibold text-[#2e5f43] transition hover:bg-[#e9f5ec] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Dodaj punkt pośredni
                  </button>
                  <button
                    type="button"
                    onClick={handleReverseRoute}
                    disabled={!startPoint && !endPoint}
                    className="soft-button flex-1 rounded-xl border border-[#dfd4c2] bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-[#f3ede2] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Odwróć trasę
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
                      placeholder="np. Rynek 1, Jedlicze"
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
                      placeholder="np. Wolności 2, Krosno"
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
              <RouteAlternativesCompare
                alternatives={routeAlternatives}
                selectedIndex={selectedRouteIndex}
                onSelect={setSelectedRouteIndex}
              />
            )}

            {routeStats && (
              <div className="soft-panel rounded-xl border border-emerald-100 bg-[#f5fbf6] p-4 text-sm text-stone-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Akcje
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Szczegóły trasy (dystans, czas, profil) są pod mapą.
                </p>
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={handleStartRide}
                    disabled={isPreparingRide}
                    className="soft-button w-full rounded-xl bg-[#2e5f43] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#264f38] disabled:opacity-60"
                  >
                    {isPreparingRide ? 'Przygotowywanie nawigacji…' : 'Nawiguj (tryb jazdy)'}
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
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {plannerPanel === 'plan' && (
        <div className="shrink-0 p-6 pt-0">
          <div className="soft-panel rounded-xl border border-[#e8dfcf] bg-[#fcfaf5] p-4 text-sm text-stone-700">
            {isLoadingRoute && <p className="font-medium">Wyznaczanie trasy...</p>}
            {!isLoadingRoute && !startPoint && routeMode === 'AtoB' && (
              <p>Kliknij mapę, aby wybrać punkt startowy.</p>
            )}
            {!isLoadingRoute && startPoint && !endPoint && routeMode === 'AtoB' && (
              <p>Kliknij drugi raz, aby wybrać punkt końcowy.</p>
            )}
            {!isLoadingRoute &&
              startPoint &&
              endPoint &&
              routeMode === 'AtoB' &&
              viaStops.length < 5 && (
              <p>
                Kolejny klik doda punkt pośredni (max 5). Znaczniki możesz przeciągać —
                potem ponownie wyznacz trasę.
              </p>
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
        )}
        {(plannerPanel === 'saved' || plannerPanel === 'savedDetail') && error && (
          <div className="shrink-0 p-6 pt-0">
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </p>
          </div>
        )}
      </aside>

      <div className="relative flex h-[60vh] min-h-[320px] w-full shrink-0 flex-col md:h-full md:min-h-0 md:w-auto md:flex-1 md:shrink">
        <div className="relative min-h-0 flex-1">
          <Suspense
            fallback={
              <ChunkFallback label="Ładowanie mapy..." className="h-full min-h-[240px] bg-[#eef3ea]" />
            }
          >
            <PlannerMap
              onMapClick={handleMapClick}
              lockedPoint={lockedPoint}
              selectedRouteGeoJson={selectedRouteGeoJson}
              startPoint={startPoint}
              endPoint={endPoint}
              viaStops={viaStops}
              routeMode={routeMode}
              routeGeoJson={routeGeoJson}
              routeDisplayKey={routeDisplayKey}
              selectedRouteIndex={selectedRouteIndex}
              onStartDrag={handleStartDrag}
              onEndDrag={handleEndDrag}
              onViaDrag={handleViaDrag}
            />
          </Suspense>
        </div>
        <MapRouteDetailsBar
          routeStats={routeStats}
          selectedFeature={selectedFeature}
          selectedRouteGeoJson={selectedRouteGeoJson}
          routeDisplayKey={routeDisplayKey}
          surfaces={selectedRouteSurfaces}
        />
      </div>
            </div>
          </div>
        </section>
      )}

      <AuthModal
        isOpen={showAuthModal || passwordRecovery}
        onClose={() => setShowAuthModal(false)}
      />
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onApplied={(profile) => {
          if (typeof profile.prefer_avoid_main_roads === 'boolean') {
            setAvoidMainRoads(profile.prefer_avoid_main_roads)
          }
          if (Number.isFinite(profile.default_loop_distance_km)) {
            setLoopDistanceKm(profile.default_loop_distance_km)
          }
        }}
      />
      <PlannerOnboarding
        key={showOnboarding ? 'onboarding-open' : 'onboarding-closed'}
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
      {legalDoc && (
        <LegalPage type={legalDoc} onClose={() => setLegalDoc(null)} />
      )}
      <SaveRouteModal
        key={showSaveRouteModal ? 'save-open' : 'save-closed'}
        isOpen={showSaveRouteModal}
        defaultName={
          loadedSavedRouteName ||
          `Trasa ${new Date().toLocaleDateString('pl-PL')}`
        }
        canOverwrite={Boolean(loadedSavedRouteId)}
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

      {isPreparingRide && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/25 backdrop-blur-[2px]">
          <div className="rounded-2xl bg-white px-6 py-4 text-sm font-medium text-stone-700 shadow-xl">
            Przygotowywanie nawigacji…
          </div>
        </div>
      )}
    </div>
  )
}

export default App
