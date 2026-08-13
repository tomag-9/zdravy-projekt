import { defineConfig, devices } from "@playwright/test";

/**
 * E2E testy bežia proti **bežiacemu dev stacku**
 * (`docker compose -f compose/dev.yml up -d`), nie proti samostatnému vite —
 * potrebujú backend, DB aj naseedované prevádzky. Preto tu nie je `webServer`:
 * spustiť frontend bez zvyšku stacku by testom nepomohlo.
 *
 * Spustenie:  cd frontend && npm run test:e2e
 * Iná adresa: E2E_BASE_URL=http://localhost:3100 npm run test:e2e
 *
 * Dva projekty (mobil + desktop) sú zámerné: klientske UI má dve samostatné
 * vetvy renderovania (`useIsPC`) a chyby v tour/layoute sa objavovali práve na
 * jednej z nich (viď #477).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
});
