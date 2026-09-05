/**
 * Intentar romperlo. Fase 3, punto 3 del verificador.
 *
 * Cada uno de estos tiene que devolver **un error claro con su código HTTP**,
 * nunca un 500 ni un registro corrupto en la base. Un 500 es un bug que se nos
 * escapó, no una forma de contestar.
 *
 * Se prueban los servicios, que es donde vive la regla, y además los esquemas
 * Zod, que son el borde. Los dos, porque el borde puede cambiar y la regla tiene
 * que seguir en pie.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  zAvisoPago, zConfirmarPago, zCorregir, zGuardarGastos, zGuardarLecturas,
  zGuardarRecibo, zMes, zPublicar, zValidarPin,
} from '@/lib/esquemas'
import { guardarGastos, guardarLecturas, guardarRecibo, publicarMes } from '@/lib/servicios/cierre'
import { avisarPago, confirmarPago } from '@/lib/servicios/pagos'
import { validarPin } from '@/lib/servicios/admin'
import { ErrorDeApi } from '@/lib/servicios/errores'
import { resultadoDeMes } from '@/lib/datos/mes'
import { cargarMesEnCurso, prisma, resembrar } from './entorno'

const EN_CURSO = '2026-07'
const PUBLICADO = '2026-06'

beforeAll(async () => {
  process.env.ADMIN_PIN ??= '2026'
  await resembrar()
}, 60_000)

afterAll(async () => {
  await prisma.$disconnect()
})

/** Ejecuta y devuelve el `ErrorDeApi`, o falla si no hubo error. */
async function falla(accion: () => Promise<unknown>): Promise<ErrorDeApi> {
  try {
    await accion()
  } catch (e) {
    if (e instanceof ErrorDeApi) return e
    throw new Error(`Se esperaba un ErrorDeApi y llegó: ${String(e)}`)
  }
  throw new Error('Se esperaba un error y no hubo ninguno')
}

describe('un mes con formato inválido', () => {
  for (const malo of ['2026-13', 'junio', '', '2026-6', '26-06', 'DROP TABLE recibo']) {
    it(`${JSON.stringify(malo)} lo rechaza el esquema`, () => {
      expect(zMes.safeParse(malo).success).toBe(false)
    })
  }

  it('2026-07 sí es válido', () => {
    expect(zMes.safeParse('2026-07').success).toBe(true)
  })
})

describe('una lectura menor que la del mes anterior', () => {
  it('se guarda, pero el mes deja de cuadrar y no se puede publicar', async () => {
    // Guardarla está permitido: el medidor pudo cambiarse. Lo que no puede pasar
    // es que se publique un mes con un consumo negativo, que es lo que producía
    // una cuota de S/ -375.05 con los dos cuadres en verde.
    await cargarMesEnCurso(EN_CURSO)
    const antes = await resultadoDeMes(EN_CURSO)
    expect(antes.cuadra).toBe(true)

    await guardarLecturas(EN_CURSO, { lecturas: { '101': 1 } })
    const despues = await resultadoDeMes(EN_CURSO)
    expect(despues.consumos['101']).toBeLessThan(0)
    expect(despues.cuadraSanidad).toBe(false)
    expect(despues.cuadra).toBe(false)

    const error = await falla(() =>
      publicarMes(EN_CURSO, { notaQuePaso: 'x', notaQueCambio: 'x', notaQuePendiente: 'x' }),
    )
    expect(error.estado).toBe(409)
    expect(error.message).toContain('no cuadra')

    // Restaurar
    await guardarLecturas(EN_CURSO, { lecturas: { '101': 186.461 } })
    expect((await resultadoDeMes(EN_CURSO)).cuadra).toBe(true)
  })
})

describe('un monto negativo', () => {
  it('lo rechaza el esquema del recibo', () => {
    const r = zGuardarRecibo.safeParse({ aguaMonto: -100 })
    expect(r.success).toBe(false)
  })

  it('lo rechaza el esquema de las lecturas', () => {
    expect(zGuardarLecturas.safeParse({ lecturas: { '101': -5 } }).success).toBe(false)
  })

  it('lo rechaza el esquema de los gastos', () => {
    expect(
      zGuardarGastos.safeParse({ extras: [{ tipo: 'gasto', concepto: 'x', monto: -1 }] }).success,
    ).toBe(false)
  })

  it('la base lo rechaza aunque el servicio se olvidara', async () => {
    await expect(
      prisma.recibo.update({ where: { mes: EN_CURSO }, data: { aguaMonto: -1 } }),
    ).rejects.toThrow()
  })
})

