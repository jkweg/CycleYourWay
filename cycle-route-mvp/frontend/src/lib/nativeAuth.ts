import { supabase } from '../supabaseClient'

// Google blocks OAuth inside an embedded WebView ("disallowed_useragent"), so in the
// Android app the sign-in runs in the system browser (Custom Tabs) and comes back
// through the app's own scheme (AndroidManifest: com.cycleyourway.app).
// This URL must be listed in Supabase → Authentication → URL Configuration → Redirect URLs.
export const NATIVE_AUTH_CALLBACK = 'com.cycleyourway.app://auth-callback'

export async function signInWithGoogleInSystemBrowser(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: NATIVE_AUTH_CALLBACK,
      skipBrowserRedirect: true,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
  if (error) throw error
  if (!data?.url) throw new Error('Brak adresu logowania Google.')
  const { Browser } = await import('@capacitor/browser')
  await Browser.open({ url: data.url })
}

const AUTH_PARAM = /[?#&](code|access_token|error|error_description)=/

/**
 * True for the app-scheme callback and for any opened URL that carries an OAuth
 * result — e.g. when Supabase falls back to the Site URL (https://cycleyourway.pl/#access_token=…)
 * because the app scheme is missing from its Redirect URLs.
 */
export function isNativeAuthCallback(url: string): boolean {
  if (typeof url !== 'string') return false
  return url.startsWith(NATIVE_AUTH_CALLBACK) || AUTH_PARAM.test(url)
}

/** What came back, without tokens — for logs. */
export function describeAuthCallback(url: string): string {
  try {
    const parsed = new URL(url)
    const keys = [...parsed.searchParams.keys(), ...new URLSearchParams(parsed.hash.replace(/^#/, '')).keys()]
    return `${parsed.protocol}//${parsed.host} params=[${keys.join(',')}]`
  } catch {
    return 'unparseable url'
  }
}

/**
 * Finishes a sign-in that returned to `NATIVE_AUTH_CALLBACK`. Supports both the PKCE
 * (`?code=`) and the implicit (`#access_token=`) response. Throws on an OAuth error.
 */
export async function completeNativeAuth(url: string): Promise<void> {
  try {
    const { Browser } = await import('@capacitor/browser')
    await Browser.close()
  } catch {
    // Custom Tab already closed by the redirect.
  }

  const parsed = new URL(url)
  const query = parsed.searchParams
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  const oauthError = query.get('error_description') || hash.get('error_description') || query.get('error') || hash.get('error')
  if (oauthError) throw new Error(oauthError)

  const code = query.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return
  }

  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    if (error) throw error
    return
  }

  throw new Error('Logowanie nie zwróciło sesji.')
}
