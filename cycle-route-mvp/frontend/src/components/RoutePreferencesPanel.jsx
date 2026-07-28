import {
  CLIMB_PREFERENCES,
  RIDE_STYLES,
} from '../lib/routePreferences'

function PreferenceSegment({ label, options, value, onChange, name }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-stone-800">{label}</p>
      <div
        className={`grid gap-1 rounded-xl border border-[#C4A574] bg-[#EFE0C4] p-1 ${
          options.length > 3 ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-3'
        }`}
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
              className={`rounded-lg px-1.5 py-1.5 text-center text-[11px] font-semibold transition ${
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
      <p className="mt-1 text-[10px] leading-4 text-stone-600">
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
    <div className="space-y-2 rounded-xl border border-[#C4A574] bg-[#FFF4D6] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#E05518]">
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

      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#C4A574] bg-[#FFF8E8] px-2.5 py-1.5 text-xs font-medium text-stone-800">
        <input
          type="checkbox"
          checked={preferAsphalt}
          onChange={(event) => onPreferAsphaltChange(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 accent-[#FC6C26]"
        />
        <span>
          Preferuj asfalt
          <span className="mt-0.5 block text-[10px] font-normal leading-4 text-stone-600">
            Wybiera wariant z większym udziałem asfaltu, gdy to możliwe.
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#C4A574] bg-[#FFF8E8] px-2.5 py-1.5 text-xs font-medium text-stone-800">
        <input
          type="checkbox"
          checked={avoidMainRoads}
          onChange={(event) => onAvoidMainRoadsChange(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 accent-[#FC6C26]"
        />
        <span>
          Unikaj dróg głównych
          <span className="mt-0.5 block text-[10px] font-normal leading-4 text-stone-600">
            Preferuje trasy z mniejszym udziałem dróg głównych.
          </span>
        </span>
      </label>
    </div>
  )
}

export default RoutePreferencesPanel
