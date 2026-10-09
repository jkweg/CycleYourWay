import { lazy, Suspense, useState } from 'react'
import {
  IconAdjustmentsHorizontal,
  IconArrowLeft,
  IconArrowRight,
  IconArrowsExchange,
  IconBookmark,
  IconChevronDown,
  IconChevronUp,
  IconCurrentLocation,
  IconDownload,
  IconExternalLink,
  IconMap,
  IconPlayerPlayFilled,
  IconPlus,
  IconRepeat,
  IconRoute,
  IconSearch,
  IconTrash,
  IconUser,
  IconX,
} from '@tabler/icons-react'
import AddressAutocomplete from '../components/AddressAutocomplete'
import ChunkFallback from '../components/ChunkFallback'
import SavedRoutes from '../SavedRoutes'
import { CLIMB_PREFERENCES, RIDE_STYLES } from '../lib/routePreferences'
import { getElevationGainMeters } from '../lib/routeStats'

const PlannerMap = lazy(() => import('../PlannerMap'))
const ElevationChart = lazy(() => import('../ElevationChart'))

const LOOP_PRESETS = [20, 40, 60, 100]
// Leaves the route clear of the floating top bar and of the bottom sheet.
const MAP_FIT_PADDING = { top: 130, bottom: 260 }

const formatKm = (value) => String(value).replace('.', ',')

function formatDuration(stats) {
  if (!stats) return ''
  return stats.hours > 0 ? `${stats.hours} h ${String(stats.minutes).padStart(2, '0')}` : `${stats.minutes} min`
}

