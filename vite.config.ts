import { defineConfig } from 'vite'
import solid from '@solidjs/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'
import { cloudflare } from '@cloudflare/vite-plugin'
import { seo } from './scripts/seo-plugin'

import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    solid(),
    seo(),
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
        // The prerendered pages are for crawlers. Offline, every route boots from index.html.
        globPatterns: ['index.html', '**/*.{js,css,svg,png,webp,woff2,webmanifest,mp3,mp4,webm}'],
        // Pose videos load when shown, so installing the app does not download every clip.
        globIgnores: ['og.jpg', 'media/poses/**'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      }
    }),
    ...(process.env.VITEST ? [] : [cloudflare()])
  ],
  build: { target: 'es2022' }
})
