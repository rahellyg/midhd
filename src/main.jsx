

import React from 'react';
import './i18n';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { toast } from '@/components/ui/use-toast'

if ('serviceWorker' in navigator) {
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
