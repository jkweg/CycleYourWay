import {
  CLIMB_PREFERENCES,
  RIDE_STYLES,
} from '../lib/routePreferences'

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
        className={`grid gap-1 rounded-xl border border-[#C4A574]/80 bg-[#E9D8B8]/70 p-1 ${columnsClass}`}
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
                  ? 'bg-white text-[#E05518] shadow-sm ring-1 ring-[#FC6C26]/45'
                  : 'text-stone-700 hover:bg-[#FFF8E8]/90'
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
    <div className="space-y-3.5 rounded-2xl border border-[#C4A574]/80 bg-[linear-gradient(145deg,rgba(255,248,232,0.96),rgba(255,244,214,0.88))] p-3.5 shadow-[0_12px_30px_-26px_rgba(74,43,32,0.55)]">
      <div className="flex items-start gap-2.5 border-b border-[#C4A574]/35 pb-3">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FC6C26]" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#E05518]">
            Preferencje trasy
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-stone-600">
            Dopasuj charakter przejazdu bez zmiany punktów.
          </p>
        </div>
      </div>

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

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#C4A574]/70 bg-white/55 px-3 py-2.5 text-sm font-medium text-stone-800 transition hover:border-[#E08A50] hover:bg-white/80">
        <input
          type="checkbox"
          checked={preferAsphalt}
          onChange={(event) => onPreferAsphaltChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#FC6C26]"
        />
        <span>
          Preferuj asfalt
          <span className="mt-1 block text-xs font-normal leading-5 text-stone-600">
            Wybiera wariant z większym udziałem asfaltu, gdy to możliwe.
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#C4A574]/70 bg-white/55 px-3 py-2.5 text-sm font-medium text-stone-800 transition hover:border-[#E08A50] hover:bg-white/80">
        <input
          type="checkbox"
          checked={avoidMainRoads}
          onChange={(event) => onAvoidMainRoadsChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#FC6C26]"
        />
        <span>
          Unikaj dróg głównych
          <span className="mt-1 block text-xs font-normal leading-5 text-stone-600">
            Preferuje trasy z mniejszym udziałem dróg głównych.
          </span>
        </span>
      </label>
    </div>
  )
}

export default RoutePreferencesPanel
