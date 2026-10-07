import { useEffect, useState } from 'react'
import {
  RIDE_DRAFT_RETENTION_DAYS,
  canRestoreRideDraft,
  deleteRideDraft,
  isRideDraftExpired,
  listRideDrafts,
  rideDraftExpiresAt,
} from '../lib/rideDraftStore'
import { captureException } from '../lib/monitoring'

const STATUS_LABELS = {
  active: 'Przerwana w trakcie',
  completed: 'Zakończona, niewysłana',
}

function formatDateTime(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function draftStartedAt(draft) {
  return draft.summary?.startedAt || draft.runtime?.startedAt || draft.updatedAt
}

function draftDistanceKm(draft) {
  const meters = Number(draft.summary?.distanceMeters)
  return Number.isFinite(meters) ? `${(meters / 1000).toFixed(1)} km` : null
}

// Lists unsent rides kept in IndexedDB on this device (only those the current
// account may open) with explicit open/delete and the automatic retention date.
function LocalRideDrafts({ userId, onOpenDraft }) {
  const [drafts, setDrafts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => {
    let cancelled = false
    listRideDrafts()
      .then((records) => {
        if (cancelled) return
        const now = Date.now()
        setDrafts(
          records.filter(
            (draft) => canRestoreRideDraft(draft, userId) && !isRideDraftExpired(draft, now),
          ),
        )
      })
      .catch((loadError) => {
        captureException(loadError, { where: 'listLocalRideDrafts' })
        if (!cancelled) setError('Nie udało się odczytać jazd zapisanych na tym urządzeniu.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const handleDelete = async (sessionId) => {
    if (confirmId !== sessionId) {
      setConfirmId(sessionId)
      return
    }
    setConfirmId(null)
    try {
      await deleteRideDraft(sessionId)
      setDrafts((current) => current.filter((draft) => draft.sessionId !== sessionId))
    } catch (deleteError) {
      captureException(deleteError, { where: 'deleteLocalRideDraft' })
      setError('Nie udało się usunąć jazdy z tego urządzenia.')
    }
  }

  return (
    <div className="rounded-xl border border-[#f0d4b8] bg-[#FFF8E8] p-4">
      <h3 className="font-semibold text-[#FC6C26]">Jazdy na tym urządzeniu</h3>
      <p className="mt-1 text-sm text-stone-600">
        Niewysłane jazdy (ślad GPS i liczniki) są przechowywane tylko lokalnie, aby nie przepadły
        po przeładowaniu lub utracie sieci. Usuwamy je po zapisaniu na koncie albo automatycznie po{' '}
        {RIDE_DRAFT_RETENTION_DAYS} dniach od ostatniej zmiany.
      </p>

      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}

      {isLoading ? (
        <p className="mt-3 text-sm text-stone-500">Sprawdzanie…</p>
      ) : drafts.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">Brak niewysłanych jazd na tym urządzeniu.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {drafts.map((draft) => {
            const distance = draftDistanceKm(draft)
            return (
              <li
                key={draft.sessionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#f0d4b8] bg-white px-3 py-2"
              >
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium text-stone-800">
                    {draft.route?.name || 'Jazda bez nazwy'}
                  </p>
                  <p className="text-xs text-stone-500">
                    {STATUS_LABELS[draft.status] || draft.status} · {formatDateTime(draftStartedAt(draft))}
                    {distance ? ` · ${distance}` : ''}
                  </p>
                  <p className="text-xs text-stone-400">
                    Usunięcie automatyczne: {formatDateTime(rideDraftExpiresAt(draft))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDraft?.(draft)}
                    className="soft-button rounded-xl border border-[#E08A50] bg-white px-3 py-1.5 text-xs font-semibold text-[#E05518]"
                  >
                    {draft.status === 'completed' ? 'Otwórz i wyślij' : 'Wznów'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(draft.sessionId)}
                    className="soft-button rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800"
                  >
                    {confirmId === draft.sessionId ? 'Potwierdź usunięcie' : 'Usuń'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default LocalRideDrafts
