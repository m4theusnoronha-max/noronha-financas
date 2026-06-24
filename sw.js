const CACHE = 'noronha-v1';
const ASSETS = [
  '/noronha-financas/',
  '/noronha-financas/noronha.html',
  '/noronha-financas/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'Casal Noronha · Finanças';
  const body = data.body || 'Você tem contas vencendo em breve.';
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/noronha-financas/icon-192.png',
      badge: '/noronha-financas/icon-192.png',
      tag: 'noronha-financas',
      renotify: true,
      data: { url: '/noronha-financas/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || '/noronha-financas/'));
});
