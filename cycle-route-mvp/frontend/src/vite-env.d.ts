/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_APP_ORIGIN?: string
  readonly VITE_MAP_TILES_URL?: string
  readonly VITE_MAP_TILES_ATTR?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_ENABLE_BG_GPS?: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  gtag?: (...args: unknown[]) => void
}
