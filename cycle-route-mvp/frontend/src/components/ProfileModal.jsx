import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../useAuth'

function ProfileModal({ isOpen, onClose, onApplied }) {
  const { user, isAuthenticated } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [preferAvoidMainRoads, setPreferAvoidMainRoads] = useState(false)
  const [defaultLoopDistanceKm, setDefaultLoopDistanceKm] = useState(30)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !user?.id) return undefined

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError('')
      setInfo('')
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('display_name, prefer_avoid_main_roads, default_loop_distance_km')
          .eq('id', user.id)
          .maybeSingle()

        if (fetchError) throw new Error(fetchError.message)
        if (cancelled) return

        if (data) {
          setDisplayName(data.display_name || '')
          setPreferAvoidMainRoads(Boolean(data.prefer_avoid_main_roads))
          setDefaultLoopDistanceKm(
            Number.isFinite(data.default_loop_distance_km)
              ? data.default_loop_distance_km
              : 30,
          )
        } else {
          setDisplayName(user.email?.split('@')[0] || '')
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError.message.includes('relation') || loadError.message.includes('schema cache')
              ? 'Tabela profiles nie istnieje — uruchom supabase/profiles.optional.sql w SQL Editor.'
              : loadError.message || 'Nie udało się wczytać profilu.',
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [isOpen, isAuthenticated, user])

  if (!isOpen) return null

  const handleSave = async (event) => {
    event.preventDefault()
    if (!user?.id) return

    setIsSaving(true)
    setError('')
    setInfo('')

    try {
      const payload = {
        id: user.id,
        display_name: displayName.trim() || null,
        prefer_avoid_main_roads: preferAvoidMainRoads,
        default_loop_distance_km: Math.min(100, Math.max(5, Number(defaultLoopDistanceKm) || 30)),
      }

      const { error: upsertError } = await supabase.from('profiles').upsert(payload)
      if (upsertError) throw new Error(upsertError.message)

      setInfo('Zapisano preferencje.')
      onApplied?.(payload)
    } catch (saveError) {
      setError(saveError.message || 'Nie udało się zapisać profilu.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
      <div
        className="soft-panel w-full max-w-md rounded-2xl border border-[#e8dfcf] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="profile-modal-title" className="text-xl font-semibold text-[#2e5f43]">
              Profil
            </h2>
            <p className="mt-1 text-sm text-stone-600">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100"
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-stone-600">Ładowanie…</p>
        ) : (
          <form className="space-y-4" onSubmit={handleSave}>
            <div>
              <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-stone-700">
                Wyświetlana nazwa
              </label>
              <input
                id="profile-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-lg border border-[#dfd4c2] px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-2"
              />
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-[#eadfcf] bg-[#faf7f1] p-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={preferAvoidMainRoads}
                onChange={(event) => setPreferAvoidMainRoads(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                Domyślnie unikaj dróg głównych przy planowaniu tras.
              </span>
            </label>

            <div>
              <div className="mb-1 flex items-center justify-between text-sm font-medium text-stone-700">
                <label htmlFor="profile-loop">Domyślny dystans pętli</label>
                <span>{defaultLoopDistanceKm} km</span>
              </div>
              <input
                id="profile-loop"
                type="range"
                min={5}
                max={100}
                value={defaultLoopDistanceKm}
                onChange={(event) => setDefaultLoopDistanceKm(Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#d9e6dc]"
              />
            </div>

            {error && <p className="text-sm font-medium text-rose-700">{error}</p>}
            {info && <p className="text-sm font-medium text-emerald-700">{info}</p>}

            <button
              type="submit"
              disabled={isSaving}
              className="soft-button w-full rounded-xl bg-[#3f7b57] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#356b4b] disabled:opacity-60"
            >
              {isSaving ? 'Zapisywanie…' : 'Zapisz profil'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ProfileModal
