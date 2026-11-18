import { defineConfig } from 'vite'
import solid from '@solidjs/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [
    solid(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,webmanifest,json}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      }
    }),
    ...(process.env.VITEST ? [] : [cloudflare()])
  ],
  build: { target: 'es2022' }
})
