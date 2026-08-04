import { useEffect, useState } from 'react'
import App from './App.jsx'
import { AuthProvider } from './AuthContext.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import { LegalStandalone } from './components/LegalPage.jsx'

function legalTypeFromPath(pathname) {
  const path = (pathname || '').replace(/\/+$/, '') || '/'
  if (path === '/privacy' || path === '/polityka-prywatnosci') return 'privacy'
  if (path === '/terms' || path === '/regulamin') return 'terms'
  return null
}

export default function Root() {
  const legalType = legalTypeFromPath(window.location.pathname)
  const [showSplash, setShowSplash] = useState(!legalType)

  useEffect(() => {
    document.getElementById('boot-splash')?.remove()
  }, [])

  if (legalType) {
    return <LegalStandalone type={legalType} />
  }

  return (
    <>
      {showSplash ? <LoadingScreen onComplete={() => setShowSplash(false)} /> : null}
      <AuthProvider>
        <App />
      </AuthProvider>
    </>
  )
}
