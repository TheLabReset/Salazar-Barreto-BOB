/**
 * El saldo de la cuenta conjunta. `01-reglas-de-negocio.md` §6.
 *
 * ```
 * recibido(mes) = Σ cuota(d) de los que pagaron y están CONFIRMADOS
 * gastado(mes)  = totalMes
 * delta(mes)    = recibido − gastado
 * saldo(mes)    = saldo(mes-1) + delta(mes)
 * ```
 *
 * **Solo cuentan los pagos confirmados.** Un pago avisado por el vecino pero no
 * verificado contra el banco no suma al saldo.
 */

import { DPTOS, SALDO_BASE } from './constantes'
import { mesCorto } from './mes'
import { round2 } from './redondeo'
import type { FilaSaldo, MesId, PagosMes, ResultadoMes } from './tipos'

/** Un mes con su cálculo y sus pagos, que es lo que la serie necesita. */
export interface MesConPagos {
  readonly mesId: MesId
  readonly resultado: ResultadoMes | null
  readonly pagos: PagosMes
}

interface Delta {
  recibido: number
  gastado: number
  delta: number
}

function deltaDe(m: MesConPagos): Delta {
  const c = m.resultado
  if (!c || !c.valido) return { recibido: 0, gastado: 0, delta: 0 }
  const recibido = round2(
    DPTOS.reduce((s, d) => {
      const p = m.pagos[d.id]
      return s + (p && p.estado === 'confirmado' ? c.cuotas[d.id].total : 0)
    }, 0),
  )
  return { recibido, gastado: c.totalMes, delta: round2(recibido - c.totalMes) }
}

/**
 * Serie del saldo mes a mes, **acumulando hacia adelante** desde el saldo
 * inicial real de la cuenta.
 *
 * Es lo que usa la aplicación. El prototipo derivaba el saldo inicial hacia
 * atrás para que el último mes cerrara en `SALDO_BASE`; eso era una muleta para
 * no tener backend, y no se copia (ver `serieSaldoDerivada`).
 *
 * @param meses        En orden cronológico ascendente.
 * @param saldoInicial El saldo real de la cuenta **antes** del primer mes de la lista.
 */
export function serieSaldo(meses: readonly MesConPagos[], saldoInicial: number): FilaSaldo[] {
  let saldo = round2(saldoInicial)
  return meses.map((m) => {
    const d = deltaDe(m)
    saldo = round2(saldo + d.delta)
    return {
      mes: m.mesId,
      corto: mesCorto(m.mesId),
      recibido: d.recibido,
      gastado: d.gastado,
      delta: d.delta,
      saldo,
    }
  })
}

/**
 * La serie tal como la deriva el prototipo: hacia atrás, para que el último mes
 * cierre en `SALDO_BASE`.
 *
 * **No la usa ninguna pantalla ni ningún endpoint.** Existe solo para poder
 * comparar la serie del motor contra la del mockup en los tests de fidelidad de
 * la Fase 1. Si aparece importada fuera de un test, es un bug.
 */
export function serieSaldoDerivada(
  meses: readonly MesConPagos[],
  saldoBase: number = SALDO_BASE,
): FilaSaldo[] {
  const deltas = meses.map(deltaDe)
  const totalDelta = deltas.reduce((s, x) => s + x.delta, 0)
  const inicial = round2(saldoBase - totalDelta)
  let saldo = inicial
  return meses.map((m, n) => {
    saldo = round2(saldo + deltas[n]!.delta)
    return {
      mes: m.mesId,
      corto: mesCorto(m.mesId),
      recibido: deltas[n]!.recibido,
      gastado: deltas[n]!.gastado,
      delta: deltas[n]!.delta,
      saldo,
    }
  })
}

/** La fila de un mes dentro de una serie ya calculada. */
export function saldoAl(serie: readonly FilaSaldo[], mesId: MesId): FilaSaldo | null {
  return serie.find((x) => x.mes === mesId) ?? null
}
