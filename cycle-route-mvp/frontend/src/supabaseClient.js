import { createClient } from '@supabase/supabase-js'

function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl) return ''
  return rawUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '')
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Brak VITE_SUPABASE_URL lub VITE_SUPABASE_ANON_KEY — logowanie i zapis tras nie zadziałają.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function mapSavedRouteRow(row) {
  return {
    id: row.id,
    name: row.name,
    mode: row.mode,
    geojson: row.geojson,
    distanceKm: row.distance_km != null ? Number(row.distance_km) : null,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
  }
}
