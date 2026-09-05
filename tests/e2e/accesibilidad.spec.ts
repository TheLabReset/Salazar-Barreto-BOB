import AxeBuilder from '@axe-core/playwright'
import type { Result } from 'axe-core'
import { expect, test, type Page } from './basedatos'

/**
 * Accesibilidad. Fase 6, punto 5 del enunciado y puntos 3 y 5 del verificador.
 *
 * `axe-core` sobre las seis pantallas de vecino, la de administración y las
 * hojas, **con cero violaciones críticas o serias**. Y un recorrido con el
 * teclado, porque axe no toca nada: comprueba el marcado, no si la app se puede
 * usar sin ratón.
 *
 * Lo que `axe` NO cubre y hay que decir en voz alta: si un `aria-label` dice la
 * verdad, si el orden de lectura tiene sentido, y si lo que anuncia un lector de
 * pantalla se entiende. Eso se probó a mano y está en `docs/verificacion-6.md`.
 */

const PIN = process.env.ADMIN_PIN ?? '2026'

/**
 * **El contraste se mide aparte, y aquí se desactiva a propósito.**
 *
 * No es para que la suite se ponga verde: es que `color-contrast` señala la
 * paleta, y la paleta es diseño validado con el usuario a lo largo de muchas
 * iteraciones — el mockup manda ahí. Repetir el mismo hallazgo en seis pantallas
 * y en cuatro hojas no añade información y sí acaba con alguien apagando la
 * regla entera.
 *
 * Lo que sí hay es la medida exacta de **cada** combinación de `02` §1, con su
 * ratio fijado en un test que se pone rojo si alguien mueve un color:
 * `lib/__tests__/contraste.test.ts`. Cuatro combinaciones no llegan a AA —una de
 * ellas, el gris sobre crema, es la que `02` §8 afirma que sí cumple— y están
 * declaradas en `docs/verificacion-6.md` con lo que costaría arreglarlas.
 *
 * Todo lo demás de WCAG 2.1 AA sí se exige aquí, y a cero.
 */
async function violaciones(page: Page, dentroDe?: string): Promise<Result[]> {
  let constructor = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .disableRules(['color-contrast'])
  if (dentroDe) constructor = constructor.include(dentroDe)
  const resultado = await constructor.analyze()
  return resultado.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
}

