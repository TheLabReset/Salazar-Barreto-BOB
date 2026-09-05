/**
 * Corrección de errores de tecleo en las lecturas. `01-reglas-de-negocio.md` §8.
 *
 * Genera las variantes del número tecleado a distancia 1 —transposiciones de
 * dígitos adyacentes y sustituciones de un dígito— y descarta las que no
 * cumplen las tres condiciones. **Solo propone si queda exactamente una
 * candidata válida.** Con dos o más se calla: proponer la equivocada es peor
 * que no proponer.
 *
 * Nunca corrige sola. Quien decide es el administrador, con dos botones.
 */

import { round2 } from './redondeo'
import type { Correccion } from './tipos'

/**
 * @param valorTecleado La lectura que se escribió, con sus 3 decimales.
 * @param anterior      La lectura del mes pasado del mismo medidor.
 * @param promedio      Promedio histórico de consumo de ese departamento.
 * @param objetivoM3    m³ que facturó SEDAPAL este mes.
 * @param otrosM3       Suma de los consumos de los otros seis medidores.
 * @returns La única candidata válida, o `null` si hay cero o más de una.
 */
export function proponerCorreccion(
  valorTecleado: number | string,
  anterior: number,
  promedio: number,
  objetivoM3: number,
  otrosM3: number,
): Correccion | null {
  /**
   * La forma de cadena tiene que tener **exactamente tres decimales**, que es
   * como viene una lectura del medidor.
   *
   * `String(438.03)` da `"438.03"` y al quitarle el punto quedan cinco dígitos:
   * el algoritmo mete el punto tres antes del final y sale `43.803`, diez veces
   * menos. Un `Number` de JS no conserva ceros a la derecha, así que una de cada
   * diez lecturas reales (`174.700`) llegaba deformada y la corrección quedaba
   * muerta sin que nada avisara.
   */
  const s = (typeof valorTecleado === 'number' ? valorTecleado.toFixed(3) : String(valorTecleado))
    .replace('.', '')
  const candidatas = new Set<string>()

  // Transposiciones de dígitos adyacentes
  for (let i = 0; i < s.length - 1; i++) {
    const a = s.split('')
    ;[a[i], a[i + 1]] = [a[i + 1]!, a[i]!]
    candidatas.add(a.join(''))
  }
  // Sustituciones de un dígito
  for (let i = 0; i < s.length; i++) {
    for (let d = 0; d <= 9; d++) {
      const a = s.split('')
      a[i] = String(d)
      candidatas.add(a.join(''))
    }
  }

  const validas: Correccion[] = []
  for (const c of candidatas) {
    // Se reconstruye el número metiendo el punto tres dígitos antes del final.
    // No es aritmética sobre cadenas: es cómo el original vuelve de la variante
    // de dígitos al valor decimal. `Number` de una cadena decimal no pierde
    // precisión más allá de lo que ya pierde el literal.
    const v = Number(c.slice(0, -3) + '.' + c.slice(-3))
    // El medidor no retrocede.
    if (!(v > anterior)) continue
    const cons = v - anterior
    // El consumo tiene que estar entre 0.2× y 2× el promedio del departamento.
    if (cons > promedio * 2 || cons < promedio * 0.2) continue
    // Y la suma con los otros medidores no puede pasarse de lo facturado
    // ni quedar a más de un 8% por debajo.
    const dif = objetivoM3 - (otrosM3 + cons)
    if (dif < 0 || dif > objetivoM3 * 0.08) continue
    validas.push({ valor: v, consumo: round2(cons) })
  }

  return validas.length === 1 ? validas[0]! : null
}
