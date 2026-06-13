//playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // WFM precisa ser sequencial
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker para evitar rate limiting
  
  reporter: [['html', { open: 'never' }]],

  use: {
    channel: 'msedge', // Navegador corporativo
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: process.env.WFM_URL_BASE || 'http://appwfm.gvt.net.br',
  },

  projects: [
    {
      name: 'wfm-extraction',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],

  timeout: 60000, // 1 minuto por teste
});
