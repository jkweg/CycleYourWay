import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { getAppOrigin } from './lib/appOrigin'
import { supabase } from './supabaseClient'

function mapUser(authUser) {
  if (!authUser) return null
  return {
    id: authUser.id,
    email: authUser.email ?? '',
  }
}

function polishAuthError(message) {
  const text = String(message || '')
  if (/invalid login credentials/i.test(text)) {
    return 'Nieprawidłowy e-mail lub hasło.'
  }
  if (/email not confirmed/i.test(text)) {
    return 'Potwierdź e-mail, zanim się zalogujesz (sprawdź skrzynkę).'
  }
  if (/user already registered/i.test(text)) {
    return 'Konto z tym e-mailem już istnieje — zaloguj się.'
  }
  if (/password/i.test(text) && /at least/i.test(text)) {
    return 'Hasło jest zbyt krótkie (minimum 6 znaków).'
  }
  return text || 'Nie udało się wykonać operacji.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setUser(mapUser(data.session?.user ?? null))
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(mapUser(session?.user ?? null))
      setIsLoading(false)
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(polishAuthError(error.message))
    setPasswordRecovery(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw new Error(polishAuthError(error.message))
    const mapped = mapUser(data.user)
    setUser(mapped)
    return mapped
  }, [])

  const register = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${getAppOrigin()}/`,
      },
    })
    if (error) throw new Error(polishAuthError(error.message))

    if (!data.session) {
      throw new Error(
        'Konto utworzone. Sprawdź e-mail i potwierdź rejestrację, albo wyłącz Confirm email w Supabase (Authentication → Providers).',
      )
    }

    const mapped = mapUser(data.user)
    setUser(mapped)
    return mapped
  }, [])

  const requestPasswordReset = useCallback(async (email) => {
    const redirectTo = `${getAppOrigin()}/`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })
    if (error) throw new Error(polishAuthError(error.message))
  }, [])

  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(polishAuthError(error.message))
    setPasswordRecovery(false)
  }, [])

  const loginWithGoogle = useCallback(async () => {
    const redirectTo = `${getAppOrigin()}/`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) throw new Error(polishAuthError(error.message))
  }, [])

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecovery(false)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      passwordRecovery,
      login,
      loginWithGoogle,
      register,
      logout,
      requestPasswordReset,
      updatePassword,
      clearPasswordRecovery,
    }),
    [
      user,
      isLoading,
      passwordRecovery,
      login,
      loginWithGoogle,
      register,
      logout,
      requestPasswordReset,
      updatePassword,
      clearPasswordRecovery,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
