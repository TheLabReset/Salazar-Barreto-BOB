/**
 * El reparto de un extra sobrevive el viaje a la base y vuelve igual.
 *
 * El motor ya sabe repartir (test unitario). Aquí se comprueba lo otro: que
 * `guardarGastos` graba el `reparto` y los `participantes`, y que
 * `resultadoDeMes` los lee y calcula con ellos. Si se perdieran en el camino, el
 * motor repartiría por flat y nadie lo notaría hasta ver la cuota del 101.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { resultadoDeMes } from '@/lib/datos/mes'
import { guardarGastos } from '@/lib/servicios/cierre'
import { round2 } from '@/lib/calculo/redondeo'
import { cargarMesEnCurso, resembrar } from './entorno'

const MES = '2026-07'

describe('el reparto de un extra persiste', () => {
  beforeEach(async () => {
    await resembrar()
    await cargarMesEnCurso(MES)
  })

  it('el portón (igual entre seis, sin el 101) se graba y se recalcula igual', async () => {
    const base = await resultadoDeMes(MES)
    if (!base.valido) throw new Error(`base inválida: ${base.motivoInvalido}`)

    await guardarGastos(MES, {
      extras: [
        {
          tipo: 'gasto',
          concepto: 'Mantenimiento del portón',
          monto: 300,
          reparto: 'igual',
          participantes: ['201', '202', '301', '401', '501', '502'],
        },
      ],
    })

    const despues = await resultadoDeMes(MES)
    if (!despues.valido) throw new Error(`después inválido: ${despues.motivoInvalido}`)

    // El 101 no participa: su mantenimiento no se mueve.
    expect(despues.cuotas['101'].mantenimiento).toBe(base.cuotas['101'].mantenimiento)
    // Los otros seis pagan 50 cada uno.
    for (const d of ['201', '202', '301', '401', '501', '502'] as const) {
      expect(despues.cuotas[d].mantenimiento).toBe(round2(base.cuotas[d].mantenimiento + 50))
    }
    expect(despues.totalMes).toBe(round2(base.totalMes + 300))
    expect(despues.cuadra).toBe(true)
  })
})
