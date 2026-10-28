// Offline support for the installed app: the page and its files are cached as
// they load; listings come from the network first and fall back to the last
// copy, so the app still opens on a train with no signal.
const CACHE = 'wg-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  const scope = new URL(self.registration.scope).pathname
  // Listings and pages: network first, cached copy when offline.
  if (url.pathname.endsWith('/data/events.json') || req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? scope : req, copy))
          return res
        })
        .catch(() => caches.match(req.mode === 'navigate' ? scope : req).then((r) => r || caches.match(scope))),
    )
    return
  }
  // Built files have hashed names, so a cached copy is always right.
  if (url.pathname.includes('/assets/') || url.pathname.includes('/icons/')) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
            return res
          }),
      ),
    )
  }
})
