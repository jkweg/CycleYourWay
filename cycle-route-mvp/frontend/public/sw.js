// Minimalny service worker - umożliwia instalację PWA i offline app-shell.
// Pełne cache'owanie kafelków mapy offline planujemy w kolejnym etapie.
const CACHE = 'cyw-shell-v1'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/app-icon.svg']

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
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // API i kafelki mapy zawsze z sieci (świeże dane, bez psucia cache).
  if (url.pathname.startsWith('/api') || url.hostname.includes('tile.openstreetmap')) {
    return
  }

  // Nawigacja po SPA -> network-first z fallbackiem do app-shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((res) => res || fetch(request))),
    )
    return
  }

  // Pozostałe zasoby: cache-first z dogrywaniem do cache.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, clone).catch(() => undefined))
          return response
        }),
    ),
  )
})
