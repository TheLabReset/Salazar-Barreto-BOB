import { defineConfig, devices } from '@playwright/test'

/**
 * Los tests de extremo a extremo.
 *
 * Corren contra la app **construida**, no contra el servidor de desarrollo: lo
 * que se prueba tiene que ser lo que se despliega.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Los tests de responsive son de solo lectura y pueden ir en paralelo; los del
  // cierre escriben en la misma base y se declaran en serie en su propio archivo.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3200',
    trace: 'retain-on-failure',
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    // El departamento elegido va en una cookie: sin ella solo se ve el onboarding.
    storageState: {
      cookies: [
        {
          name: 'sb_dpto', value: '401', domain: 'localhost', path: '/',
          expires: -1, httpOnly: false, secure: false, sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  },
  projects: [
    {
      name: 'movil',
      use: {
        ...devices['Pixel 7'],
        // El Chromium del entorno, que no coincide con el que Playwright espera.
        launchOptions: {
          executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
        },
      },
    },
  ],
})
