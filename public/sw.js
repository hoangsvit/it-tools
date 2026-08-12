/*
 * Legacy Workbox cleanup worker.
 *
 * Keep this file at /sw.js permanently: older visitors may still have a
 * registration pointing to this exact URL. When their browser checks for a
 * Service Worker update, this worker replaces the old precaching worker,
 * unregisters itself, deletes stale Cache Storage entries and reloads open
 * tabs so the current no-store HTML and content-hashed assets are used.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.registration.unregister();

    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));

    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    await Promise.all(clients.map(client => client.navigate(client.url)));
  })());
});
