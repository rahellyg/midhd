

import React from 'react';
import './i18n';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

const getBasePath = () => {
  const configuredBase = String(import.meta.env.BASE_URL || '/').trim();
  const withLeadingSlash = configuredBase.startsWith('/') ? configuredBase : `/${configuredBase}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

const normalizePushPath = (rawPath) => {
  try {
    const basePath = getBasePath();
    const url = new URL(String(rawPath || '/'), window.location.origin);
    let pathname = url.pathname.replace(/\/Task\/?$/i, '/Tasks');
    if (!pathname.startsWith(basePath)) {
      const trimmedPath = pathname.replace(/^\/+/, '');
      pathname = basePath === '/' ? `/${trimmedPath}` : `${basePath}${trimmedPath}`;
    }
    pathname = pathname.replace(/\/+/g, '/');
    return `${pathname}${url.search}${url.hash}`;
  } catch {
    return getBasePath();
  }
};

const navigateWithinSpa = (targetPath) => {
  const nextPath = normalizePushPath(targetPath);
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentPath === nextPath) {
    return;
  }
  window.history.pushState({}, '', nextPath);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const consumePendingPushRedirect = () => {
  const params = new URLSearchParams(window.location.search);
  const openPath = params.get('open');
  if (!openPath) {
    return;
  }

  params.delete('open');
  const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', cleanUrl);
  navigateWithinSpa(openPath);
};

consumePendingPushRedirect();

// Capture the PWA install prompt as early as possible — before React mounts.
// useEffect in components runs after the first render and can miss this event.
/** @type {any} */ (window).__pwaInstallPromptEvent = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  /** @type {any} */ (window).__pwaInstallPromptEvent = event;
  window.dispatchEvent(new CustomEvent('pwaInstallReady'));
});
window.addEventListener('appinstalled', () => {
  /** @type {any} */ (window).__pwaInstallPromptEvent = null;
  window.dispatchEvent(new CustomEvent('pwaAppInstalled'));
});

if ('serviceWorker' in navigator) {
  // Handle push URL navigation from service worker messages.
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event?.data?.type === 'OPEN_PUSH_URL' && event?.data?.url) {
      navigateWithinSpa(event.data.url);
    }
  });

  // When the new SW takes control, reload once to use the fresh assets.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) {
      reloading = true;
      window.location.reload();
    }
  });

  // Expose a function that pages/components can call to activate a waiting SW.
  window.__activatePendingUpdate = () => {
    if (window.__pendingUpdateSW) {
      window.__pendingUpdateSW.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  window.addEventListener('load', () => {
    // Use /sw.js in dev, /midhd/sw.js in production.
    let swPath = '/sw.js';
    let swScope = '/';
    if (window.location.pathname.startsWith('/midhd/')) {
      swPath = '/midhd/sw.js';
      swScope = '/midhd/';
    }

    const notifyUpdateReady = (sw) => {
      window.__pendingUpdateSW = sw;
      window.dispatchEvent(new CustomEvent('swUpdateReady'));
    };

    navigator.serviceWorker.register(swPath, { scope: swScope }).then((registration) => {
      // A SW is already waiting (e.g. tab was opened after a deploy landed).
      if (registration.waiting && navigator.serviceWorker.controller) {
        notifyUpdateReady(registration.waiting);
      }

      registration.onupdatefound = () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.onstatechange = () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdateReady(installing);
          }
        };
      };
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
import './index.css';
