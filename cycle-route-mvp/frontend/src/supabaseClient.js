import { createClient } from '@supabase/supabase-js'

function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl) return ''
  return rawUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '')
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

if (import.meta.env.PROD && (!supabaseUrl || !supabaseAnonKey)) {
  console.error(
    'Brak VITE_SUPABASE_URL lub VITE_SUPABASE_ANON_KEY — logowanie i zapis tras nie zadziałają.',
  )
} else if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Brak VITE_SUPABASE_URL lub VITE_SUPABASE_ANON_KEY — logowanie i zapis tras nie zadziałają.',
  )
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')

export function mapSavedRouteRow(row) {
  return {
    id: row.id,
    name: row.name,
    mode: row.mode,
    geojson: row.geojson,
    distanceKm: row.distance_km != null ? Number(row.distance_km) : null,
    durationSeconds: row.duration_seconds,
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at,
  }
}

export { supabaseUrl, supabaseAnonKey }
