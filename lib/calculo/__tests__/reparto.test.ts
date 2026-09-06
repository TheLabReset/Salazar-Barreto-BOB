/**
 * El reparto de un extra cuadra al céntimo, siempre.
 *
 * La regla que no se puede romper: la suma de las partes es idéntica al monto.
 * Un céntimo perdido en el reparto rompe el cuadre del mes, y eso el usuario lo
 * ve como un total que no da.
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { repartirIgual, repartirPorPeso } from '../reparto'
import { DPTO_IDS, dpto } from '../constantes'
import type { DptoId } from '../tipos'

const suma = (r: Record<string, number>) =>
  Math.round(Object.values(r).reduce((a, b) => a + b, 0) * 100) / 100

describe('repartir en partes iguales', () => {
  it('el portón: S/ 300 entre seis (sin el 101) da 50 a cada uno', () => {
    const seis = DPTO_IDS.filter((d) => d !== '101')
    const r = repartirIgual(300, seis)
    expect(seis.every((d) => r[d] === 50)).toBe(true)
    expect(r['101']).toBeUndefined()
    expect(suma(r)).toBe(300)
  })

  it('la cuota bomba de agua: S/ 1280.30 entre siete da 182.90 a cada uno', () => {
    const r = repartirIgual(1280.3, DPTO_IDS)
    expect(DPTO_IDS.every((d) => r[d] === 182.9)).toBe(true)
    expect(suma(r)).toBe(1280.3)
  })

  it('cuando no divide exacto, el sobrante de céntimos va a los primeros', () => {
    // 100 / 3 = 33.333…: uno recibe 33.34 y dos reciben 33.33, y suman 100.00
    const r = repartirIgual(100, ['101', '201', '301'])
    const valores = ['101', '201', '301'].map((d) => r[d as DptoId]).sort()
    expect(valores).toEqual([33.33, 33.33, 33.34])
    expect(suma(r)).toBe(100)
  })
})

describe('repartir proporcional a un peso', () => {
  it('por flat entre los siete cuadra al monto', () => {
    const r = repartirPorPeso(1000, DPTO_IDS, (d) => dpto(d).flat)
    expect(suma(r)).toBe(1000)
  })

  it('por flat entre un subconjunto también cuadra', () => {
    const tres: DptoId[] = ['101', '501', '502']
    const r = repartirPorPeso(453.7, tres, (d) => dpto(d).flat)
    expect(suma(r)).toBe(453.7)
    expect(Object.keys(r).sort()).toEqual(['101', '501', '502'])
  })
})

describe('la propiedad que no se negocia: la suma es exacta', () => {
  it('para cualquier monto y cualquier subconjunto, en partes iguales', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100000, noNaN: true }),
        fc.subarray([...DPTO_IDS], { minLength: 1 }),
        (montoCrudo, entre) => {
          const monto = Math.round(montoCrudo * 100) / 100
          expect(suma(repartirIgual(monto, entre))).toBe(monto)
        },
      ),
      { numRuns: 3000 },
    )
  })

  it('para cualquier monto y subconjunto, proporcional al flat', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100000, noNaN: true }),
        fc.subarray([...DPTO_IDS], { minLength: 1 }),
        (montoCrudo, entre) => {
          const monto = Math.round(montoCrudo * 100) / 100
          expect(suma(repartirPorPeso(monto, entre, (d) => dpto(d).flat))).toBe(monto)
        },
      ),
      { numRuns: 3000 },
    )
  })
})
