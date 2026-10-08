import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts are bundled and served from our own origin (no request to Google Fonts).
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource/great-vibes/400.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/500.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/source-sans-3/700.css'
import './index.css'
import Root from './Root'
import { warnMissingProdEnv } from './lib/env'
import { initMonitoring } from './lib/monitoring'

warnMissingProdEnv()
void initMonitoring()

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found')
}

createRoot(rootEl).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        registration.update().catch(() => undefined)
      })
      .catch(() => undefined)
  })
}
