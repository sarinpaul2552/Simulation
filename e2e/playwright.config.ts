import { defineConfig } from '@playwright/test';

/**
 * Batch 5 · 5F end-to-end tests: real browser → Vite app → supabase-js → local PostgREST/PostgreSQL
 * (scripts/v2-local/up.sh must be running). Run: npm run test:e2e
 */
const ANON_KEY = process.env.V2_DB_KEY ?? '';
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.e2e\.ts/,
  timeout: 10 * 60 * 1000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    launchOptions: { executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium" },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    cwd: '..',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_KEY: ANON_KEY },
    timeout: 60000,
  },
});
