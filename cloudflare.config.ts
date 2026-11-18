import { defineConfig } from 'cf/config'

export default defineConfig({
  worker: {
    name: 'still',
    compatibilityDate: '2026-11-13',
    domains: ['still.irshath.com'],
    observability: { enabled: true },
    assets: { notFoundHandling: 'single-page-application' }
  }
})
