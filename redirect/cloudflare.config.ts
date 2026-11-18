import { defineConfig } from 'cf/config'

export default defineConfig({
  worker: {
    name: 'yoga-meditation-app',
    compatibilityDate: '2026-11-13',
    entrypoint: './worker.ts',
    domains: ['yoga.irshath.com']
  }
})
