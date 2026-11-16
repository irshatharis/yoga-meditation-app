import { defineConfig } from "cf/config";

export default defineConfig({
  accountId: "c2e2f72ef84bde8153ab9f92af180db5",
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
