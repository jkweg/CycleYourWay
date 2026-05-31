import { useState } from 'react'

function SaveRouteModal({ isOpen, defaultName, isSaving, onClose, onSave }) {
  const [name, setName] = useState(defaultName)

  if (!isOpen) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed)
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
      <div
        className="soft-panel w-full max-w-md rounded-2xl border border-[#e8dfcf] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-route-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="save-route-title" className="text-xl font-semibold text-[#2e5f43]">
              Zapisz trasę
            </h2>
            <p className="mt-1 text-sm text-stone-600">Podaj nazwę, aby łatwo ją odnaleźć później.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="route-name" className="mb-1 block text-sm font-medium text-stone-700">
              Nazwa trasy
            </label>
            <input
              id="route-name"
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-[#dfd4c2] bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-2"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="soft-button flex-1 rounded-xl border border-[#dfd4c2] bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-[#f3ede2]"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="soft-button flex-1 rounded-xl bg-[#3f7b57] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#356b4b] disabled:opacity-60"
            >
              {isSaving ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SaveRouteModal
