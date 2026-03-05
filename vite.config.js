import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isDevServer = command === 'serve';

  return {
    base: isDevServer ? '/' : '/midhd/',
    logLevel: 'error', // Suppress warnings, only show errors
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    plugins: [
      react(),
      // Skip PWA during local dev to avoid noisy manifest requests in tunneled environments.
      !isDevServer && VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      includeAssets: ['app-icon.svg'],
      manifest: {
        name: 'midhd – קן הריכוז',
        short_name: 'midhd',
        description: 'ניהול קשב וריכוז – משימות, פוקוס, רגיעה וטיפים',
        theme_color: '#6366f1',
        background_color: '#f0f4ff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
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
      }
      })
    ].filter(Boolean)
  };
});