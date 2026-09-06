/**
 * Reparto de un monto entre varios departamentos, **cuadrando al céntimo**.
 *
 * Un gasto extraordinario no siempre se reparte por flat. El Excel real tiene
 * tres formas:
 *
 *   - **por flat** (lo de siempre): cada uno paga su porcentaje de metraje.
 *   - **en partes iguales**: la «cuota bomba de agua» de julio 2026, S/ 182.90
 *     a cada uno de los siete.
 *   - **entre un subconjunto**: el «mantenimiento del portón» de agosto 2026,
 *     S/ 300 entre seis (sin el 101, que pagó su puerta aparte).
 *
 * Todo dinero se reparte en **céntimos enteros** y el sobrante —los céntimos que
 * no dividen exacto— va a los de mayor residuo. Así la suma de las partes es
 * **idéntica** al monto, sin un céntimo perdido que rompa el cuadre del mes.
 */
import type { DptoId } from './tipos'

/** Reparte `monto` (en soles) en partes iguales entre `entre`. */
export function repartirIgual(monto: number, entre: readonly DptoId[]): Record<DptoId, number> {
  return repartir(monto, entre, () => 1)
}

/**
 * Reparte `monto` proporcional a un peso por departamento (su flat, típicamente),
 * pero solo entre los de `entre`. Con `entre` = los siete y el peso = el flat,
 * da lo mismo que el reparto por flat de siempre.
 */
export function repartirPorPeso(
  monto: number,
  entre: readonly DptoId[],
  pesoDe: (d: DptoId) => number,
): Record<DptoId, number> {
  return repartir(monto, entre, pesoDe)
}

/**
 * El reparto de residuo mayor (método de Hamilton), en céntimos enteros.
 *
 * Se calcula la parte exacta de cada uno, se le da a todos su parte **entera**
 * de céntimos, y los céntimos que sobran se reparten de uno en uno empezando por
 * el de mayor parte fraccionaria. Es determinista: ante un empate de residuos,
 * el orden estable de `entre` decide, así el mismo mes da siempre el mismo
 * reparto.
 */
function repartir(
  monto: number,
  entre: readonly DptoId[],
  pesoDe: (d: DptoId) => number,
): Record<DptoId, number> {
  const salida = {} as Record<DptoId, number>
  const totalCent = Math.round(monto * 100)
  const items = entre.map((d) => ({ d, peso: pesoDe(d) }))
  const sumaPesos = items.reduce((a, it) => a + it.peso, 0)
  if (items.length === 0 || sumaPesos <= 0) return salida

  const conParte = items.map((it) => {
    const exacto = (totalCent * it.peso) / sumaPesos
    const piso = Math.floor(exacto)
    return { d: it.d, piso, residuo: exacto - piso }
  })
  const repartidos = conParte.reduce((a, c) => a + c.piso, 0)
  let sobran = totalCent - repartidos // céntimos que faltan por colocar

  // Los de mayor residuo reciben un céntimo, de uno en uno, hasta agotar.
  const conCentimoExtra = new Set<DptoId>()
  for (const c of [...conParte].sort((a, b) => b.residuo - a.residuo)) {
    if (sobran <= 0) break
    conCentimoExtra.add(c.d)
    sobran--
  }

  for (const c of conParte) {
    salida[c.d] = (c.piso + (conCentimoExtra.has(c.d) ? 1 : 0)) / 100
  }
  return salida
}
