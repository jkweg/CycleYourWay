import {
  CLIMB_PREFERENCES,
  RIDE_STYLES,
} from '../lib/routePreferences'

function PreferenceSegment({ label, options, value, onChange, name }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-stone-700">{label}</p>
      <div
        className="grid grid-cols-3 gap-1 rounded-xl border border-[#dfd4c2] bg-[#f7f3eb] p-1"
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
                  ? 'bg-white text-[#2e5f43] shadow-sm ring-1 ring-emerald-200'
                  : 'text-stone-600 hover:bg-white/60'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <p className="mt-1 text-[11px] leading-4 text-stone-500">
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
    <div className="space-y-3 rounded-xl border border-[#eadfcf] bg-[#fcfaf5] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
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

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#dfd4c2] bg-white px-3 py-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={preferAsphalt}
          onChange={(event) => onPreferAsphaltChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#3f7b57]"
        />
        <span>
          Preferuj asfalt
          <span className="mt-1 block text-xs font-normal text-stone-500">
            Wybieramy wariant z większym udziałem asfaltu, gdy to możliwe — nie
            gwarantuje 100% asfaltu (dane OSM bywają niekompletne).
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#dfd4c2] bg-white px-3 py-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={avoidMainRoads}
          onChange={(event) => onAvoidMainRoadsChange(event.target.checked)}
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
    </div>
  )
}

export default RoutePreferencesPanel
