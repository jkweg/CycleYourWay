import { useState } from 'react'
import { useAuth } from './useAuth'
import Sheet from './components/ui/Sheet'
import { Button, Field, Notice, Segmented, Spinner } from './components/ui/controls'

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

const COPY = {
  login: { eyebrow: 'Konto', title: 'Witaj z powrotem', description: 'Zaloguj się, żeby zapisywać trasy i wracać do historii jazd.', submit: 'Zaloguj się' },
  register: { eyebrow: 'Konto', title: 'Załóż konto', description: 'Trasy i jazdy zapiszą się na koncie — na komputerze i w telefonie.', submit: 'Utwórz konto' },
  forgot: { eyebrow: 'Hasło', title: 'Reset hasła', description: 'Wyślemy link do ustawienia nowego hasła na Twój e-mail.', submit: 'Wyślij link' },
  newPassword: { eyebrow: 'Hasło', title: 'Nowe hasło', description: 'Ustaw nowe hasło dla swojego konta (minimum 6 znaków).', submit: 'Zapisz hasło' },
}

function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const {
    login,
    loginWithGoogle,
    register,
    requestPasswordReset,
    updatePassword,
    passwordRecovery,
    clearPasswordRecovery,
    oauthError,
  } = useAuth()

  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogle, setIsGoogle] = useState(false)

  const activeMode = passwordRecovery ? 'newPassword' : mode
  const copy = COPY[activeMode]
  const showsEmail = activeMode !== 'newPassword'
  const showsPassword = activeMode !== 'forgot'
  const accountTabs = activeMode === 'login' || activeMode === 'register'

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setInfo('')
    if (next === 'forgot') setPassword('')
  }

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

  const handleGoogle = async () => {
    setError('')
    setIsGoogle(true)
    try {
      // Web: the page navigates to Google. Android: a system browser opens and
      // the result arrives later (App closes this modal once signed in).
      await loginWithGoogle()
    } catch (googleError) {
      setError(googleError.message || 'Nie udało się zalogować przez Google.')
    } finally {
      setIsGoogle(false)
    }
  }

  const handleClose = () => {
    if (activeMode === 'newPassword') clearPasswordRecovery()
    onClose()
  }

  const busy = isSubmitting || isGoogle

  return (
    <Sheet open={isOpen} onClose={handleClose} eyebrow={copy.eyebrow} title={copy.title} description={copy.description} size="sm">
      <div className="space-y-4">
        {accountTabs && (
          <Segmented
            label="Logowanie lub rejestracja"
            value={activeMode}
            onChange={switchMode}
            options={[
              { value: 'login', label: 'Logowanie' },
              { value: 'register', label: 'Rejestracja' },
            ]}
          />
        )}

        {accountTabs && (
          <>
            <Button tone="white" className="w-full" onClick={handleGoogle} disabled={busy}>
              {isGoogle ? <Spinner /> : <GoogleMark />}
              Kontynuuj z Google
            </Button>
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8C6B52]">
              <span className="h-px flex-1 bg-ink/10" />
              albo e-mailem
              <span className="h-px flex-1 bg-ink/10" />
            </div>
          </>
        )}

        <form className="space-y-3.5" onSubmit={handleSubmit}>
          {showsEmail && (
            <Field
              id="auth-email"
              label="E-mail"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ty@przyklad.pl"
            />
          )}
          {showsPassword && (
            <Field
              id="auth-password"
              label="Hasło"
              type="password"
              autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              hint={activeMode === 'login' ? undefined : 'Minimum 6 znaków.'}
            />
          )}

          {activeMode === 'login' && (
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="text-sm font-semibold text-rust underline-offset-4 hover:underline"
            >
              Nie pamiętam hasła
            </button>
          )}

          {(error || oauthError) && <Notice tone="error">{error || oauthError}</Notice>}
          {info && <Notice tone="success">{info}</Notice>}

          <Button type="submit" className="w-full" disabled={busy}>
            {isSubmitting && <Spinner />}
            {isSubmitting ? 'Chwileczkę…' : copy.submit}
          </Button>

          {activeMode === 'forgot' && (
            <Button tone="ghost" className="w-full" onClick={() => switchMode('login')}>
              Wróć do logowania
            </Button>
          )}
        </form>

      </div>
    </Sheet>
  )
}

export default AuthModal
