import { useEffect, useState } from 'react'
import App from './App.jsx'
import { AuthProvider } from './AuthContext.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'

export default function Root() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    document.getElementById('boot-splash')?.remove()
  }, [])

  return (
    <>
      {showSplash ? <LoadingScreen onComplete={() => setShowSplash(false)} /> : null}
      <AuthProvider>
        <App />
      </AuthProvider>
    </>
  )
}
