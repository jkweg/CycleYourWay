import { useEffect, useState } from 'react'
import App from './App.jsx'
import { AuthProvider } from './AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingScreen from './components/LoadingScreen.jsx'
import TopRouteBar from './components/TopRouteBar.jsx'
import { hasSeenIntro, markIntroSeen, signalIntroDone } from './lib/intro'
import { setSystemBarsTone } from './lib/systemBars'
import { LegalStandalone, type LegalDocType } from './components/LegalPage'

function legalTypeFromPath(pathname: string): LegalDocType | null {
  const path = (pathname || '').replace(/\/+$/, '') || '/'
  if (path === '/privacy' || path === '/polityka-prywatnosci') return 'privacy'
  if (path === '/terms' || path === '/regulamin') return 'terms'
  return null
}

export default function Root() {
  const legalType = legalTypeFromPath(window.location.pathname)
  // The full intro plays only on the first visit on this device.
  const [firstRun] = useState(() => !legalType && !hasSeenIntro())
  const [showIntro, setShowIntro] = useState(firstRun)

  useEffect(() => {
    document.getElementById('boot-splash')?.remove()
    setSystemBarsTone(firstRun ? 'dark' : 'light')
    if (!firstRun) signalIntroDone()
  }, [firstRun])

  const finishIntro = () => {
    markIntroSeen()
    setSystemBarsTone('light')
    setShowIntro(false)
    signalIntroDone()
  }

  if (legalType) {
    return <LegalStandalone type={legalType} />
  }

  return (
    <>
      {showIntro ? <LoadingScreen onComplete={finishIntro} /> : null}
      {!firstRun ? <TopRouteBar /> : null}
      <ErrorBoundary where="root">
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </>
  )
}
