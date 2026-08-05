import { createContext } from 'react'
import type { AuthUser } from './types/geo'

export type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  passwordRecovery: boolean
  login: (email: string, password: string) => Promise<AuthUser | null>
  loginWithGoogle: () => Promise<void>
  register: (email: string, password: string) => Promise<AuthUser | null>
  logout: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  clearPasswordRecovery: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
