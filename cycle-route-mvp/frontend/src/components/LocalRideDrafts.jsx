import { useEffect, useState } from 'react'
import {
  RIDE_DRAFT_RETENTION_DAYS,
  canRestoreRideDraft,
  deleteRideDraft,
  isRideDraftExpired,
  listRideDrafts,
  rideDraftExpiresAt,
} from '../lib/rideDraftStore'
import { clearAddressHistory, readAddressHistory } from '../lib/addressHistory'
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
  const [historyCount, setHistoryCount] = useState(() => readAddressHistory().length)

  useEffect(() => {
    let cancelled = false
    listRideDrafts()
      .then((records) => {
        if (cancelled) return
        const now = Date.now()
        setDrafts(records.filter((draft) => canRestoreRideDraft(draft, userId) && !isRideDraftExpired(draft, now)))
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
    <div className="rounded-[22px] border border-[#EFE0BC] bg-white p-4">
      <h3 className="font-semibold text-ink">Jazdy na tym urządzeniu</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        Niewysłane jazdy (ślad GPS i liczniki) zostają tylko w tym telefonie lub przeglądarce, żeby nie przepadły bez
        sieci. Znikają po zapisaniu na koncie albo po {RIDE_DRAFT_RETENTION_DAYS} dniach.
      </p>

      {error && <p className="mt-3 rounded-2xl bg-[#FDE7DF] px-3 py-2 text-sm text-[#6E1C12]">{error}</p>}

      {isLoading ? (
        <div className="mt-3 h-14 animate-pulse rounded-2xl bg-vanilla-deep" />
      ) : drafts.length === 0 ? (
        <p className="mt-3 text-sm text-[#6B4E3D]">Brak niewysłanych jazd.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {drafts.map((draft) => {
            const distance = draftDistanceKm(draft)
            return (
              <li key={draft.sessionId} className="rounded-2xl bg-vanilla px-3 py-3">
                <p className="truncate text-[15px] font-semibold text-ink">{draft.route?.name || 'Jazda bez nazwy'}</p>
                <p className="text-[13px] text-[#6B4E3D]">
                  {STATUS_LABELS[draft.status] || draft.status} · {formatDateTime(draftStartedAt(draft))}
                  {distance ? ` · ${distance}` : ''}
                </p>
                <p className="text-xs text-[#8C6B52]">
                  Usunięcie automatyczne: {formatDateTime(rideDraftExpiresAt(draft))}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDraft?.(draft)}
                    className="press h-9 rounded-full bg-ink px-4 text-sm font-bold text-white"
                  >
                    {draft.status === 'completed' ? 'Otwórz i wyślij' : 'Wznów'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(draft.sessionId)}
                    className={`press h-9 rounded-full px-4 text-sm font-bold ${
                      confirmId === draft.sessionId
                        ? 'bg-[#B4231A] text-white'
                        : 'border-[1.5px] border-ink/20 text-ink'
                    }`}
                  >
                    {confirmId === draft.sessionId ? 'Potwierdź usunięcie' : 'Usuń'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1E6CC] pt-3 text-sm text-ink-muted">
        <span>Historia wyszukiwanych adresów: {historyCount > 0 ? `${historyCount} (tylko tutaj)` : 'pusta'}</span>
        {historyCount > 0 && (
          <button
            type="button"
            onClick={() => {
              clearAddressHistory()
              setHistoryCount(0)
            }}
            className="press h-9 rounded-full border-[1.5px] border-ink/20 px-4 text-sm font-bold text-ink"
          >
            Wyczyść historię
          </button>
        )}
      </div>
    </div>
  )
}

export default LocalRideDrafts
