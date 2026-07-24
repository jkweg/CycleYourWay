import {
  CLIMB_PREFERENCES,
  RIDE_STYLES,
} from '../lib/routePreferences'

function PreferenceSegment({ label, options, value, onChange, name }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-stone-800">{label}</p>
      <div
        className="grid grid-cols-3 gap-1 rounded-xl border border-[#C4A574] bg-[#EFE0C4] p-1"
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
              className={`rounded-lg px-2 py-2 text-center text-xs font-semibold transition ${
                selected
                  ? 'bg-[#FFF4D6] text-[#E05518] shadow-sm ring-1 ring-[#FC6C26]/50'
                  : 'text-stone-700 hover:bg-[#FFF4D6]/80'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 text-[11px] leading-4 text-stone-600">
        {options.find((option) => option.id === value)?.hint}
      </p>
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
}) {
  return (
    <div className="space-y-3 rounded-xl border border-[#C4A574] bg-[#FFF4D6] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#E05518]">
        Preferencje trasy
      </p>

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

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#C4A574] bg-[#FFF8E8] px-3 py-2 text-sm font-medium text-stone-800">
        <input
          type="checkbox"
          checked={preferAsphalt}
          onChange={(event) => onPreferAsphaltChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#FC6C26]"
        />
        <span>
          Preferuj asfalt
          <span className="mt-1 block text-xs font-normal leading-5 text-stone-600">
            Wybieramy wariant z większym udziałem asfaltu, gdy to możliwe — nie
            gwarantuje 100% asfaltu (dane OSM bywają niekompletne).
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#C4A574] bg-[#FFF8E8] px-3 py-2 text-sm font-medium text-stone-800">
        <input
          type="checkbox"
          checked={avoidMainRoads}
          onChange={(event) => onAvoidMainRoadsChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#FC6C26]"
        />
        <span>
          Unikaj dróg głównych
          <span className="mt-1 block text-xs font-normal leading-5 text-stone-600">
            Wybieramy trasę z najmniejszym udziałem dróg głównych (gdy pełne
            uniknięcie nie jest możliwe).
          </span>
        </span>
      </label>
    </div>
  )
}

export default RoutePreferencesPanel
