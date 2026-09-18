// Service Worker for Padhai Buddy PWA
// This SW caches static assets for offline support
// It does NOT cache API responses or authenticated content

const CACHE_NAME = 'padhai-buddy-v1';
const STATIC_CACHE_NAME = 'padhai-buddy-static-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/brand/favicon-192.png',
  '/brand/favicon-512.png',
  '/icon.png',
  '/apple-icon.png',
];

// Paths that should never be cached
const NEVER_CACHE_PATHS = [
  '/api/',
  '/dashboard/chat',
  '/dashboard/photo-doubt',
  '/dashboard/quiz',
  '/dashboard/profile',
  '/dashboard/settings',
  '/dashboard/notifications',
  '/admin',
  '/_next/data/', // Next.js data fetching
  '/__nextjs_original_response', // Next.js internal
];

// Check if a request should be cached
function shouldCache(request) {
  const url = new URL(request.url);
  
  // Never cache API routes or authenticated pages
  if (NEVER_CACHE_PATHS.some(path => url.pathname.startsWith(path))) {
    return false;
  }
  
  // Only cache GET requests
  if (request.method !== 'GET') {
    return false;
  }
  
  // Only cache same-origin requests
  if (url.origin !== self.location.origin) {
    return false;
  }
  
  // Don't cache requests with auth headers
  if (request.headers.has('authorization') || request.headers.has('cookie')) {
    return false;
  }
  
  return true;
}

// Check if response is cacheable
function isCacheableResponse(response) {
  return response.status === 200 && response.type === 'basic';
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { credentials: 'same-origin' })));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip if we shouldn't cache this request
  if (!shouldCache(request)) {
    return;
  }
  
  // Network-first strategy for navigation requests (HTML pages)
  const isNavigation = request.mode === 'navigate';
  
  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (isCacheableResponse(response)) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback - try cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline page or basic response
              return new Response(
                `<!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>Padhai Buddy - Offline</title>
                  <style>
                    body { font-family: system-ui; padding: 2rem; text-align: center; background: #0B0F14; color: white; }
                    .icon { font-size: 4rem; margin-bottom: 1rem; }
                  </style>
                </head>
                <body>
                  <div class="icon">📚</div>
                  <h1>Padhai Buddy</h1>
                  <p>You're offline. Some features may not be available.</p>
                  <p><a href="/" style="color: #0D9488;">Try again</a></p>
                </body>
                </html>`,
                {
                  status: 200,
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            });
        })
    );
    return;
  }
  
  // Cache-first strategy for static assets (CSS, JS, images, fonts)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache, update in background
          event.waitUntil(
            fetch(request)
              .then((networkResponse) => {
                if (isCacheableResponse(networkResponse)) {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, networkResponse.clone());
                  });
                }
              })
              .catch(() => {}) // Ignore network errors for background update
          );
          return cachedResponse;
        }
        
        // Not in cache - fetch from network
        return fetch(request)
          .then((networkResponse) => {
            if (isCacheableResponse(networkResponse)) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // For images, return a placeholder
            if (request.destination === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#1a1f2e" width="200" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#444" font-family="system-ui" font-size="14">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
            // For other assets, just fail
            throw new Error('Offline and not cached');
          });
      })
  );
});

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'getVersion') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] Service Worker loaded');