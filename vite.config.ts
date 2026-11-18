import { defineConfig } from 'vite'
import solid from '@solidjs/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'
import { cloudflare } from '@cloudflare/vite-plugin'

import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    solid(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        id: '/',
        name: 'still. Yoga, breath and meditation',
        short_name: 'still.',
        description: 'A free, private, offline place for yoga, breathwork and meditation. No account needed.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f5efe5',
        theme_color: '#f5efe5',
        categories: ['health', 'lifestyle', 'fitness'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Practices', url: '/practices', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Journal', url: '/journal', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,webmanifest,json,mp3,mp4,webm}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      }
    }),
    ...(process.env.VITEST ? [] : [cloudflare()])
  ],
  build: { target: 'es2022' }
})