describe('un descuento mayor que el monto de la factura', () => {
  it('el servicio lo rechaza con 400 y un mensaje que se entiende', async () => {
    const error = await falla(() => guardarRecibo(EN_CURSO, { aguaMonto: 100, descuento: 350 }))
    expect(error.estado).toBe(400)
    expect(error.message).toContain('descuento')
  })

  it('la base también, por si acaso', async () => {
    await expect(
      prisma.recibo.update({ where: { mes: EN_CURSO }, data: { descuento: 99999 } }),
    ).rejects.toThrow()
  })
})

describe('un departamento que no existe', () => {
  it('lo rechaza el esquema del aviso de pago', () => {
    expect(zAvisoPago.safeParse({ mes: '2026-07', dpto: '999' }).success).toBe(false)
  })

  it('lo rechaza el esquema de las lecturas', () => {
    expect(zGuardarLecturas.safeParse({ lecturas: { '999': 100 } }).success).toBe(false)
  })

  it('la base rechaza una lectura de un departamento inexistente', async () => {
    await expect(
      prisma.lectura.create({ data: { mes: EN_CURSO, dptoId: '999', valor: '100' } }),
    ).rejects.toThrow()
  })
})

describe('un crédito sin departamento', () => {
  it('lo rechaza el esquema', () => {
    expect(
      zGuardarGastos.safeParse({ extras: [{ tipo: 'credito', monto: 50 }] }).success,
    ).toBe(false)
  })

  it('la base lo rechaza con su CHECK', async () => {
    await expect(
      prisma.gastoExtra.create({
        data: { mes: EN_CURSO, tipo: 'credito', concepto: 'x', monto: '50', dptoId: null },
      }),
    ).rejects.toThrow()
  })

  it('un gasto CON departamento también se rechaza: lo pagan los siete', async () => {
    await expect(
      prisma.gastoExtra.create({
        data: { mes: EN_CURSO, tipo: 'gasto', concepto: 'x', monto: '50', dptoId: '401' },
      }),
    ).rejects.toThrow()
  })
})

describe('publicar un mes que ya está publicado', () => {
  it('falla limpiamente con 409', async () => {
    const error = await falla(() =>
      publicarMes(PUBLICADO, { notaQuePaso: 'x', notaQueCambio: 'x', notaQuePendiente: 'x' }),
    )
    expect(error.estado).toBe(409)
    expect(error.message).toContain('ya estaba publicado')
  })

  it('y no deja el mes tocado', async () => {
    const cierre = await prisma.cierre.findUnique({ where: { mes: PUBLICADO } })
    expect(cierre?.publicado).toBe(true)
    expect(cierre?.publicadoPor).toBe('semilla')
  })
})

describe('escribir en un mes ya publicado', () => {
  it('se rechaza: para eso está corregir, que avisa a los siete', async () => {
    const error = await falla(() => guardarLecturas(PUBLICADO, { lecturas: { '101': 181 } }))
    expect(error.estado).toBe(409)
    expect(error.message).toContain('corregirlo')
  })
})

describe('el PIN', () => {
  it('rechaza cualquier cosa que no sean cuatro dígitos', () => {
    for (const malo of ['', '1', '12345', 'abcd', '20 26', '²⁰²⁶']) {
      expect(zValidarPin.safeParse({ pin: malo }).success, malo).toBe(false)
    }
  })

  it('el correcto entra', async () => {
    const { cookie } = await validarPin('2026', '10.0.0.1')
    expect(cookie).toMatch(/^\d+\./)
  })

  it('veinte intentos incorrectos seguidos: el noveno ya está bloqueado', async () => {
    const ip = '10.0.0.99'
    const estados: number[] = []
    for (let i = 0; i < 20; i++) {
      const error = await falla(() => validarPin('0000', ip))
      estados.push(error.estado)
    }
    // Los ocho primeros son 401 (PIN incorrecto); a partir de ahí, 429.
    expect(estados.slice(0, 8).every((e) => e === 401)).toBe(true)
    expect(estados.slice(8).every((e) => e === 429)).toBe(true)
  })

  it('el PIN correcto tampoco entra si esa IP ya está bloqueada', async () => {
    const error = await falla(() => validarPin('2026', '10.0.0.99'))
    expect(error.estado).toBe(429)
  })

  it('otra IP no queda bloqueada por culpa de la primera', async () => {
    const { cookie } = await validarPin('2026', '10.0.0.2')
    expect(cookie).toBeTruthy()
  })
})

