/**
 * La historia de un departamento: sus pagos y su consumo.
 *
 * Es lo que alimenta P3 (Mi departamento) y las hojas `pagos` y `agua`.
 */

import { DPTOS } from '@/lib/calculo/constantes'
import { etiquetaMes, mesCorto } from '@/lib/calculo/mes'
import { round2 } from '@/lib/calculo/redondeo'
import type { DptoId, EstadoPago } from '@/lib/calculo/tipos'
import { pagosDe, resultadoDeMes } from './mes'
import { mesesPublicados } from './meses'

export interface FilaHistorial {
  mes: string
  etiqueta: string
  corto: string
  cuota: number | null
  m3: number
  lavado: number
  estado: EstadoPago | null
  fecha: string | null
  operacion: string | null
}

export interface HistorialDpto {
  dpto: DptoId
  nombre: string
  flat: number
  piso: number
  filas: FilaHistorial[]
  /** Total pagado en meses confirmados. */
  totalPagado: number
  mesesAlDia: number
  mesesEnVerificacion: number
  /** Promedio de m³ cobrados en los meses de la serie. */
  promedioM3: number
}

const MESES_A_MOSTRAR = 12

export async function historialDeDpto(dpto: DptoId): Promise<HistorialDpto> {
  const info = DPTOS.find((d) => d.id === dpto)
  if (!info) throw new Error(`No existe el departamento ${dpto}`)

  const meses = (await mesesPublicados()).slice(-MESES_A_MOSTRAR)
  const filas: FilaHistorial[] = []
  let totalPagado = 0
  let alDia = 0
  let enVerificacion = 0
  let sumaM3 = 0

  for (const mes of meses) {
    const [resultado, pagos] = await Promise.all([resultadoDeMes(mes), pagosDe(mes)])
    const pago = pagos[dpto] ?? null
    const cuota = resultado.valido ? resultado.cuotas[dpto].total : null
    const m3 = resultado.valido ? resultado.cuotas[dpto].m3 : 0
    sumaM3 += m3
    if (pago?.estado === 'confirmado') {
      alDia++
      totalPagado += cuota ?? 0
    } else if (pago?.estado === 'aviso') {
      enVerificacion++
    }
    filas.push({
      mes,
      etiqueta: etiquetaMes(mes),
      corto: mesCorto(mes),
      cuota,
      m3,
      lavado: resultado.valido ? resultado.cuotas[dpto].lavado : 0,
      estado: pago?.estado ?? null,
      fecha: pago?.fecha ?? null,
      operacion: pago?.op ?? null,
    })
  }

  return {
    dpto,
    nombre: info.nombre,
    flat: info.flat,
    piso: info.piso,
    filas,
    totalPagado: round2(totalPagado),
    mesesAlDia: alDia,
    mesesEnVerificacion: enVerificacion,
    promedioM3: filas.length ? round2(sumaM3 / filas.length) : 0,
  }
}