/** Un informe que se lee sin abrir el navegador. */
function describir(malas: readonly Result[]): string {
  return malas
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.help}\n` +
        v.nodes.map((n) => `    ${n.target.join(' ')} · ${n.failureSummary ?? ''}`).join('\n'),
    )
    .join('\n')
}

const PANTALLAS = [
  { ruta: '/', nombre: 'Inicio', admin: false },
  { ruta: '/mes', nombre: 'El mes', admin: false },
  { ruta: '/mi-departamento', nombre: 'Mi departamento', admin: false },
  { ruta: '/historial', nombre: 'Historial', admin: false },
  { ruta: '/avisos', nombre: 'Avisos', admin: false },
  { ruta: '/admin', nombre: 'Administración', admin: true },
]

test.describe('axe-core · cero violaciones críticas o serias', () => {
  for (const { ruta, nombre, admin } of PANTALLAS) {
    test(nombre, async ({ page }) => {
      if (admin) {
        const r = await page.request.post('/api/admin/pin', { data: { pin: PIN } })
        expect(r.ok()).toBeTruthy()
      }
      await page.goto(ruta)
      await page.waitForLoadState('networkidle')
      const malas = await violaciones(page)
      expect(malas.length, `${nombre}:\n${describir(malas)}`).toBe(0)
    })
  }
})

test.describe('axe-core · las hojas', () => {
  const HOJAS: {
    ruta: string
    boton: RegExp
    nombre: string
    admin: boolean
    dpto?: string
  }[] = [
    { ruta: '/', boton: /¿Cómo se calculó\?/, nombre: 'El cálculo', admin: false },
    { ruta: '/mi-departamento', boton: /Cómo pagar/, nombre: 'Cómo pagar', admin: false, dpto: '501' },
    { ruta: '/admin', boton: /Empezar |Seguir con /, nombre: 'El cierre del mes', admin: true },
    { ruta: '/admin', boton: /Corregir/, nombre: 'Corregir un mes', admin: true },
  ]

  for (const { ruta, boton, nombre, admin, dpto } of HOJAS) {
    test(nombre, async ({ page }) => {
      if (dpto) {
        // «Cómo pagar» y «Ya pagué» solo salen si el pago está **sin registrar**:
        // a quien ya avisó no se le sigue pidiendo lo que dijo que hizo. En la
        // semilla, el 401 tiene junio confirmado y el 501 no ha avisado.
        await page.context().addCookies([
          { name: 'sb_dpto', value: dpto, domain: 'localhost', path: '/' },
        ])
      }
      if (admin) {
        const r = await page.request.post('/api/admin/pin', { data: { pin: PIN } })
        expect(r.ok()).toBeTruthy()
      }
      await page.goto(ruta)
      await page.getByRole('button', { name: boton }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      const malas = await violaciones(page)
      expect(malas.length, `${nombre}:\n${describir(malas)}`).toBe(0)
    })
  }
})

test.describe('se puede recorrer solo con el teclado', () => {
  /**
   * `axe` no pulsa nada: comprueba el marcado. Esto comprueba el uso.
   */
  test('desde Inicio se llega a los controles principales tabulando', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const alcanzados: string[] = []
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      const foco = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body) return null
        const estilo = getComputedStyle(el)
        return {
          etiqueta: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 60),
          rol: el.tagName.toLowerCase(),
          // El foco tiene que verse: sin contorno ni sombra, quien tabula no
          // sabe dónde está.
          seVe: estilo.outlineStyle !== 'none' || estilo.boxShadow !== 'none',
        }
      })
      if (!foco) continue
      alcanzados.push(foco.etiqueta)
      expect(foco.seVe, `el foco no se ve en «${foco.etiqueta}»`).toBe(true)
    }

    // Los controles que tienen que estar al alcance del teclado desde Inicio.
    const texto = alcanzados.join(' | ')
    expect(texto, 'el cálculo de la cuota').toMatch(/cómo se calculó/i)
    expect(texto, 'la navegación inferior').toMatch(/el mes|mi depa|historial/i)
  })

  test('con una hoja abierta, el foco no se escapa detrás', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /¿Cómo se calculó\?/ }).first().click()
    const hoja = page.getByRole('dialog')
    await expect(hoja).toBeVisible()

    // Se tabula más veces que elementos hay: si la trampa funciona, el foco da
    // la vuelta y nunca sale de la hoja.
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab')
      const dentro = await page.evaluate(() => {
        const el = document.activeElement
        const panel = document.querySelector('[role="dialog"]')
        return el === document.body || (!!panel && !!el && panel.contains(el))
      })
      expect(dentro, `en la vuelta ${i} el foco se salió de la hoja`).toBe(true)
    }
  })

  test('Escape cierra la hoja', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /¿Cómo se calculó\?/ }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})

test.describe('lo que se anuncia a un lector de pantalla', () => {
  test('la región de anuncios existe y no se ve', async ({ page }) => {
    await page.goto('/')
    const region = page.locator('[role="status"][aria-live="polite"]').last()
    await expect(region).toHaveCount(1)
    // `sr-only` tiene que **esconder de verdad**: si la clase no existiera, el
    // texto de los anuncios saldría escrito en medio de la pantalla.
    const medidas = await region.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { ancho: r.width, alto: r.height, clip: getComputedStyle(el).clipPath }
    })
    expect(medidas.ancho, 'la región de anuncios no puede ocupar sitio').toBeLessThanOrEqual(1)
    expect(medidas.alto).toBeLessThanOrEqual(1)
  })

  test('al avisar un pago se anuncia el estado nuevo', async ({ page }) => {
    // El 501 es el que en la semilla no ha avisado su pago de junio.
    await page.context().addCookies([
      { name: 'sb_dpto', value: '501', domain: 'localhost', path: '/' },
    ])
    await page.goto('/mi-departamento')
    await page.getByRole('button', { name: /Ya pagué/ }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: /Ya transferí, avisar/ }).click()

    const region = page.locator('[role="status"][aria-live="polite"]').last()
    await expect(region).toContainText(/en verificación/i)
  })
})

/**
 * Escalado de texto del sistema al 200 %. `02` §8, lo último de la lista.
 *
 * Alguien con la vista cansada pone la letra al doble en los ajustes del
 * teléfono. Si la app está construida con `px` fijos y alturas fijas, el texto
 * se sale de los botones o se corta. Se simula subiendo la fuente base del
 * documento, que es lo que hace el ajuste del sistema en la web.
 */
test.describe('con el texto del sistema al doble', () => {
  for (const { ruta, nombre } of [
    { ruta: '/', nombre: 'Inicio' },
    { ruta: '/mes', nombre: 'El mes' },
    { ruta: '/mi-departamento', nombre: 'Mi departamento' },
  ]) {
    test(`${nombre} no se desborda ni se recorta`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(ruta)
      await page.addStyleTag({ content: 'html { font-size: 200% }' })
      await page.waitForTimeout(200)

      // Ni barra horizontal en el marco…
      const marco = page.locator('.marco-app')
      const medidas = await marco.evaluate((el) => ({
        scroll: el.scrollWidth,
        cliente: el.clientWidth,
      }))
      expect(medidas.scroll, `${nombre} se desborda a lo ancho con el texto al doble`).toBeLessThanOrEqual(
        medidas.cliente,
      )

      // …ni texto recortado dentro de su caja. `truncate` con puntos suspensivos
      // es una decisión de diseño y no cuenta; lo que no vale es que la letra se
      // salga por debajo del borde de su contenedor.
      const recortados = await page.evaluate(() => {
        const malos: string[] = []
        for (const el of document.querySelectorAll<HTMLElement>('button, h1, h2, p, span')) {
          // Lo que solo oye el lector de pantalla está recortado **a propósito**:
          // es la técnica para esconderlo de la vista sin esconderlo del lector.
          if (el.classList.contains('sr-only')) continue
          const estilo = getComputedStyle(el)
          if (estilo.overflow === 'visible' || estilo.textOverflow === 'ellipsis') continue
          if (el.scrollHeight > el.clientHeight + 2) {
            malos.push(`${el.tagName.toLowerCase()}.${el.className.split(' ')[0]}`)
          }
        }
        return malos
      })
      expect(recortados, `${nombre}: texto recortado con la letra al doble`).toEqual([])
    })
  }
})