describe('confirmar un pago', () => {
  it('un pago ya confirmado no se confirma dos veces', async () => {
    const error = await falla(() => confirmarPago({ mes: PUBLICADO, dpto: '101' }))
    expect(error.estado).toBe(409)
  })

  it('un departamento inexistente da 404, no 500', async () => {
    const error = await falla(() =>
      confirmarPago({ mes: PUBLICADO, dpto: '999' as never }),
    )
    expect(error.estado).toBe(404)
  })
})

describe('avisar un pago', () => {
  it('sobre un pago ya confirmado, se rechaza', async () => {
    const error = await falla(() => avisarPago({ mes: PUBLICADO, dpto: '101' }))
    expect(error.estado).toBe(409)
  })
})

describe('inyección y cuerpos absurdos', () => {
  it("'; DROP TABLE recibo; -- no rompe nada", async () => {
    const veneno = "'; DROP TABLE recibo; --"
    expect(zMes.safeParse(veneno).success).toBe(false)
    // Y si llegara como concepto de un gasto, se guarda como texto y ya.
    await guardarGastos(EN_CURSO, { extras: [{ tipo: 'gasto', concepto: veneno, monto: 1 }] })
    const guardado = await prisma.gastoExtra.findFirst({ where: { mes: EN_CURSO } })
    expect(guardado?.concepto).toBe(veneno)
    const tablas = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `select count(*)::bigint as count from information_schema.tables where table_schema = 'public'`,
    )
    expect(Number(tablas[0]!.count)).toBeGreaterThan(10)
    await guardarGastos(EN_CURSO, { extras: [] })
  })

  it('<script> se guarda como texto, no se interpreta', async () => {
    const veneno = '<script>alert(1)</script>'
    await guardarGastos(EN_CURSO, { extras: [{ tipo: 'gasto', concepto: veneno, monto: 1 }] })
    const guardado = await prisma.gastoExtra.findFirst({ where: { mes: EN_CURSO } })
    expect(guardado?.concepto).toBe(veneno)
    await guardarGastos(EN_CURSO, { extras: [] })
  })

  it('un texto de 10 MB lo corta el esquema', () => {
    const enorme = 'x'.repeat(10 * 1024 * 1024)
    expect(zPublicar.safeParse({ notaQuePaso: enorme, notaQueCambio: '', notaQuePendiente: '' }).success).toBe(false)
    expect(zCorregir.safeParse({ motivo: enorme }).success).toBe(false)
  })

  it('una lista de mil gastos la corta el esquema', () => {
    const muchos = Array.from({ length: 1000 }, () => ({ tipo: 'gasto' as const, concepto: 'x', monto: 1 }))
    expect(zGuardarGastos.safeParse({ extras: muchos }).success).toBe(false)
  })

  it('un monto como cadena se rechaza, no se convierte en silencio', () => {
    // Convertir "1200" en 1200 automáticamente es cómo un gasto acabó
    // desapareciendo del total. Si llega una cadena, la arregla el cliente.
    expect(zGuardarGastos.safeParse({ extras: [{ tipo: 'gasto', concepto: 'x', monto: '1200' }] }).success).toBe(false)
    expect(zGuardarRecibo.safeParse({ aguaMonto: '325' }).success).toBe(false)
  })

  it('NaN e Infinity se rechazan', () => {
    for (const toxico of [NaN, Infinity, -Infinity]) {
      expect(zGuardarRecibo.safeParse({ aguaMonto: toxico }).success, String(toxico)).toBe(false)
      expect(zGuardarLecturas.safeParse({ lecturas: { '101': toxico } }).success, String(toxico)).toBe(false)
    }
  })

  it('un monto con tres decimales se rechaza: el dinero va en céntimos', () => {
    expect(zGuardarRecibo.safeParse({ aguaMonto: 325.123 }).success).toBe(false)
    expect(zGuardarRecibo.safeParse({ aguaMonto: 325.12 }).success).toBe(true)
  })

  it('los m³ del recibo tienen que venir en entero, como en el papel', () => {
    expect(zGuardarRecibo.safeParse({ aguaM3: 78.5 }).success).toBe(false)
    expect(zGuardarRecibo.safeParse({ aguaM3: 78 }).success).toBe(true)
  })

  it('confirmar un pago con una fecha inventada se rechaza', () => {
    expect(zConfirmarPago.safeParse({ mes: '2026-07', dpto: '401', fecha: 'ayer' }).success).toBe(false)
  })
})
