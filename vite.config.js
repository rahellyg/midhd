import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isDevServer = command === 'serve';
  const appBase = isDevServer ? '/' : '/midhd/';

  return {
    base: appBase,
    logLevel: 'error', // Suppress warnings, only show errors
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifestFilename: 'manifest.json',
        includeAssets: ['app-icon.svg', 'og-home.png'],
        manifest: {
          name: 'midhd – קן הריכוז',
          short_name: 'midhd',
          description: 'ניהול קשב וריכוז – משימות, פוקוס, רגיעה וטיפים',
          theme_color: '#2D5A4A',
          background_color: '#F0F7F4',
          display: 'standalone',
          orientation: 'portrait',
          scope: appBase,
          start_url: appBase,
          dir: 'rtl',
          lang: 'he',
          icons: [
            {
              src: '/app-icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/app-icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'maskable'
            },
            {
              src: '/app-icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'remote-assets',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 }
              }
            }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ]
  };
});