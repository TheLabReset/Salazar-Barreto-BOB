import { expect, test, type Page } from './basedatos'

/**
 * El cierre del mes, de principio a fin. Fase 5 del verificador.
 *
 * Recorre los siete pasos con los datos reales de julio y comprueba que el
 * resultado coincide **al céntimo** con lo que devuelve el motor. Y comprueba
 * las cosas que tienen que fallar: publicar dos veces, publicar sin cuadrar,
 * y salir a mitad y volver.
 *
 * Requiere sesión de administración: se obtiene con el PIN del entorno.
 */

const JULIO = {
  '101': '186461', '201': '185256', '202': '52513', '301': '441532',
  '401': '438038', '501': '232826', '502': '292678',
} as const
/** Lo que el motor calcula para julio con estos datos. Verificado en la Fase 1. */
const ESPERADO_JULIO = {
  totalMes: '3,374.38',
  cuotas: {
    '101': '381.83', '201': '342.85', '202': '683.54', '301': '371.02',
    '401': '388.96', '501': '535.69', '502': '663.70',
  },
}

/** Teclea un número en el teclado numérico propio. */
async function teclear(page: Page, digitos: string) {
  await expect(page.getByRole('dialog').last()).toBeVisible()
  for (const d of digitos) {
    await page.getByRole('button', { name: d === '.' ? 'Punto decimal' : d, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
}

async function abrirCierre(page: Page) {
  await page.goto('/admin')
  await page.getByRole('button', { name: /Empezar|Seguir con/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

/**
 * En serie y con un solo worker: **todos estos tests escriben en la misma base**
 * y cada uno la rehace desde la semilla. En paralelo se pisaban entre ellos y el
 * fallo aparecía en un test distinto del que lo causaba, que es la peor forma de
 * depurar algo.
 */
test.describe.configure({ mode: 'serial' })

test.describe('el cierre del mes, paso a paso', () => {
  test('los siete pasos, y el resultado coincide con el motor al céntimo', async ({ page }) => {
    await abrirCierre(page)

    // Paso 0
    await expect(page.getByRole('heading', { name: 'Vamos a cerrar julio' })).toBeVisible()
    await page.getByRole('button', { name: 'Empezar', exact: true }).click()

    // Paso 1 · las siete lecturas
    await expect(page.getByRole('heading', { name: 'Las lecturas' })).toBeVisible()
    await expect(page.getByText('0 / 7')).toBeVisible()
    for (const [dpto, valor] of Object.entries(JULIO)) {
      await page.getByRole('button', { name: new RegExp(`^${dpto}\\b`) }).first().click()
      await teclear(page, `${valor.slice(0, -3)}.${valor.slice(-3)}`)
    }
    await expect(page.getByText('7 / 7')).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Paso 2 · la factura de agua
    await expect(page.getByRole('heading', { name: 'La factura de agua' })).toBeVisible()
    await page.getByRole('button', { name: /Consumo de agua del edificio/ }).click()
    await teclear(page, '81')
    await page.getByRole('button', { name: /Monto de la factura de agua/ }).click()
    await teclear(page, '338.60')
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Paso 3 · la luz
    await expect(page.getByRole('heading', { name: 'El recibo de luz común' })).toBeVisible()
    await page.getByRole('button', { name: /Monto del recibo de luz común/ }).click()
    await teclear(page, '361.20')
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Paso 4 · los gastos fijos, ya puestos
    await expect(page.getByRole('heading', { name: 'Los gastos que no cambian' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar y seguir' }).click()

    // Paso 5 · nada puntual este mes
    await expect(page.getByRole('heading', { name: '¿Pasó algo fuera de lo normal?' })).toBeVisible()
    await page.getByRole('button', { name: 'Nada más este mes, seguir' }).click()

    // Paso 6 · la revisión, con las cifras del motor
    await expect(page.getByRole('heading', { name: 'Así queda julio' })).toBeVisible()
    await expect(page.getByText('El agua cuadra exacto')).toBeVisible()
    for (const [dpto, cuota] of Object.entries(ESPERADO_JULIO.cuotas)) {
      const fila = page.locator('.revision-fila').filter({ hasText: dpto })
      await expect(fila, `la cuota del ${dpto}`).toContainText(cuota)
    }
    await expect(page.locator('.revision-cuadre-total')).toContainText(ESPERADO_JULIO.totalMes)
    await page.getByRole('button', { name: 'Todo correcto, seguir' }).click()

    // Paso 7 · publicar
    await expect(page.getByRole('heading', { name: 'La nota del mes' })).toBeVisible()
    await page.getByRole('button', { name: /^Publicar julio/ }).click()
    await expect(page.getByRole('heading', { name: /ya está publicado/ })).toBeVisible()

    // Y el mes queda publicado de verdad: la API lo confirma.
    const r = await page.request.get('/api/meses')
    const { meses } = await r.json()
    const julio = meses.find((m: { mes: string }) => m.mes === '2026-07')
    expect(julio.publicado).toBe(true)
    expect(julio.cuadra).toBe(true)
  })

  test('se sale a mitad y se vuelve al mismo paso, con los datos escritos', async ({ page }) => {
    await abrirCierre(page)
    await page.getByRole('button', { name: 'Empezar', exact: true }).click()

    await page.getByRole('button', { name: /^101\b/ }).first().click()
    await teclear(page, '186.461')
    await expect(page.getByText('1 / 7')).toBeVisible()

    // Recargar la página entera: es salir de verdad, no cerrar la hoja.
    await page.reload()
    await abrirCierre(page)
    await expect(page.getByRole('heading', { name: 'Las lecturas' })).toBeVisible()
    await expect(page.getByText('1 / 7')).toBeVisible()
    await expect(page.getByText('186.461')).toBeVisible()
  })

  /**
   * La corrección de tecleo, en la pantalla y no en el motor.
   *
   * El motor de `01` §8 estaba probado desde la Fase 1 y **aun así la propuesta
   * no salía nunca**: la regla descarta candidatas comparando contra los m³ de
   * SEDAPAL, el paso 1 va antes del recibo, y preguntada allí `objetivoM3` vale
   * 0 y ninguna candidata sobrevive. Cero propuestas en 11.329 lecturas. Este
   * test existe porque el de motor no lo habría visto.
   */
  test('una lectura con dos dígitos transpuestos: Bob la propone y se acepta', async ({ page }) => {
    await abrirCierre(page)
    await page.getByRole('button', { name: 'Empezar', exact: true }).click()

    // Las siete lecturas de julio, pero el 401 con los dígitos cambiados:
    // 483.038 en vez de 438.038. Es el caso que enseña `04-cierre-del-mes.md`.
    for (const [dpto, valor] of Object.entries({ ...JULIO, '401': '483038' })) {
      await page.getByRole('button', { name: new RegExp(`^${dpto}\\b`) }).first().click()
      await teclear(page, `${valor.slice(0, -3)}.${valor.slice(-3)}`)
    }
    // En el paso 1 todavía no hay recibo, así que nadie propone nada.
    await expect(page.locator('[data-propuesta]')).toHaveCount(0)
    await expect(page.getByText('7 / 7')).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Paso 2: en cuanto se escriben los m³, la regla se puede evaluar.
    await expect(page.getByRole('heading', { name: 'La factura de agua' })).toBeVisible()
    await page.getByRole('button', { name: /Consumo de agua del edificio/ }).click()
    await teclear(page, '81')

    const propuesta = page.locator('[data-propuesta="401"]')
    await expect(propuesta).toBeVisible()
    // La frase, literal del documento de diseño.
    await expect(propuesta).toContainText(
      '¿Será 438.038? Con 483.038 el consumo sería 62.40 m³, cuatro veces tu promedio, ' +
        'y el edificio pasaría de lo que facturó SEDAPAL.',
    )

    await propuesta.getByRole('button', { name: 'Sí, es 438.038' }).click()
    await expect(page.locator('[data-propuesta]')).toHaveCount(0)

    // Y la lectura quedó corregida en el servidor, no solo en la pantalla.
    const borrador = await (await page.request.get('/api/meses/2026-07/borrador')).json()
    expect(borrador.lecturas['401']).toBe(438.038)
  })

  test('con dos lecturas sospechosas a la vez, no propone ninguna', async ({ page }) => {
    await abrirCierre(page)
    await page.getByRole('button', { name: 'Empezar', exact: true }).click()

    // El 401 y el 101, los dos con dígitos transpuestos. Señalar uno de los dos
    // dirige la vista al sitio equivocado, así que se calla (`01` §8).
    for (const [dpto, valor] of Object.entries({ ...JULIO, '401': '483038', '101': '816461' })) {
      await page.getByRole('button', { name: new RegExp(`^${dpto}\\b`) }).first().click()
      await teclear(page, `${valor.slice(0, -3)}.${valor.slice(-3)}`)
    }
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: /Consumo de agua del edificio/ }).click()
    await teclear(page, '81')

    await expect(page.getByRole('heading', { name: 'La factura de agua' })).toBeVisible()
    await expect(page.locator('[data-propuesta]')).toHaveCount(0)
  })

  test('con una lectura que no cuadra, el paso 6 bloquea la publicación', async ({ page }) => {
    // Se escriben las siete lecturas, pero una con el medidor retrocedido: eso
    // da un consumo negativo, que el tercer cuadre detecta.
    await abrirCierre(page)
    await page.getByRole('button', { name: 'Empezar', exact: true }).click()
    for (const [dpto, valor] of Object.entries(JULIO)) {
      await page.getByRole('button', { name: new RegExp(`^${dpto}\\b`) }).first().click()
      await teclear(page, dpto === '101' ? '1.000' : `${valor.slice(0, -3)}.${valor.slice(-3)}`)
    }
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: /Consumo de agua del edificio/ }).click()
    await teclear(page, '81')
    await page.getByRole('button', { name: /Monto de la factura de agua/ }).click()
    await teclear(page, '338.60')
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: /Monto del recibo de luz común/ }).click()
    await teclear(page, '361.20')
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: 'Confirmar y seguir' }).click()
    await page.getByRole('button', { name: /Nada más este mes, seguir|Continuar/ }).click()

    // Paso 6: no cuadra, y el botón dice qué revisar en vez de ponerse gris.
    await expect(page.getByText('Los montos no cuadran')).toBeVisible()
    await expect(page.getByText('Revisa la factura para seguir')).toBeVisible()

    // Y aunque se llame a la API directamente, tampoco publica.
    const r = await page.request.post('/api/meses/2026-07/publicar', {
      data: { notaQuePaso: 'x', notaQueCambio: 'x', notaQuePendiente: 'x' },
    })
    expect(r.status()).toBe(409)
    expect((await r.json()).error).toContain('no cuadra')
  })

  test('publicar dos veces falla limpiamente', async ({ page }) => {
    // Junio ya está publicado en la semilla.
    const r = await page.request.post('/api/meses/2026-06/publicar', {
      data: { notaQuePaso: 'x', notaQueCambio: 'x', notaQuePendiente: 'x' },
    })
    expect(r.status()).toBe(409)
    expect((await r.json()).error).toContain('ya estaba publicado')
  })

  test('desmarcar el lavado: el 401 paga menos y el total del mes no cambia', async ({ page }) => {
    const antes = await (await page.request.get('/api/meses/2026-06')).json()
    expect(antes.resultado.lavado).toBe(1.5)

    // La semilla deja julio vacío: se cargan sus datos como haría el cierre.
    for (const [dpto, valor] of Object.entries(JULIO)) {
      const r = await page.request.put('/api/meses/2026-07/lecturas', {
        data: { lecturas: { [dpto]: Number(`${valor.slice(0, -3)}.${valor.slice(-3)}`) } },
      })
      expect(r.ok(), `guardar la lectura del ${dpto}`).toBeTruthy()
    }
    const rec = await page.request.put('/api/meses/2026-07/recibo', {
      data: { aguaM3: 81, aguaMonto: 338.6, luz: 361.2 },
    })
    expect(rec.ok()).toBeTruthy()

    const conLavado = await (await page.request.get('/api/meses/2026-07')).json()
    expect(conLavado.resultado.lavado).toBe(1.5)
    const aguaConLavado = conLavado.resultado.cuotas['401'].agua

    const r = await page.request.put('/api/meses/2026-07/reasignaciones', { data: { activa: false } })
    expect(r.ok()).toBeTruthy()

    const julio = await (await page.request.get('/api/meses/2026-07')).json()
    expect(julio.resultado.lavado).toBe(0)
    // El área común vuelve a repartirse entre los siete…
    expect(julio.resultado.comunReal).toBe(julio.resultado.brutoComun)
    // …el 401 paga menos…
    expect(julio.resultado.cuotas['401'].agua).toBeLessThan(aguaConLavado)
    // …y el total del mes NO cambia.
    expect(julio.resultado.totalMes).toBe(3374.38)
  })
})
