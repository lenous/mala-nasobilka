const CACHE_NAME = 'mala-nasobilka-v4'
const BASE = '/mala-nasobilka/'
const ASSETS = [BASE, `${BASE}manifest.webmanifest`, `${BASE}app-icon.svg`]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            cache.put(event.request, response.clone())
          }

          return response
        })
        .catch(async () => {
          return (await cache.match(event.request)) ?? caches.match(BASE)
        }),
    ),
  )
})
