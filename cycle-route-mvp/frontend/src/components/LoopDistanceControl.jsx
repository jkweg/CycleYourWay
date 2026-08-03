import { useState } from 'react'

const MIN_KM = 5
const MAX_KM = 200

function clampNaturalKm(value) {
  const n = Number.parseInt(String(value), 10)
  if (!Number.isFinite(n)) return null
  return Math.min(MAX_KM, Math.max(MIN_KM, n))
}

function LoopDistanceControl({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const commitDraft = () => {
    const next = clampNaturalKm(draft)
    setEditing(false)
    if (next == null) return
    if (next !== value) onChange(next)
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor="loop-distance-range" className="text-[15px] font-bold text-[#4a3226]">
          Dystans
        </label>
        <div className="flex items-center gap-1 rounded-xl border-2 border-[#C4A574] bg-white px-2.5 py-1.5 focus-within:border-[#FC6C26] focus-within:ring-2 focus-within:ring-[#FC6C26]/25">
          <input
            id="loop-distance-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Dystans pętli w kilometrach"
            value={editing ? draft : String(value)}
            onFocus={() => {
              setEditing(true)
              setDraft(String(value))
            }}
            onChange={(event) => {
              const raw = event.target.value.replace(/\D/g, '')
              setDraft(raw)
            }}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
            className="w-12 bg-transparent text-right text-base font-bold tabular-nums text-[#FC6C26] outline-none"
          />
          <span className="text-sm font-bold text-[#FC6C26]">km</span>
        </div>
      </div>
      <input
        id="loop-distance-range"
        type="range"
        min={MIN_KM}
        max={MAX_KM}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="loop-distance-range h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-[#f5d0b8]"
      />
      <div className="mt-1 flex justify-between text-xs text-stone-500">
        <span>{MIN_KM} km</span>
        <span>{MAX_KM} km</span>
      </div>
    </div>
  )
}

export default LoopDistanceControl
