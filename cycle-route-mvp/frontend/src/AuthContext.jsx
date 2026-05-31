import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { supabase } from './supabaseClient'

function mapUser(authUser) {
  if (!authUser) return null
  return {
    id: authUser.id,
    email: authUser.email ?? '',
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user ?? null))
      setIsLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw new Error(error.message)
    const mapped = mapUser(data.user)
    setUser(mapped)
    return mapped
  }, [])

  const register = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    if (error) throw new Error(error.message)

    if (!data.session) {
      throw new Error(
        'Konto utworzone. Sprawdź e-mail i potwierdź rejestrację, albo wyłącz Confirm email w Supabase.',
      )
    }

    const mapped = mapUser(data.user)
    setUser(mapped)
    return mapped
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
