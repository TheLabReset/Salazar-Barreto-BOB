import { expect, test, type Page } from '@playwright/test'

/**
 * Responsive de verdad. Fase 4, punto 2 del verificador.
 *
 * Siete anchos y dos alturas, las seis pantallas de vecino. **En ningún caso
 * puede haber desborde horizontal ni recorte.** Un desborde de dos píxeles en un
 * teléfono de 320px es una barra de scroll horizontal en la pantalla de alguien
 * que solo quería ver su cuota.
 */

const ANCHOS = [320, 360, 390, 430, 768, 1024, 1440]
const ALTURAS = [844, 560]

const PANTALLAS = [
  { ruta: '/', nombre: 'Inicio' },
  { ruta: '/mes', nombre: 'El mes' },
  { ruta: '/mi-departamento', nombre: 'Mi departamento' },
  { ruta: '/historial', nombre: 'Historial' },
  { ruta: '/avisos', nombre: 'Avisos' },
  { ruta: '/admin', nombre: 'Administración' },
]

/**
 * Qué se desborda, si algo se desborda. Devuelve los culpables, no un booleano.
 *
 * **No cuenta lo que está dentro de un contenedor que scrollea a lo ancho a
 * propósito**, como el carrusel de meses de P2: ahí que un mes quede fuera de la
 * vista es la función, no un defecto. Lo que sí es un defecto es que algo empuje
 * al marco entero, y eso lo cubre la comprobación de `scrollWidth`.
 *
 * La primera versión de este chequeo no hacía esa distinción y marcaba el
 * carrusel en nueve tamaños. Un chequeo que grita donde no hay nada es un
 * chequeo que alguien acaba desactivando.
 */
async function culpablesDeDesborde(pagina: Page): Promise<string[]> {
  return pagina.evaluate(() => {
    const marco = document.querySelector('.marco-app')
    if (!marco) return ['no se encontró .marco-app']
    const limite = marco.getBoundingClientRect()

    /**
     * Solo se perdona lo que está dentro de un contenedor que **declara** que
     * scrollea a lo ancho, con `data-scroll-x`. Hoy hay uno: el carrusel de
     * meses de P2, donde que un mes quede fuera de la vista es la función.
     *
     * Las dos versiones anteriores de este chequeo miraban el CSS calculado y
     * las dos se desactivaban solas:
     *
     *  1. Mirando `overflow-x`: si `overflow-y` es `auto`, el CSS calcula
     *     `overflow-x: auto` aunque nadie lo escriba, así que TODO lo que
     *     estuviera dentro de una pantalla con scroll vertical quedaba exento.
     *  2. Añadiendo "y que scrollee de verdad": un desborde real convierte al
     *     padre en scroller horizontal, con lo que el desborde se excusaba a sí
     *     mismo.
     *
     * Se comprobó las dos veces metiendo una cifra de 600px en un marco de
     * 390px: el chequeo seguía en verde. Con `data-scroll-x` no hay forma de que
     * un defecto se cuele por la puerta de atrás.
     */
    const dentroDeUnScrollHorizontal = (el: HTMLElement): boolean =>
      el.closest('[data-scroll-x]') !== null

    const culpables: string[] = []
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('.marco-app *'))) {
      const caja = el.getBoundingClientRect()
      if (caja.width === 0) continue
      if (dentroDeUnScrollHorizontal(el)) continue
      // Un píxel de antialiasing no es un desborde.
      if (caja.right > limite.right + 1 || caja.left < limite.left - 1) {
        const clase = el.className.toString().split(' ').slice(0, 3).join('.')
        culpables.push(`${el.tagName.toLowerCase()}.${clase} (${Math.round(caja.left)}→${Math.round(caja.right)})`)
      }
      if (culpables.length >= 5) break
    }
    return culpables
  })
}

test.describe('sin desbordes horizontales', () => {
  for (const alto of ALTURAS) {
    for (const ancho of ANCHOS) {
      for (const { ruta, nombre } of PANTALLAS) {
        test(`${nombre} a ${ancho}×${alto}`, async ({ page }) => {
          await page.setViewportSize({ width: ancho, height: alto })
          await page.goto(ruta)
          await page.waitForLoadState('domcontentloaded')

          const marco = page.locator('.marco-app')
          await expect(marco).toBeVisible()

          const medidas = await marco.evaluate((el) => ({
            scroll: el.scrollWidth,
            cliente: el.clientWidth,
          }))
          expect(medidas.scroll, `${nombre} se desborda a ${ancho}px`).toBeLessThanOrEqual(medidas.cliente)

          const culpables = await culpablesDeDesborde(page)
          expect(culpables, `elementos fuera del marco en ${nombre} a ${ancho}px`).toEqual([])

          // Y el documento tampoco: una barra horizontal en el body es igual de mala.
          const cuerpo = await page.evaluate(() => ({
            scroll: document.documentElement.scrollWidth,
            cliente: document.documentElement.clientWidth,
          }))
          expect(cuerpo.scroll, `el documento se desborda en ${nombre} a ${ancho}px`).toBeLessThanOrEqual(
            cuerpo.cliente + 1,
          )
        })
      }
    }
  }
})

test.describe('el marco solo existe en escritorio', () => {
  test('en un teléfono la app ocupa la pantalla, sin marco ni sombra', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const estilo = await page.locator('.marco-app').evaluate((el) => {
      const s = getComputedStyle(el)
      return { radio: s.borderTopLeftRadius, sombra: s.boxShadow, ancho: el.clientWidth }
    })
    expect(estilo.radio).toBe('0px')
    expect(estilo.sombra).toBe('none')
    expect(estilo.ancho).toBe(390)
  })

  test('en escritorio sí hay marco de 390 centrado', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    const estilo = await page.locator('.marco-app').evaluate((el) => {
      const s = getComputedStyle(el)
      return { radio: s.borderTopLeftRadius, sombra: s.boxShadow, ancho: el.clientWidth }
    })
    expect(estilo.radio).toBe('38px')
    expect(estilo.sombra).not.toBe('none')
    expect(estilo.ancho).toBeLessThanOrEqual(392)
  })

  test('no hay layout de escritorio de dos columnas', async ({ page }) => {
    // Decisión tomada: son siete vecinos consultando desde el celular. Una
    // versión ancha sería una pantalla que nadie usa y hay que mantener igual.
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    const ancho = await page.locator('.marco-app').evaluate((el) => el.clientWidth)
    expect(ancho).toBeLessThan(500)
  })
})
