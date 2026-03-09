import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isDevServer = command === 'serve';
  const appBase = isDevServer ? '/' : '/midhd/';

  return {
    base: appBase,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version || '0.0.0'),
    },
    logLevel: isDevServer ? 'info' : 'error', // Show URL when running dev
    server: {
      host: '127.0.0.1', // Avoid Windows localhost/IPv6 hang
      port: 5173
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
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
              src: 'app-icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'app-icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'maskable'
            },
            {
              src: 'app-icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          importScripts: ['push-handler.js'],
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          runtimeCaching: []
        },
        devOptions: {
          enabled: false
        }
      })
    ]
  };
});
