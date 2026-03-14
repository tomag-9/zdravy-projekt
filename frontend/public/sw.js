/**
 * Service Worker for Zdravý Projekt PWA
 *
 * Strategies:
 *  - /api/*   → pass-through (never cached – JWT-protected, must be fresh)
 *  - navigate → network-first with offline.html fallback
 *  - static   → cache-first (JS/CSS/images from Vite build)
 *
 * Push:
 *  - push event → showNotification
 *  - notificationclick → focus existing window or open new one
 *
 * Lifecycle:
 *  - install  → skipWaiting (take control immediately after update)
 *  - activate → clients.claim + prune old caches
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `zdravy-static-${CACHE_VERSION}`;

// Minimal precache – only offline fallback, nothing else
const PRECACHE_URLS = ['/offline.html'];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // activate immediately, don't wait for tabs to close
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keyList) =>
        Promise.all(
          keyList
            .filter((key) => key.startsWith('zdravy-') && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // take control of all open tabs
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept API calls – always hit the network
  if (url.pathname.startsWith('/api/')) return;

  // Navigation: network-first, fallback to offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Only cache valid same-origin responses
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic'
        ) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ── Push ──────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'Zdravý Projekt',
    body: 'Máte novú správu',
    url: '/home',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (_) {
      data.body = event.data.text() || data.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url },
      vibrate: [200, 100, 200],
      requireInteraction: false,
      tag: 'zdravy-notification', // replace previous notification of same type
    })
  );
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/home';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Find an already-open window and navigate it
        for (const client of clients) {
          if ('focus' in client && 'navigate' in client) {
            client.focus();
            return client.navigate(targetUrl);
          }
        }
        // No open window – open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// ── Background Sync ───────────────────────────────────────────────────────────
// Re-sends a pending push subscription after connectivity is restored.
self.addEventListener('sync', (event) => {
  if (event.tag === 'push-subscribe') {
    event.waitUntil(syncPendingSubscription());
  }
});

async function syncPendingSubscription() {
  const db = await openIDB();
  const pending = await db.get('pending_subscription');
  if (!pending) return;

  try {
    const response = await fetch('/api/push/subscribe/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pending.token}`,
      },
      body: JSON.stringify(pending.subscription),
    });
    if (response.ok) {
      await db.delete('pending_subscription');
    }
  } catch (_) {
    // Will be retried on next sync
  }
}

// ── Minimal IndexedDB helper ──────────────────────────────────────────────────
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('zdravy-push', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('meta');
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = (e) => {
      const db = e.target.result;
      resolve({
        get(key) {
          return new Promise((res, rej) => {
            const tx = db.transaction('meta', 'readonly');
            const r = tx.objectStore('meta').get(key);
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
          });
        },
        set(key, val) {
          return new Promise((res, rej) => {
            const tx = db.transaction('meta', 'readwrite');
            const r = tx.objectStore('meta').put(val, key);
            r.onsuccess = () => res();
            r.onerror = () => rej(r.error);
          });
        },
        delete(key) {
          return new Promise((res, rej) => {
            const tx = db.transaction('meta', 'readwrite');
            const r = tx.objectStore('meta').delete(key);
            r.onsuccess = () => res();
            r.onerror = () => rej(r.error);
          });
        },
      });
    };
  });
}

// ── SKIP_WAITING message ──────────────────────────────────────────────────────
// Allow the app to trigger an immediate update.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
