/**
 * El tercer cuadre: **el de sanidad**.
 *
 * Los dos cuadres de `01-reglas-de-negocio.md` §5 son identidades algebraicas.
 * Comprueban que las partes suman el todo, y eso lo cumplen igual de bien unas
 * cifras absurdas: un medidor que retrocedió porque lo cambiaron produce un
 * consumo de −174.20 m³, una cuota de **S/ −375.05**, y los dos cuadres dan
 * verdadero, porque el área común absorbe el error y la identidad se mantiene.
 * Un descuento mayor que el monto de la factura da un precio del m³ negativo, y
 * también cuadra.
 *
 * Este módulo comprueba lo otro: que ninguna cifra sea imposible por
 * construcción. Es barato y atrapa la familia entera.
 *
 * **No cambia ningún cálculo.** Solo decide si el resultado se puede publicar.
 */

import { DPTOS } from './constantes'
import type { EntradasMes, Extra, GastoFijo, Overrides, PorDpto, CuotaDpto } from './tipos'

/** Un número que existe de verdad: ni `NaN`, ni `Infinity`, ni `-Infinity`. */
export function esFinito(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

/**
 * Suma los montos de una lista de líneas de gasto.
 *
 * Existe como función aparte, y exportada, para poder probarla sola. La versión
 * anterior estaba en línea con un `|| 0`, y con un monto que llegara como
 * cadena la suma **concatenaba**: `3317.98 + "1200"` da `"3317.981200"`, que
 * `round2` truncaba de vuelta a `3317.98`. El gasto salía pintado en la lista
 * por S/ 1 200.00, desaparecía del total, y los dos cuadres daban verde.
 *
 * `null` es "por confirmar" y suma 0, que es lo que dice `01` §4.1. Cualquier
 * otra cosa que no sea un número finito suma 0 **y la detecta**
 * `revisarResultado`, que vuelve a sumar y compara.
 */
export function sumarMontos(lineas: readonly { monto: number | null }[]): number {
  let total = 0
  for (const l of lineas) if (esFinito(l.monto)) total += l.monto
  return Math.round(total * 100) / 100
}

/** Un monto guardado: o una cifra de verdad, o `null` = por confirmar. */
function montoValido(m: unknown): boolean {
  return m === null || m === undefined || esFinito(m)
}

/**
 * Problemas de las **entradas**, antes de calcular nada.
 *
 * Devuelve el motivo, o `null` si están bien. Son cosas que no deberían llegar
 * nunca —Zod las corta en el borde de la API— pero el motor también corre en el
 * navegador con lo que el administrador teclea.
 */
export function revisarEntradas(entradas: EntradasMes, ov: Overrides): string | null {
  const ids = new Set<string>(DPTOS.map((d) => d.id))

  for (const g of entradas.fijos as readonly GastoFijo[]) {
    if (!montoValido(g.monto)) return `El gasto "${g.concepto}" tiene un monto que no es un número.`
  }
  for (const [concepto, monto] of Object.entries(ov.fijos ?? {})) {
    if (!montoValido(monto)) return `El gasto "${concepto}" tiene un monto que no es un número.`
  }

  const extras = (ov.extras ?? entradas.extras ?? []) as readonly Extra[]
  for (const e of extras) {
    if (!esFinito(e.monto)) {
      return `El ${e.tipo === 'credito' ? 'crédito' : 'gasto'} "${e.concepto ?? ''}" tiene un monto que no es un número.`
    }
    if (e.tipo === 'credito' && !ids.has(e.dpto)) {
      // Sin esto el crédito se evapora: no se le resta a nadie, no entra en
      // `totalCreditos`, y el mes cuadra igual. El vecino nunca ve su devolución.
      return `Hay un crédito para el departamento ${String(e.dpto)}, que no existe.`
    }
  }

  const rec = { ...entradas.recibo, ...ov.recibo }
  for (const [campo, valor] of Object.entries(rec)) {
    if (valor === null || valor === undefined) continue
    if (!esFinito(valor)) return `El campo "${campo}" del recibo no es un número.`
  }

  for (const fuente of [entradas.lecturas, entradas.lecturasAnteriores, ov.lecturas ?? {}]) {
    for (const [dpto, valor] of Object.entries(fuente)) {
      if (valor === null || valor === undefined) continue
      if (!esFinito(valor)) return `La lectura del ${dpto} no es un número.`
      if (valor < 0) return `La lectura del ${dpto} es negativa.`
    }
  }

  if (ov.lavadoM3 !== undefined && !esFinito(ov.lavadoM3)) {
    return 'Los m³ del lavado no son un número.'
  }

  return null
}

/** Lo que el tercer cuadre revisa del resultado ya calculado. */
export interface RevisionSanidad {
  /** `true` si no hay ninguna cifra imposible. */
  cuadra: boolean
  /** Qué está mal, en el idioma del vecino. Vacío si cuadra. */
  motivos: string[]
}

/**
 * Problemas del **resultado**: cifras que no pueden existir.
 *
 * - Un consumo negativo (el medidor no retrocede; si lo hizo, lo cambiaron).
 * - Un precio del m³ negativo o no finito.
 * - Un área común negativa.
 * - Un factor de ajuste mayor que 1: nadie puede pagar más de lo que midió.
 * - Cualquier `NaN` o `Infinity` en cualquier cifra.
 * - Un total del mes que no coincide con la suma explícita de sus líneas.
 */
export function revisarResultado(r: {
  consumos: PorDpto<number>
  cuotas: PorDpto<CuotaDpto>
  precioM3: number
  facturaAgua: number
  comunReal: number
  montoComun: number
  factor: number
  totalMes: number
  gastos: readonly { concepto: string; monto: number | null }[]
}): RevisionSanidad {
  const motivos: string[] = []

  for (const d of DPTOS) {
    const consumo = r.consumos[d.id]
    if (!esFinito(consumo)) motivos.push(`El consumo del ${d.id} no es un número.`)
    else if (consumo < 0) {
      motivos.push(
        `El medidor del ${d.id} marca menos que el mes pasado. Si lo cambiaron, hay que anotar la lectura de arranque.`,
      )
    }
    const q = r.cuotas[d.id]
    for (const [campo, valor] of Object.entries(q)) {
      if (!esFinito(valor)) motivos.push(`La cuota del ${d.id} tiene un valor imposible en "${campo}".`)
    }
    if (esFinito(q.agua) && q.agua < 0) motivos.push(`El ${d.id} tendría un agua negativa.`)
    if (esFinito(q.m3) && q.m3 < 0) motivos.push(`Al ${d.id} se le cobrarían m³ negativos.`)
  }

  if (!esFinito(r.precioM3) || r.precioM3 < 0) {
    motivos.push('El precio del m³ sale negativo o imposible. Revisa el monto y el descuento del recibo.')
  }
  if (!esFinito(r.facturaAgua) || r.facturaAgua < 0) {
    motivos.push('La factura de agua sale negativa. Revisa el descuento: no puede ser mayor que el monto.')
  }
  if (!esFinito(r.comunReal) || r.comunReal < 0) motivos.push('El área común sale negativa.')
  if (!esFinito(r.montoComun) || r.montoComun < 0) motivos.push('Lo que cuesta el área común sale negativo.')
  if (!esFinito(r.factor) || r.factor > 1) {
    motivos.push('El ajuste del reparto es imposible: no se puede cobrar más de lo que llegó en el recibo.')
  }

  // Recalcular el total con una suma explícita: si `totalMes` se apartó de sus
  // propias líneas, alguna se perdió por el camino.
  for (const g of r.gastos) {
    if (g.monto !== null && !esFinito(g.monto)) {
      motivos.push(`La línea "${g.concepto}" tiene un monto que no es un número.`)
    }
  }
  const sumaLineas = sumarMontos(r.gastos)
  if (!esFinito(r.totalMes) || Math.abs(sumaLineas - r.totalMes) > 0.005) {
    motivos.push('El total del mes no coincide con la suma de sus líneas.')
  }

  return { cuadra: motivos.length === 0, motivos }
}
