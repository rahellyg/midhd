self.addEventListener('push', (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'midhd';
  const body = payload.body || '';
  const url = payload.url || '/';

  const options = {
    body,
    tag: payload.tag || 'midhd-web-push',
    icon: payload.icon || 'app-icon.svg',
    badge: payload.badge || 'app-icon.svg',
    data: {
      ...(payload.data || {}),
      url,
    },
    renotify: Boolean(payload.renotify),
    requireInteraction: Boolean(payload.requireInteraction),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const destination = new URL(targetUrl, self.location.origin).href;

    for (const client of allClients) {
      if (client.url === destination && 'focus' in client) {
        return client.focus();
      }
    }

    if (allClients.length > 0 && 'focus' in allClients[0]) {
      try {
        if ('navigate' in allClients[0]) {
          await allClients[0].navigate(destination);
        }
      } catch {
        // Ignore navigation errors and still focus existing client.
      }
      return allClients[0].focus();
    }

    if (clients.openWindow) {
      return clients.openWindow(destination);
    }

    return undefined;
  })());
});
