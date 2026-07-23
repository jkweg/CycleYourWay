import { useState } from 'react'
import { useAuth } from './useAuth'

function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const {
    login,
    register,
    requestPasswordReset,
    updatePassword,
    passwordRecovery,
    clearPasswordRecovery,
  } = useAuth()

  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const activeMode = passwordRecovery ? 'newPassword' : mode

  const title =
    activeMode === 'login'
      ? 'Zaloguj się'
      : activeMode === 'register'
        ? 'Utwórz konto'
        : activeMode === 'forgot'
          ? 'Reset hasła'
          : 'Nowe hasło'

  const subtitle =
    activeMode === 'forgot'
      ? 'Wyślemy link do zresetowania hasła na Twój e-mail.'
      : activeMode === 'newPassword'
        ? 'Wpisz nowe hasło (minimum 6 znaków).'
        : 'Zapisuj trasy i wracaj do nich w dowolnym momencie.'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    setIsSubmitting(true)

    try {
      if (activeMode === 'login') {
        await login(email, password)
        setEmail('')
        setPassword('')
        onClose()
      } else if (activeMode === 'register') {
        await register(email, password)
        setEmail('')
        setPassword('')
        onClose()
      } else if (activeMode === 'forgot') {
        await requestPasswordReset(email)
        setInfo('Jeśli konto istnieje, wysłaliśmy e-mail z linkiem do resetu hasła.')
      } else if (activeMode === 'newPassword') {
        await updatePassword(password)
        setPassword('')
        setInfo('Hasło zostało zmienione. Możesz korzystać z konta.')
        onClose()
      }
    } catch (submitError) {
      setError(submitError.message || 'Nie udało się wykonać operacji.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (activeMode === 'newPassword') {
      clearPasswordRecovery()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm">
      <div
        className="soft-panel w-full max-w-md rounded-2xl border border-[#e8dfcf] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-modal-title" className="text-xl font-semibold text-[#2e5f43]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-2 py-1 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>

        {(activeMode === 'login' || activeMode === 'register') && (
          <div className="mb-4 grid grid-cols-2 rounded-xl border border-[#eadfcf] bg-[#f4efe6] p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError('')
                setInfo('')
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeMode === 'login'
                  ? 'bg-white text-[#2e5f43] shadow-sm'
                  : 'text-stone-600 hover:text-[#6f553b]'
              }`}
            >
              Logowanie
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register')
                setError('')
                setInfo('')
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeMode === 'register'
                  ? 'bg-white text-[#2e5f43] shadow-sm'
                  : 'text-stone-600 hover:text-[#6f553b]'
              }`}
            >
              Rejestracja
            </button>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {activeMode !== 'newPassword' && (
            <div>
              <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-stone-700">
                E-mail
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-[#dfd4c2] bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-2"
              />
            </div>
          )}

          {(activeMode === 'login' ||
            activeMode === 'register' ||
            activeMode === 'newPassword') && (
            <div>
              <label
                htmlFor="auth-password"
                className="mb-1 block text-sm font-medium text-stone-700"
              >
                Hasło
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-[#dfd4c2] bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-2"
              />
              {(activeMode === 'register' || activeMode === 'newPassword') && (
                <p className="mt-1 text-xs text-stone-500">Minimum 6 znaków.</p>
              )}
            </div>
          )}

          {activeMode === 'login' && (
            <button
              type="button"
              onClick={() => {
                setMode('forgot')
                setError('')
                setInfo('')
                setPassword('')
              }}
              className="text-xs font-medium text-[#3f7b57] hover:underline"
            >
              Nie pamiętam hasła
            </button>
          )}

          {error && <p className="text-sm font-medium text-rose-700">{error}</p>}
          {info && <p className="text-sm font-medium text-emerald-700">{info}</p>}
          {passwordRecovery && !info && (
            <p className="text-sm font-medium text-emerald-700">
              Ustaw nowe hasło dla swojego konta.
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="soft-button w-full rounded-xl bg-[#3f7b57] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#356b4b] disabled:opacity-60"
          >
            {isSubmitting
              ? 'Proszę czekać...'
              : activeMode === 'login'
                ? 'Zaloguj'
                : activeMode === 'register'
                  ? 'Zarejestruj się'
                  : activeMode === 'forgot'
                    ? 'Wyślij link resetujący'
                    : 'Zapisz nowe hasło'}
          </button>

          {activeMode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError('')
                setInfo('')
              }}
              className="w-full text-center text-xs font-medium text-stone-600 hover:underline"
            >
              Wróć do logowania
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

export default AuthModal
