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

self.normalizeNotificationDestination = (targetUrl) => {
  const destination = new URL(targetUrl || '/', self.location.origin);
  destination.pathname = destination.pathname.replace(/\/Task\/?$/i, '/Tasks');
  return destination;
};

self.getScopeBasePath = () => {
  try {
    const scope = new URL(self.registration.scope);
    return scope.pathname.endsWith('/') ? scope.pathname : `${scope.pathname}/`;
  } catch {
    return '/';
  }
};

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const destination = self.normalizeNotificationDestination(targetUrl);
    const destinationPath = `${destination.pathname}${destination.search}${destination.hash}`;

    for (const client of allClients) {
      const clientUrl = new URL(client.url);
      if (clientUrl.origin === destination.origin && 'focus' in client) {
        await client.focus();
        client.postMessage({
          type: 'OPEN_PUSH_URL',
          url: destinationPath,
        });
        return;
      }
    }

    if (clients.openWindow) {
      const basePath = self.getScopeBasePath();
      const openPath = `${basePath}?open=${encodeURIComponent(destinationPath)}`;
      return clients.openWindow(openPath);
    }

    return undefined;
  })());
});
