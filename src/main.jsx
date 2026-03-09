

import React from 'react';
import './i18n';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { toast } from '@/components/ui/use-toast'

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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event?.data?.type === 'OPEN_PUSH_URL' && event?.data?.url) {
      navigateWithinSpa(event.data.url);
    }
  });

  window.addEventListener('load', () => {
    // Use /sw.js in dev, /midhd/sw.js in production
    let swPath = '/sw.js';
    let swScope = '/';
    if (window.location.pathname.startsWith('/midhd/')) {
      swPath = '/midhd/sw.js';
      swScope = '/midhd/';
    }
    navigator.serviceWorker.register(swPath, { scope: swScope }).then(registration => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            toast({
              title: 'Update available',
              description: 'A new version of the app is available.',
              action: (
                <button
                  className="ml-4 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </button>
              ),
            });
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
