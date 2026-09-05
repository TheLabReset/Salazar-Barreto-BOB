import { test as base, expect, type Page } from '@playwright/test'
import { mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Un cerrojo entre procesos para los tests que **escriben en la base**.
 *
 * `test.describe.configure({ mode: 'serial' })` ordena los tests de un fichero,
 * no los de dos. Con `cierre.spec.ts` y `admin.spec.ts` corriendo en workers
 * distintos, los dos llamaban a resembrar contra la misma base: el cierre se
 * quedaba a medias porque el otro le había borrado el mes debajo, y el rojo
 * salía en el fichero que no tenía la culpa. Dos horas de depurar el sitio
 * equivocado, que es justo lo que cuesta un test que falla por el vecino.
 *
 * El cerrojo es un fichero creado con `wx`: la creación exclusiva es atómica en
 * el sistema de ficheros, así que no hay carrera entre comprobar y crear.
 */
const CERROJO = join(tmpdir(), 'salazar-barreto-e2e', 'base.lock')

async function tomar(): Promise<void> {
  mkdirSync(join(tmpdir(), 'salazar-barreto-e2e'), { recursive: true })
  const limite = Date.now() + 180_000
  for (;;) {
    try {
      closeSync(openSync(CERROJO, 'wx'))
      return
    } catch {
      if (Date.now() > limite) {
        // Soltar el cerrojo a la fuerza es peor que fallar: enmascara la causa.
        throw new Error(`No se pudo tomar el cerrojo de la base en 180 s: ${CERROJO}`)
      }
      await new Promise((r) => setTimeout(r, 150))
    }
  }
}

function soltar(): void {
  try {
    unlinkSync(CERROJO)
  } catch {
    // Ya estaba suelto. No es un fallo del test.
  }
}

/**
 * `test` con la base en exclusiva y ya resembrada.
 *
 * Cada test arranca de la semilla, y ningún otro worker la toca mientras corre.
 */
export const test = base.extend<{ baseLimpia: void }>({
  baseLimpia: [
    async ({ page }, usar) => {
      await tomar()
      try {
        const pin = await page.request.post('/api/admin/pin', {
          data: { pin: process.env.ADMIN_PIN ?? '2026' },
        })
        expect(pin.ok(), 'el PIN del entorno tiene que ser válido').toBeTruthy()
        const r = await page.request.post('/api/pruebas/resembrar')
        expect(
          r.ok(),
          `resembrar devolvió ${r.status()}: ${(await r.text()).slice(0, 200)}`,
        ).toBeTruthy()
        await usar()
      } finally {
        soltar()
      }
    },
    { auto: true },
  ],
})

export { expect, type Page }
