/**
 * Un gasto extra se reparte según su `reparto`, y el mes cuadra igual.
 *
 * Los dos casos son del Excel real:
 *   - la «cuota bomba de agua» de julio 2026: S/ 1280.30 en partes iguales
 *     entre los siete, S/ 182.90 a cada uno.
 *   - el «mantenimiento del portón» de agosto 2026: S/ 300 entre seis, sin el
 *     101, S/ 50 a cada uno.
 *
 * La trampa que esto cubre: si un reparto igual se metiera por flat, el total
 * **cuadraría igual en verde** pero las cuotas individuales estarían mal. Por
 * eso se comprueba cuota por cuota, no solo el total.
 */
import { describe, expect, it } from 'vitest'
import { calcularMesSemilla } from './ayuda'
import { DPTO_IDS } from '../constantes'
import { round2 } from '../redondeo'
import type { DptoId, Extra } from '../tipos'

const MES = '2026-06'
const base = calcularMesSemilla(MES)

function conExtra(extra: Extra) {
  return calcularMesSemilla(MES, { extras: [extra] })
}

describe('reparto de un extra en partes iguales', () => {
  it('la base del mes es válida y cuadra', () => {
    expect(base.valido).toBe(true)
    expect(base.cuadra).toBe(true)
  })

  it('la cuota bomba de agua: 182.90 más a cada uno de los siete', () => {
    const r = conExtra({ tipo: 'gasto', concepto: 'Cuota bomba de agua', monto: 1280.3, reparto: 'igual' })
    for (const d of DPTO_IDS) {
      expect(r.cuotas[d].mantenimiento).toBe(round2(base.cuotas[d].mantenimiento + 182.9))
    }
    expect(r.totalMes).toBe(base.totalMes + 1280.3)
    expect(r.cuadra).toBe(true)
  })

  it('el portón: 50 más a seis, y CERO al 101', () => {
    const seis = DPTO_IDS.filter((d) => d !== '101')
    const r = conExtra({
      tipo: 'gasto',
      concepto: 'Mantenimiento del portón',
      monto: 300,
      reparto: 'igual',
      participantes: seis,
    })
    // El 101 no paga: su mantenimiento no se mueve ni un céntimo.
    expect(r.cuotas['101'].mantenimiento).toBe(base.cuotas['101'].mantenimiento)
    for (const d of seis) {
      expect(r.cuotas[d as DptoId].mantenimiento).toBe(round2(base.cuotas[d as DptoId].mantenimiento + 50))
    }
    expect(r.totalMes).toBe(base.totalMes + 300)
    expect(r.cuadra).toBe(true)
  })

  it('discriminador: por flat, el 101 SÍ pagaría —el reparto importa', () => {
    // El mismo monto por flat entre los siete sí carga al 101. Si el reparto
    // por subconjunto se colara por flat, esta diferencia desaparecería.
    const porFlat = conExtra({ tipo: 'gasto', concepto: 'Si fuera flat', monto: 300 })
    expect(porFlat.cuotas['101'].mantenimiento).toBeGreaterThan(base.cuotas['101'].mantenimiento)
  })
})

describe('reparto de un extra por flat entre un subconjunto', () => {
  it('reparte proporcional al flat solo entre los elegidos, y cuadra', () => {
    const dos: DptoId[] = ['501', '502']
    const r = conExtra({ tipo: 'gasto', concepto: 'Algo de la azotea', monto: 200, reparto: 'flat', participantes: dos })
    // Los que no participan no se mueven.
    for (const d of DPTO_IDS.filter((x) => !dos.includes(x as DptoId))) {
      expect(r.cuotas[d].mantenimiento).toBe(base.cuotas[d].mantenimiento)
    }
    // Los dos elegidos absorben los 200 completos.
    const subio =
      r.cuotas['501'].mantenimiento -
      base.cuotas['501'].mantenimiento +
      (r.cuotas['502'].mantenimiento - base.cuotas['502'].mantenimiento)
    expect(Math.round(subio * 100) / 100).toBe(200)
    expect(r.totalMes).toBe(base.totalMes + 200)
    expect(r.cuadra).toBe(true)
  })
})
