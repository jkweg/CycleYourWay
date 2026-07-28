import { useState } from 'react'

const MIN_KM = 5
const MAX_KM = 100

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
      <div className="mb-1 flex items-center justify-between gap-3 text-sm font-semibold text-stone-800">
        <label htmlFor="loop-distance-range">Dystans pętli</label>
        <div className="flex items-center gap-1 rounded-md border border-[#E08A50]/50 bg-[#FFF4D6] px-2 py-1 shadow-sm focus-within:border-[#FC6C26] focus-within:ring-2 focus-within:ring-[#FC6C26]/25">
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
            className="w-10 bg-transparent text-right text-sm font-semibold tabular-nums text-[#FC6C26] outline-none"
          />
          <span className="text-sm font-semibold text-[#FC6C26]">km</span>
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
        className="loop-distance-range h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#f5d0b8]"
      />
      <div className="mt-1 flex justify-between text-xs text-stone-700">
        <span>{MIN_KM} km</span>
        <span>{MAX_KM} km</span>
      </div>
    </div>
  )
}

export default LoopDistanceControl
