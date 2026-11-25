import { defineConfig } from 'cf/config'

export default defineConfig({
  worker: {
    name: 'still',
    compatibilityDate: '2026-11-13',
    entrypoint: './src/worker/index.ts',
    env: { ASSETS: { type: 'assets' } },
    domains: ['still.irshath.com'],
    observability: { enabled: true },
    assets: { notFoundHandling: 'single-page-application', runWorkerFirst: ['/media/poses/*'] }
  }
})
