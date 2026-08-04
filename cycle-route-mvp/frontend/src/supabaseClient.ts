import { createClient } from '@supabase/supabase-js'
import type { SavedRoute } from './types/geo'

function normalizeSupabaseUrl(rawUrl: string | undefined): string {
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

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    global: {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)

export type SavedRouteRow = {
  id: string
  name: string
  mode?: string | null
  geojson?: unknown
  distance_km?: number | string | null
  duration_seconds?: number | null
  is_public?: boolean | null
  is_favorite?: boolean | null
  tags?: unknown
  created_at?: string | null
}

export function mapSavedRouteRow(row: SavedRouteRow): SavedRoute {
  return {
    id: row.id,
    name: row.name,
    mode: row.mode ?? null,
    geojson: row.geojson,
    distanceKm: row.distance_km != null ? Number(row.distance_km) : null,
    durationSeconds: row.duration_seconds ?? null,
    isPublic: Boolean(row.is_public),
    isFavorite: Boolean(row.is_favorite),
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean).map(String) : [],
    createdAt: row.created_at ?? null,
  }
}

export { supabaseUrl, supabaseAnonKey }