function RoundButton({ label, onClick, children, dark = false, disabled = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full shadow-[0_8px_22px_rgba(42,26,18,0.16)] transition active:scale-95 disabled:opacity-60 ${
        dark ? 'bg-ink text-burnt-orange' : 'bg-white text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Chip({ active, onClick, children, tone = 'ink' }) {
  const on = tone === 'sage' ? 'bg-sage-soft text-[#1F5A43]' : 'bg-ink text-white'
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold transition ${
        active ? on : 'border-[1.5px] border-sand bg-transparent text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function ModeTabs({ routeMode, onChange }) {
  return (
    <div role="tablist" aria-label="Rodzaj trasy" className="grid grid-cols-2 gap-1 rounded-full bg-vanilla-deep p-1">
      {[
        { id: 'AtoB', label: 'Z A do B' },
        { id: 'Loop', label: 'Pętla' },
      ].map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={routeMode === tab.id}
          onClick={() => onChange(tab.id)}
          className={`h-9 rounded-full text-sm font-semibold transition ${
            routeMode === tab.id ? 'bg-ink font-bold text-white' : 'text-ink-muted'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function Preferences({ p }) {
  return (
    <div className="space-y-2">
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {RIDE_STYLES.map((style) => (
          <Chip key={style.id} active={p.rideStyle === style.id} onClick={() => p.setRideStyle(style.id)}>
            {style.label}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <Chip tone="sage" active={p.avoidMainRoads} onClick={() => p.setAvoidMainRoads(!p.avoidMainRoads)}>
          Bez głównych dróg
        </Chip>
        <Chip tone="sage" active={p.preferAsphalt} onClick={() => p.setPreferAsphalt(!p.preferAsphalt)}>
          Asfalt
        </Chip>
        {CLIMB_PREFERENCES.map((climb) => (
          <Chip
            key={climb.id}
            tone="sage"
            active={p.climbPreference === climb.id}
            onClick={() => p.setClimbPreference(climb.id)}
          >
            {climb.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function preferencesSummary(p) {
  const parts = [RIDE_STYLES.find((style) => style.id === p.rideStyle)?.label]
  if (p.avoidMainRoads) parts.push('bez głównych dróg')
  if (p.preferAsphalt) parts.push('asfalt')
  const climb = CLIMB_PREFERENCES.find((c) => c.id === p.climbPreference)
  if (climb && climb.id !== 'normal') parts.push(`podjazdy: ${climb.label.toLowerCase()}`)
  return parts.filter(Boolean).join(' · ')
}

function PrimaryAction({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-base font-bold text-white shadow-[0_12px_26px_rgba(42,26,18,0.24)] transition active:scale-[0.99] disabled:bg-sand disabled:shadow-none"
    >
      {children}
    </button>
  )
}

function SheetMessages({ p }) {
  if (!p.error && !p.saveSuccessMessage) return null
  return (
    <div className="space-y-2">
      {p.error && (
        <p role="alert" className="rounded-2xl border border-[#E9A08A] bg-[#FDE7DF] px-4 py-3 text-sm font-medium text-[#6E1C12]">
          {p.error}
        </p>
      )}
      {p.saveSuccessMessage && (
        <p role="status" className="rounded-2xl border border-[#9CC9AE] bg-sage-soft px-4 py-3 text-sm font-medium text-[#1F4D3B]">
          {p.saveSuccessMessage}
        </p>
      )}
    </div>
  )
}

function PlanAtoB({ p }) {
  return (
    <>
      <div className="grid grid-cols-[18px_1fr] gap-x-2.5 rounded-[18px] border border-[#EFE0BC] bg-white px-3 py-1.5">
        <div className="flex flex-col items-center pt-5" aria-hidden="true">
          <span className="h-3 w-3 rounded-full border-[3px] border-burnt-orange bg-white" />
          <span className="my-1 w-0.5 flex-1 bg-[repeating-linear-gradient(#D9C79C_0_4px,transparent_4px_8px)]" />
          <span className="mb-6 h-3 w-3 rounded-full bg-ink" />
        </div>
        <div className="min-w-0 space-y-2 py-1">
          <div>
            <label htmlFor="m-start" className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B4E3D]">
              Start
            </label>
            <div className="mt-1 flex gap-2">
              <AddressAutocomplete
                id="m-start"
                value={p.startInput}
                onChange={(value) => p.handlePointInputChange('start', value)}
                onSelect={(result) => p.applyGeocodeResult('start', result)}
                onSubmit={() => p.geocodeAddress('start')}
                placeholder="Skąd startujesz?"
              />
              <RoundButton label="Użyj mojej lokalizacji" onClick={p.handleUseMyLocation} disabled={p.isLocating}>
                <IconCurrentLocation size={20} className="text-burnt-orange-dark" />
              </RoundButton>
            </div>
          </div>
          {p.viaStops.map((stop, index) => (
            <div key={stop.id}>
              <div className="flex items-center justify-between">
                <label htmlFor={`m-via-${stop.id}`} className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B4E3D]">
                  Przystanek {index + 1}
                </label>
                <button
                  type="button"
                  aria-label={`Usuń przystanek ${index + 1}`}
                  onClick={() => p.handleRemoveViaStop(stop.id)}
                  className="grid h-8 w-8 place-items-center rounded-full text-rust"
                >
                  <IconX size={16} />
                </button>
              </div>
              <AddressAutocomplete
                id={`m-via-${stop.id}`}
                value={stop.input}
                onChange={(value) => p.handleViaInputChange(stop.id, value)}
                onSelect={(result) => p.applyGeocodeResult('via', result, stop.id)}
                onSubmit={() => p.geocodeAddress('via', stop.id)}
                placeholder="Przez…"
              />
            </div>
          ))}
          <div>
            <label htmlFor="m-end" className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B4E3D]">
              Cel
            </label>
            <div className="mt-1">
              <AddressAutocomplete
                id="m-end"
                value={p.endInput}
                onChange={(value) => p.handlePointInputChange('end', value)}
                onSelect={(result) => p.applyGeocodeResult('end', result)}
                onSubmit={() => p.geocodeAddress('end')}
                placeholder="Dokąd jedziesz?"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={p.handleAddViaStop}
          disabled={p.viaStops.length >= 5}
          className="flex h-8 items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-sand px-3 text-[13px] font-semibold text-ink-muted disabled:opacity-40"
        >
          <IconPlus size={16} stroke={2.4} /> Przystanek
        </button>
        <button
          type="button"
          onClick={p.handleReverseRoute}
          className="flex h-8 items-center gap-1.5 rounded-full border-[1.5px] border-sand px-3 text-[13px] font-semibold text-ink-muted"
        >
          <IconArrowsExchange size={16} /> Zamień
        </button>
        {(p.startPoint || p.endPoint) && (
          <button
            type="button"
            onClick={p.clearCurrentPlan}
            className="ml-auto h-8 rounded-full px-2 text-[13px] font-semibold text-rust"
          >
            Wyczyść
          </button>
        )}
      </div>
      <p className="text-[11px] text-[#6B4E3D]">Możesz też dotknąć mapy, żeby ustawić punkt.</p>
    </>
  )
}

function PlanLoop({ p }) {
  const minutes = Math.round((p.loopDistanceKm / 20) * 60)
  const estimate = minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min` : `${minutes} min`
  return (
    <>
      <div className="rounded-[16px] border border-[#EFE0BC] bg-white px-3 py-2">
        <label htmlFor="m-loop-start" className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B4E3D]">
          Start i meta
        </label>
        <div className="mt-1 flex gap-2">
          <AddressAutocomplete
            id="m-loop-start"
            value={p.startInput}
            onChange={(value) => p.handlePointInputChange('start', value)}
            onSelect={(result) => p.applyGeocodeResult('start', result)}
            onSubmit={() => p.geocodeAddress('start')}
            placeholder="Skąd startujesz?"
          />
          <RoundButton label="Użyj mojej lokalizacji" onClick={p.handleUseMyLocation} disabled={p.isLocating}>
            <IconCurrentLocation size={20} className="text-burnt-orange-dark" />
          </RoundButton>
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B4E3D]">Długość</p>
        <p className="whitespace-nowrap font-serif text-[30px] font-semibold leading-none text-ink">
          {p.loopDistanceKm}
          <span className="text-sm font-medium"> km</span>
          <span className="ml-2 font-sans text-[13px] font-normal text-ink-muted">ok. {estimate}</span>
        </p>
      </div>
      <input
        type="range"
        min="5"
        max="200"
        step="1"
        value={p.loopDistanceKm}
        onChange={(event) => p.setLoopDistanceKm(Number(event.target.value))}
        aria-label="Długość pętli w kilometrach"
        className="loop-distance-range w-full"
      />
      <div role="radiogroup" aria-label="Szybki wybór długości" className="grid grid-cols-4 gap-1.5">
        {LOOP_PRESETS.map((km) => (
          <button
            key={km}
            type="button"
            role="radio"
            aria-checked={p.loopDistanceKm === km}
            onClick={() => p.setLoopDistanceKm(km)}
            className={`h-8 rounded-full text-[13px] font-bold ${
              p.loopDistanceKm === km ? 'bg-ink text-white' : 'border-[1.5px] border-sand text-ink'
            }`}
          >
            {km} km
          </button>
        ))}
      </div>
    </>
  )
}

function ResultCard({ p, onExpand }) {
  const gain = getElevationGainMeters(p.selectedFeature)
  return (
    <section
      aria-label="Podsumowanie trasy"
      className="pointer-events-auto mx-2.5 mb-3 space-y-3 rounded-[24px] bg-vanilla px-4 pb-4 pt-1.5 shadow-[0_18px_44px_rgba(42,26,18,0.22)]"
    >
      <button type="button" onClick={onExpand} aria-label="Rozwiń szczegóły trasy" className="mx-auto flex h-5 w-24 items-center justify-center">
        <span className="h-1 w-9 rounded-full bg-sand" />
      </button>
      <SheetMessages p={p} />
      <div className="flex items-end justify-between gap-3">
        <p className="whitespace-nowrap font-serif text-[34px] font-semibold leading-none text-ink">
          {formatKm(p.routeStats.distanceKm)}
          <span className="text-[15px] font-medium"> km</span>
        </p>
        <div className="flex gap-3.5 pb-0.5 text-right">
          <p className="whitespace-nowrap">
            <strong className="block text-[15px] leading-tight">{formatDuration(p.routeStats)}</strong>
            <span className="text-[11px] text-[#6B4E3D]">czas</span>
          </p>
          {gain != null && (
            <p className="whitespace-nowrap">
              <strong className="block text-[15px] leading-tight">↗ {Math.round(gain)} m</strong>
              <span className="text-[11px] text-[#6B4E3D]">podjazdy</span>
            </p>
          )}
        </div>
      </div>
      {p.routeAlternatives.length > 1 && (
        <div role="radiogroup" aria-label="Warianty trasy" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {p.routeAlternatives.map((alt) => (
            <button
              key={alt.index}
              type="button"
              role="radio"
              aria-checked={p.selectedRouteIndex === alt.index}
              onClick={() => p.setSelectedRouteIndex(alt.index)}
              className={`h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold ${
                p.selectedRouteIndex === alt.index ? 'bg-ink text-white' : 'border-[1.5px] border-sand text-ink'
              }`}
            >
              {formatKm(alt.distanceKm)} km · {alt.durationLabel}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-[1fr_48px_48px] gap-2">
        <button
          type="button"
          onClick={p.handleStartRide}
          disabled={p.isPreparingRide}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-burnt-orange text-base font-bold text-ink shadow-[0_10px_22px_rgba(224,85,24,0.26)] disabled:opacity-60"
        >
          <IconPlayerPlayFilled size={18} />
          {p.isPreparingRide ? 'Przygotowuję…' : 'Jedź'}
        </button>
        <button
          type="button"
          aria-label="Zapisz trasę"
          onClick={p.handleSaveRouteClick}
          disabled={p.isSavingRoute}
          className="grid h-12 place-items-center rounded-full bg-white text-ink disabled:opacity-60"
        >
          <IconBookmark size={22} />
        </button>
        <button type="button" aria-label="Szczegóły trasy" onClick={onExpand} className="grid h-12 place-items-center rounded-full bg-white text-ink">
          <IconChevronUp size={22} stroke={2.2} />
        </button>
      </div>
    </section>
  )
}

function DetailsSheet({ p, onCollapse }) {
  const gain = getElevationGainMeters(p.selectedFeature)
  const surfaces = (p.selectedRouteSurfaces?.known || []).slice(0, 4)
  const surfaceColors = ['#2A1A12', '#FC6C26', '#8FC6A8', '#D9C79C']
  const title = p.loadedSavedRouteName || (p.routeMode === 'Loop' ? 'Pętla' : 'Trasa z A do B')
  return (
    <section
      aria-label="Szczegóły trasy"
      className="pointer-events-auto flex max-h-[72dvh] flex-col rounded-t-[24px] bg-vanilla shadow-[0_-14px_40px_rgba(42,26,18,0.16)]"
    >
      <div className="shrink-0 space-y-2 px-[18px] pt-2.5">
        <button type="button" onClick={onCollapse} aria-label="Zwiń szczegóły" className="mx-auto flex h-6 w-24 items-center justify-center">
          <span className="h-1 w-10 rounded-full bg-sand" />
        </button>
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate font-serif text-[22px] font-medium text-ink">{title}</h2>
          <RoundButton label="Zwiń" onClick={onCollapse}>
            <IconChevronDown size={20} stroke={2.4} />
          </RoundButton>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-[18px] py-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Dystans', `${formatKm(p.routeStats.distanceKm)} km`],
            ['Czas', formatDuration(p.routeStats)],
            ['W górę', gain != null ? `${Math.round(gain)} m` : '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white p-2.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#6B4E3D]">{label}</p>
              <p className="text-base font-bold text-ink">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-[20px] bg-white px-3.5 py-3">
          <p className="mb-1 text-[13px] font-bold text-ink">Profil wysokości</p>
          <div className="h-36">
            <Suspense fallback={<ChunkFallback label="Ładowanie wykresu…" className="h-full" />}>
              <ElevationChart key={`m-elev-${p.routeDisplayKey}`} routeData={p.selectedRouteGeoJson} compact />
            </Suspense>
          </div>
        </div>
        {surfaces.length > 0 && (
          <div className="space-y-2 rounded-[20px] bg-white px-3.5 py-3">
            <p className="text-[13px] font-bold text-ink">Nawierzchnia</p>
            <div
              role="img"
              aria-label={surfaces.map((s) => `${s.label} ${Math.round(s.percentage)}%`).join(', ')}
              className="flex h-2.5 overflow-hidden rounded-full bg-vanilla-deep"
            >
              {surfaces.map((s, i) => (
                <span key={s.label} style={{ width: `${s.percentage}%`, background: surfaceColors[i] }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-ink-muted">
              {surfaces.map((s, i) => (
                <span key={s.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: surfaceColors[i] }} />
                  {s.label} {Math.round(s.percentage)}%
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Zapisz', icon: IconBookmark, onClick: p.handleSaveRouteClick },
            { label: 'GPX', icon: IconDownload, onClick: p.handleExportToGpx },
            { label: 'Google Maps', icon: IconExternalLink, onClick: p.handleExportToGoogleMaps },
            { label: 'Wyczyść', icon: IconTrash, onClick: p.clearCurrentPlan },
          ].map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="flex h-[58px] flex-col items-center justify-center gap-1 rounded-[16px] bg-white text-[11px] font-semibold text-ink"
            >
              <Icon size={20} className="text-burnt-orange-dark" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="shrink-0 px-[18px] pb-[max(1.25rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))] pt-3">
        <button
          type="button"
          onClick={p.handleStartRide}
          disabled={p.isPreparingRide}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-burnt-orange text-base font-bold text-ink disabled:opacity-60"
        >
          <IconPlayerPlayFilled size={18} />
          {p.isPreparingRide ? 'Przygotowuję…' : 'Jedź tą trasą'}
        </button>
      </div>
    </section>
  )
}

function BottomNav({ active, onMap, onSaved, onProfile }) {
  const items = [
    { id: 'map', label: 'Mapa', icon: IconMap, onClick: onMap },
    { id: 'saved', label: 'Zapisane', icon: IconBookmark, onClick: onSaved },
    { id: 'profile', label: 'Profil', icon: IconUser, onClick: onProfile },
  ]
  return (
    <nav aria-label="Nawigacja główna" className="grid h-[54px] grid-cols-3 items-center rounded-full bg-ink px-1.5">
      {items.map(({ id, label, icon: Icon, onClick }) =>
        active === id ? (
          <button
            key={id}
            type="button"
            aria-current="page"
            onClick={onClick}
            className="flex h-[42px] items-center justify-center gap-1.5 rounded-full bg-vanilla text-[13px] font-bold text-ink"
          >
            <Icon size={18} stroke={2.2} className="text-burnt-orange-dark" />
            {label}
          </button>
        ) : (
          <button key={id} type="button" aria-label={label} onClick={onClick} className="grid h-[42px] place-items-center text-vanilla-deep">
            <Icon size={20} />
          </button>
        ),
      )}
    </nav>
  )
}

/**
 * Android app planner: the map is the full-screen background, controls float on
 * top and every step lives in a bottom sheet (home → plan → result → details).
 * All state and actions come from App (`p`), so behaviour matches the web planner.
 */
function MobilePlanner({ p, sheet, setSheet }) {
  const bottomPad = 'pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))]'
  const hasRoute = Boolean(p.routeStats && p.selectedRouteGeoJson)
  const openPlan = (mode) => {
    if (mode && mode !== p.routeMode) p.handleRouteModeChange(mode)
    setSheet('plan')
  }
  const openProfile = () => (p.isAuthenticated ? p.openProfile() : p.openAuth())
  const initials = (p.userEmail || '').slice(0, 2).toUpperCase()
  const [prefsOpen, setPrefsOpen] = useState(false)

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#EFE3C4] font-sans text-ink">
      <div className="absolute inset-0">
        <Suspense fallback={<ChunkFallback label="Ładowanie mapy…" className="h-full bg-[#EFE3C4]" />}>
          <PlannerMap
            fullscreen
            fitPadding={MAP_FIT_PADDING}
            onMapClick={p.handleMapClick}
            lockedPoint={p.lockedPoint}
            selectedRouteGeoJson={p.selectedRouteGeoJson}
            startPoint={p.startPoint}
            endPoint={p.endPoint}
            viaStops={p.viaStops}
            routeMode={p.routeMode}
            routeGeoJson={p.routeGeoJson}
            routeDisplayKey={p.routeDisplayKey}
            selectedRouteIndex={p.selectedRouteIndex}
            onStartDrag={p.handleStartDrag}
            onEndDrag={p.handleEndDrag}
            onViaDrag={p.handleViaDrag}
            allowPointSelection={!p.routeGeoJson}
          />
        </Suspense>
      </div>

      <header
        className="pointer-events-none absolute inset-x-4 z-[1100] flex items-center gap-2.5"
        style={{ top: 'calc(var(--safe-area-inset-top,env(safe-area-inset-top)) + 12px)' }}
      >
        <div className="pointer-events-auto flex w-full items-center gap-2.5">
          {sheet === 'home' || sheet === 'saved' ? (
            <>
              <button
                type="button"
                aria-label={p.isAuthenticated ? 'Profil' : 'Zaloguj się'}
                onClick={openProfile}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white shadow-[0_8px_22px_rgba(42,26,18,0.18)]"
              >
                {p.isAuthenticated && initials ? initials : <IconUser size={20} />}
              </button>
              <button
                type="button"
                onClick={() => openPlan('AtoB')}
                className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3.5 text-left text-[15px] text-[#6B4E3D] shadow-[0_8px_22px_rgba(42,26,18,0.14)]"
              >
                <IconSearch size={18} className="shrink-0 text-ink" />
                <span className="truncate">Dokąd dziś jedziesz?</span>
              </button>
            </>
          ) : (
            <>
              <RoundButton
                label="Wstecz"
                onClick={() => setSheet(sheet === 'details' ? 'result' : sheet === 'result' ? 'plan' : 'home')}
              >
                <IconArrowLeft size={20} stroke={2.2} />
              </RoundButton>
              {hasRoute && (sheet === 'result' || sheet === 'details') && (
                <span className="flex h-9 items-center gap-2 rounded-full bg-white px-3.5 text-sm font-semibold shadow-[0_8px_22px_rgba(42,26,18,0.14)]">
                  <span className="h-2 w-2 rounded-full bg-burnt-orange" />
                  {p.routeMode === 'Loop' ? 'Pętla' : 'A → B'} ·{' '}
                  {RIDE_STYLES.find((s) => s.id === p.rideStyle)?.label || 'Trasa'}
                </span>
              )}
              <span className="flex-1" />
            </>
          )}
          <RoundButton label="Pokaż moją lokalizację" onClick={p.handleUseMyLocation} disabled={p.isLocating} dark>
            <IconCurrentLocation size={20} stroke={2.2} />
          </RoundButton>
        </div>
      </header>

      <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-[1100] ${sheet === 'result' ? bottomPad : ''}`}>
        {sheet === 'home' && (
          <section
            aria-label="Nowa trasa"
            className={`pointer-events-auto space-y-2.5 rounded-t-[24px] bg-vanilla px-3.5 pt-2 shadow-[0_-10px_30px_rgba(42,26,18,0.14)] ${bottomPad}`}
          >
            <span className="mx-auto block h-1 w-9 rounded-full bg-sand" />
            <h1 className="sr-only">Gdzie jedziemy?</h1>
            <SheetMessages p={p} />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openPlan('AtoB')}
                className="flex h-14 items-center gap-2.5 rounded-[18px] border border-[#EFE0BC] bg-white px-3 text-left"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-vanilla">
                  <IconRoute size={20} className="text-burnt-orange-dark" />
                </span>
                <span className="min-w-0 leading-tight">
                  <strong className="block text-[15px]">Z A do B</strong>
                  <span className="text-xs text-[#6B4E3D]">do celu</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => openPlan('Loop')}
                className="flex h-14 items-center gap-2.5 rounded-[18px] bg-ink px-3 text-left text-white"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-burnt-orange">
                  <IconRepeat size={20} stroke={2.2} className="text-ink" />
                </span>
                <span className="min-w-0 leading-tight">
                  <strong className="block text-[15px]">Pętla</strong>
                  <span className="text-xs text-vanilla-deep">wróć do startu</span>
                </span>
              </button>
            </div>
            {hasRoute && (
              <button
                type="button"
                onClick={() => setSheet('result')}
                className="flex h-9 w-full items-center gap-2 rounded-full border border-[#EFE0BC] bg-white px-3.5 text-[13px] font-semibold"
              >
                <span className="h-2 w-2 rounded-full bg-burnt-orange" />
                Wróć do trasy · {formatKm(p.routeStats.distanceKm)} km
                <IconArrowRight size={15} className="ml-auto text-rust" />
              </button>
            )}
            <BottomNav active="map" onMap={() => setSheet('home')} onSaved={() => setSheet('saved')} onProfile={openProfile} />
          </section>
        )}

        {sheet === 'plan' && (
          <section
            aria-label={p.routeMode === 'Loop' ? 'Planowanie pętli' : 'Planowanie trasy z A do B'}
            className="pointer-events-auto flex max-h-[66dvh] flex-col rounded-t-[24px] bg-vanilla shadow-[0_-10px_30px_rgba(42,26,18,0.14)]"
          >
            <div className="shrink-0 px-4 pt-2">
              <span className="mx-auto mb-2 block h-1 w-9 rounded-full bg-sand" />
              <ModeTabs routeMode={p.routeMode} onChange={(mode) => p.handleRouteModeChange(mode)} />
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-1 pt-3">
              {p.routeMode === 'Loop' ? <PlanLoop p={p} /> : <PlanAtoB p={p} />}
              <div>
                <button
                  type="button"
                  aria-expanded={prefsOpen}
                  aria-controls="m-preferences"
                  onClick={() => setPrefsOpen((open) => !open)}
                  className="flex h-10 w-full items-center gap-2 rounded-[14px] border border-[#EFE0BC] bg-white px-3 text-left"
                >
                  <IconAdjustmentsHorizontal size={16} className="shrink-0 text-burnt-orange-dark" />
                  <strong className="text-[13px]">Preferencje</strong>
                  <span className="min-w-0 flex-1 truncate text-xs text-[#6B4E3D]">{preferencesSummary(p)}</span>
                  <IconChevronDown size={16} stroke={2.4} className={`shrink-0 transition ${prefsOpen ? 'rotate-180' : ''}`} />
                </button>
                {prefsOpen && (
                  <div id="m-preferences" className="pt-2">
                    <Preferences p={p} />
                  </div>
                )}
              </div>
              <SheetMessages p={p} />
            </div>
            <div className={`shrink-0 px-4 pt-2 ${bottomPad}`}>
              <PrimaryAction
                onClick={p.routeMode === 'Loop' ? p.handleLoopSubmit : p.handleRouteSubmit}
                disabled={p.isLoadingRoute}
              >
                {p.isLoadingRoute ? 'Wyznaczanie…' : p.routeMode === 'Loop' ? 'Wyznacz pętlę' : 'Wyznacz trasę'}
                {!p.isLoadingRoute && <IconArrowRight size={20} stroke={2.4} className="text-burnt-orange" />}
              </PrimaryAction>
            </div>
          </section>
        )}

        {sheet === 'result' && hasRoute && <ResultCard p={p} onExpand={() => setSheet('details')} />}

        {sheet === 'details' && hasRoute && <DetailsSheet p={p} onCollapse={() => setSheet('result')} />}

        {sheet === 'saved' && (
          <section
            aria-label="Zapisane trasy"
            className={`pointer-events-auto flex max-h-[82dvh] flex-col rounded-t-[24px] bg-vanilla shadow-[0_-14px_40px_rgba(42,26,18,0.16)] ${bottomPad}`}
          >
            <div className="shrink-0 px-[18px] pt-2.5">
              <span className="mx-auto mb-2 block h-1 w-10 rounded-full bg-sand" />
              <h1 className="font-serif text-[22px] font-medium text-ink">Zapisane</h1>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-3">
              <SheetMessages p={p} />
              {p.isAuthenticated ? (
                <SavedRoutes
                  onLoadRoute={p.handleLoadSavedRoute}
                  onRideRoute={p.handleRideSavedRoute}
                  onOpenOnPhone={p.handleOpenSavedRouteOnPhone}
                  refreshKey={p.savedRoutesRefreshKey}
                  activeRouteId={p.loadedSavedRouteId}
                  isPreparingRide={p.isPreparingRide}
                  detailMode={false}
                  onBackToList={() => undefined}
                  onRouteRemoved={(routeId) => {
                    if (p.loadedSavedRouteId === routeId) p.clearCurrentPlan()
                  }}
                />
              ) : (
                <div className="space-y-3 rounded-[22px] bg-white p-5">
                  <p className="text-[15px] text-ink-muted">Zaloguj się, aby zapisywać trasy i wracać do nich na każdym urządzeniu.</p>
                  <PrimaryAction onClick={p.openAuth}>Zaloguj się</PrimaryAction>
                </div>
              )}
            </div>
            <div className="shrink-0 px-[18px] pt-2">
              <BottomNav active="saved" onMap={() => setSheet('home')} onSaved={() => setSheet('saved')} onProfile={openProfile} />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default MobilePlanner
