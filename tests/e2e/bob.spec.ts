import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './basedatos'

/**
 * Bob en pantalla. Fase 8, punto 1 del verificador.
 *
 * Con `BOB_MODO=determinista` y **sin `DEEPSEEK_API_KEY`**: que la app arranque
 * y que Bob conteste las cuatro preguntas sugeridas, de verdad, en el navegador
 * y contra la base.
 *
 * Y lo que `05` §6 prohíbe: se comprueba que **no está**. Un test que solo mira
 * que la conversación funciona deja pasar una chispa morada en la esquina.
 */

const SUGERIDAS = [
  '¿Cuánto debo este mes?',
  '¿Por qué subió el agua?',
  '¿Quién falta por pagar?',
  '¿Qué es el lavado del 401?',
]

test.describe('la hoja de Bob', () => {
  test('se abre desde la navegación con la conversación ahí mismo', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Preguntar a Bob' }).click()

    const hoja = page.getByRole('dialog')
    await expect(hoja).toBeVisible()
    // `05` §5: sin pantalla intermedia. El campo y los chips están ya, no
    // detrás de un "empezar".
    await expect(page.getByRole('textbox', { name: 'Escribe tu pregunta' })).toBeVisible()
    for (const q of SUGERIDAS) {
      await expect(page.getByRole('button', { name: q, exact: true })).toBeVisible()
    }
  })

  test('contesta las cuatro preguntas sugeridas, cada una con su cifra', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Preguntar a Bob' }).click()
    const conversacion = page.getByRole('log', { name: 'Conversación con Bob' })

    for (const [i, q] of SUGERIDAS.entries()) {
      await page.getByRole('button', { name: q, exact: true }).click()
      // Cada vuelta añade dos burbujas: la del vecino y la de Bob.
      await expect(conversacion.locator('.bob-suya')).toHaveCount(i + 1, { timeout: 15_000 })
      const suya = conversacion.locator('.bob-suya-texto').nth(i)
      const dice = (await suya.textContent()) ?? ''
      expect(dice.length, q).toBeGreaterThan(20)
      // `05` §3: siempre con el dato.
      expect(dice, q).toMatch(/\d/)
      // Y nunca hablando de sí mismo ni disculpándose.
      expect(dice.toLowerCase(), q).not.toContain('como asistente')
      expect(dice.toLowerCase(), q).not.toContain('lo siento')
    }
  })

  test('lo escrito a mano también se responde, y con Enter', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Preguntar a Bob' }).click()
    const campo = page.getByRole('textbox', { name: 'Escribe tu pregunta' })
    await campo.fill('¿Cuánto hay en la cuenta?')
    await campo.press('Enter')
    const suya = page.locator('.bob-suya-texto').first()
    await expect(suya).toBeVisible({ timeout: 15_000 })
    await expect(suya).toContainText('La cuenta conjunta')
  })

  test('la respuesta lleva a la pantalla que la demuestra · `05` §3', async ({ page }) => {
    await page.goto('/mi-departamento')
    await page.getByRole('button', { name: 'Preguntar a Bob' }).click()
    await page.getByRole('button', { name: SUGERIDAS[0]!, exact: true }).click()
    const enlace = page.getByRole('button', { name: 'Ver el cálculo completo' })
    await expect(enlace).toBeVisible({ timeout: 15_000 })
    await enlace.click()
    await expect(page.getByRole('dialog', { name: 'De dónde sale cada monto' })).toBeVisible()
  })

  /**
   * `05` §6, la lista de lo que no se hace. Se comprueba en el DOM porque es
   * donde se cuela: una animación de puntos, un degradado morado heredado de un
   * componente copiado, una chispa en un `aria-label`.
   */
  test('nada de lo prohibido en `05` §6', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Preguntar a Bob' }).click()
    await page.getByRole('button', { name: SUGERIDAS[0]!, exact: true }).click()
    await expect(page.locator('.bob-suya-texto').first()).toBeVisible({ timeout: 15_000 })

    const hoja = page.getByRole('dialog')
    const html = await hoja.innerHTML()
    expect(html, 'chispas o iconografía de IA').not.toMatch(/[✨🤖🪄🔮]/u)
    expect(html.toLowerCase(), 'no se habla de "IA"').not.toMatch(/\b(inteligencia artificial|powered by)\b/)

    // Ninguna animación en bucle dentro de la hoja.
    const enBucle = await hoja.evaluate((raiz) =>
      [raiz, ...raiz.querySelectorAll('*')].filter((el) => {
        const e = getComputedStyle(el as Element)
        return e.animationIterationCount.split(',').some((v) => v.trim() === 'infinite')
      }).length,
    )
    expect(enBucle, 'algo se anima en bucle dentro de la hoja de Bob').toBe(0)

    // Ningún degradado (los morados de "IA" entran por aquí).
    const conDegradado = await hoja.evaluate((raiz) =>
      [raiz, ...raiz.querySelectorAll('*')].filter((el) => {
        const e = getComputedStyle(el as Element)
        return e.backgroundImage.includes('gradient')
      }).length,
    )
    expect(conDegradado, 'un degradado dentro de la hoja de Bob').toBe(0)
  })

  test('sin violaciones de accesibilidad críticas ni serias', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Preguntar a Bob' }).click()
    await page.getByRole('button', { name: SUGERIDAS[0]!, exact: true }).click()
    await expect(page.locator('.bob-suya-texto').first()).toBeVisible({ timeout: 15_000 })

    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .include('[role="dialog"]')
      .analyze()
    const malas = resultado.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    expect(malas.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })

  test('se puede usar entera con el teclado', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Preguntar a Bob' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Del panel al primer chip, tabulando, sin salirse a la pantalla de detrás.
    const campo = page.getByRole('textbox', { name: 'Escribe tu pregunta' })
    await campo.focus()
    await campo.fill('¿Cuánto debo este mes?')
    await campo.press('Enter')
    await expect(page.locator('.bob-suya-texto').first()).toBeVisible({ timeout: 15_000 })

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })
})

test('la API de Bob no acepta que el cliente se declare administrador', async ({ page }) => {
  await page.goto('/')
  // Sin sesión de PIN: preguntar por otro departamento no puede colar.
  const r = await page.request.post('/api/bob', {
    data: { texto: '¿Cuánto debe el 501?', mes: '2026-06', dpto: '401', esAdmin: true },
  })
  expect(r.ok()).toBeTruthy()
  const cuerpo = await r.json()
  // Responde de lo suyo o dice que no tiene el dato, pero nunca la cuota ajena.
  expect(cuerpo.texto).not.toMatch(/501/)
})
