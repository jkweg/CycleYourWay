// Minimalny service worker — instalacja PWA + app-shell.
// NIE cache'ujemy odpowiedzi API / Supabase (dane tras muszą być zawsze świeże).
const CACHE = 'cyw-shell-v3'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/app-icon.png']

const shouldBypassCache = (request, url) => {
  if (request.method !== 'GET') return true

  // Cross-origin data backends — always network (browser default).
  if (url.origin !== self.location.origin) return true

  if (url.pathname.startsWith('/api')) return true

  const accept = request.headers.get('Accept') || ''
  if (accept.includes('application/json')) return true

  return false
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (shouldBypassCache(request, url)) {
    return
  }

  // Nawigacja SPA: network-first, fallback do shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => {
            cache.put('/index.html', clone).catch(() => undefined)
          })
          return response
        })
        .catch(() =>
          caches.match('/index.html').then((res) => res || caches.match('/')),
        ),
    )
    return
  }

  // Zasoby same-origin (JS/CSS z hashem): network-first, żeby deploy od razu działał.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => {
            cache.put(request, clone).catch(() => undefined)
          })
        }
        return response
      })
      .catch(() => caches.match(request)),
  )
})
