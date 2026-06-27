const CACHE_NAME = 'rescate-pwa-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Let the browser fetch normally, with fallback to cache for static resources
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Listen for push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'Alerta de Sismología', body: 'Nueva actividad sísmica detectada.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Alerta de Sismología', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=192&h=192&fit=crop',
    badge: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=192&h=192&fit=crop',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
