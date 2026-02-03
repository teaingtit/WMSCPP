/**
 * Service Worker for WMS PWA
 * Provides offline caching and background sync capabilities
 */

const CACHE_NAME = 'wms-cache-v1';
const OFFLINE_URL = '/offline';

// Resources to cache immediately on install
const PRECACHE_RESOURCES = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Cache strategies
const CACHE_FIRST_PATTERNS = [
  /\.(js|css|woff2?|ttf|eot)$/,
  /\/_next\/static\//,
  /\/icons\//,
];

const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /\/dashboard\//,
  /supabase/,
];

// Install event - precache critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching resources');
      return cache.addAll(PRECACHE_RESOURCES);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch event - handle caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests except for Supabase
  if (url.origin !== self.location.origin && !url.hostname.includes('supabase')) {
    return;
  }

  // Determine caching strategy
  const isCacheFirst = CACHE_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname));
  const isNetworkFirst = NETWORK_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname));

  if (isCacheFirst) {
    event.respondWith(cacheFirst(request));
  } else if (isNetworkFirst) {
    event.respondWith(networkFirst(request));
  } else {
    // Default: stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Cache-first strategy (for static assets)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy (for API/dynamic content)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/dashboard') || new Response('Offline', { status: 503 });
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Stale-while-revalidate strategy (default)
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(CACHE_NAME);
        cache.then((c) => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return new Response('Offline', { status: 503 });
    });

  return cachedResponse || fetchPromise;
}

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-operations') {
    event.waitUntil(syncPendingOperations());
  }
});

async function syncPendingOperations() {
  // This would be handled by the app via the useOfflineSync hook
  // The service worker just triggers the sync event
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_REQUESTED' });
  });
}

// Push notifications (future use)
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'WMS Notification';
  const options = {
    body: data.body || 'มีการอัพเดทใหม่',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: data.url || '/dashboard',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/dashboard')
  );
});

// Message handler for communication with the app
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'CACHE_URLS') {
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(event.data.urls || []);
    });
  }
});
