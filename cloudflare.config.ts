import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "yoga-meditation-app",
    compatibilityDate: "2026-11-13",
    domains: ["yoga.irshath.com"],
    observability: {
      enabled: true,
    },
    assets: {
      notFoundHandling: "single-page-application",
    },
  },
});
