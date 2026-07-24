import { useState } from 'react'

function SaveRouteModal({
  isOpen,
  defaultName,
  isSaving,
  canOverwrite = false,
  onClose,
  onSave,
}) {
  const [name, setName] = useState(defaultName)

  if (!isOpen) return null

  const handleSubmit = (event, mode = 'insert') => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed, mode)
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
      <div
        className="soft-panel w-full max-w-md rounded-2xl border border-burnt-orange/20 bg-vanilla p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-route-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="save-route-title" className="text-xl font-semibold text-burnt-orange">
              Zapisz trasę
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              {canOverwrite
                ? 'Możesz nadpisać wczytaną trasę albo zapisać ją jako nową.'
                : 'Podaj nazwę, aby łatwo ją odnaleźć później.'}
            </p>
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

        <form className="space-y-4" onSubmit={(event) => handleSubmit(event, canOverwrite ? 'update' : 'insert')}>
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
              className="w-full rounded-lg border border-burnt-orange/25 bg-white px-3 py-2 text-sm outline-none ring-burnt-orange/30 focus:ring-2"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="soft-button flex-1 rounded-xl border border-burnt-orange/25 bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-vanilla-deep"
            >
              Anuluj
            </button>
            {canOverwrite ? (
              <>
                <button
                  type="button"
                  disabled={isSaving || !name.trim()}
                  onClick={(event) => handleSubmit(event, 'insert')}
                  className="soft-button flex-1 rounded-xl border border-burnt-orange/25 bg-burnt-orange/10 px-4 py-2.5 text-sm font-semibold text-burnt-orange hover:bg-burnt-orange/15 disabled:opacity-60"
                >
                  {isSaving ? 'Zapisywanie...' : 'Zapisz jako nową'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !name.trim()}
                  className="soft-button flex-1 rounded-xl bg-burnt-orange px-4 py-2.5 text-sm font-semibold text-vanilla hover:bg-burnt-orange-dark disabled:opacity-60"
                >
                  {isSaving ? 'Zapisywanie...' : 'Nadpisz'}
                </button>
              </>
            ) : (
              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="soft-button flex-1 rounded-xl bg-burnt-orange px-4 py-2.5 text-sm font-semibold text-vanilla hover:bg-burnt-orange-dark disabled:opacity-60"
              >
                {isSaving ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default SaveRouteModal
