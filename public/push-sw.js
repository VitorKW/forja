// Notificações do Forja. Este arquivo é importado pelo service worker gerado pelo vite-plugin-pwa.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Forja', {
      body: data.body || '',
      tag: data.tag || undefined,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { url: self.registration.scope },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of wins) if ('focus' in w) return w.focus();
      return self.clients.openWindow(self.registration.scope);
    })(),
  );
});
