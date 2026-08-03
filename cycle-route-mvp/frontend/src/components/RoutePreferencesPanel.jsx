import {
  CLIMB_PREFERENCES,
  RIDE_STYLES,
} from '../lib/routePreferences'
import CollapsibleSection from './CollapsibleSection'

function PreferenceSegment({ label, options, value, onChange, name }) {
  const columnsClass =
    options.length <= 3
      ? 'grid-cols-3'
      : options.length === 4
        ? 'grid-cols-2'
        : 'grid-cols-3'

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-stone-800">{label}</p>
      <div
        className={`grid gap-1 rounded-xl border border-[#C4A574]/60 bg-white/50 p-1 ${columnsClass}`}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => {
          const selected = value === option.id
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              title={option.hint}
              onClick={() => onChange(option.id)}
              className={`rounded-lg px-2 py-2 text-center text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FC6C26]/40 ${
                selected
                  ? 'bg-[#FC6C26] text-white shadow-sm'
                  : 'text-stone-700 hover:bg-[#FFF8E8]'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <input type="hidden" name={name} value={value} readOnly />
    </div>
  )
}

function RoutePreferencesPanel({
  rideStyle,
  climbPreference,
  preferAsphalt,
  avoidMainRoads,
  onRideStyleChange,
  onClimbPreferenceChange,
  onPreferAsphaltChange,
  onAvoidMainRoadsChange,
  defaultOpen = false,
}) {
  const styleLabel = RIDE_STYLES.find((s) => s.id === rideStyle)?.label || '—'
  const climbLabel =
    CLIMB_PREFERENCES.find((c) => c.id === climbPreference)?.label || '—'
  const extras = [
    preferAsphalt ? 'asfalt' : null,
    avoidMainRoads ? 'bez głównych' : null,
  ].filter(Boolean)

  const summary = [styleLabel, climbLabel, ...extras].join(' · ')

  return (
    <CollapsibleSection title="Preferencje trasy" summary={summary} defaultOpen={defaultOpen}>
      <PreferenceSegment
        name="rideStyle"
        label="Styl jazdy"
        options={RIDE_STYLES}
        value={rideStyle}
        onChange={onRideStyleChange}
      />

      <PreferenceSegment
        name="climbPreference"
        label="Podjazdy"
        options={CLIMB_PREFERENCES}
        value={climbPreference}
        onChange={onClimbPreferenceChange}
      />

      <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-stone-800">
        <input
          type="checkbox"
          checked={preferAsphalt}
          onChange={(event) => onPreferAsphaltChange(event.target.checked)}
          className="h-4 w-4 accent-[#FC6C26]"
        />
        Preferuj asfalt
      </label>

      <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-stone-800">
        <input
          type="checkbox"
          checked={avoidMainRoads}
          onChange={(event) => onAvoidMainRoadsChange(event.target.checked)}
          className="h-4 w-4 accent-[#FC6C26]"
        />
        Unikaj dróg głównych
      </label>
    </CollapsibleSection>
  )
}

export default RoutePreferencesPanel
