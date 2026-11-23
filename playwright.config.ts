import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de extremo a extremo contra la app real (nginx + API + MongoDB).
 * Levanta todo antes con:
 *   docker compose -f docker-compose.yml -f docker-compose.api.yml up -d --build --wait
 */
export default defineConfig({
  testDir: './e2e',
  // Comparten la misma base de datos: se ejecutan una tras otra.
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:8090',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
