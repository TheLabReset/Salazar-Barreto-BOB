/**
 * Formato de lo que se lee en pantalla.
 *
 * Los montos y los consumos los formatea `lib/calculo/redondeo.ts`, que vive
 * con el motor porque `01` §9 fija la llamada exacta. Aquí van las fechas y los
 * textos derivados, que son de interfaz.
 */

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'] as const

/**
 * `'2026-06-08'` → `'8 jun'`.
 *
 * Es como lo escribe la gente en el chat del edificio, y es como lo muestra el
 * prototipo. Una fecha ISO en la pantalla de un vecino se lee como un error.
 */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  if (!anio || !mes || !dia) return '—'
  return `${dia} ${MESES_CORTOS[mes - 1]}`
}

/** Primera letra en mayúscula. Para meter un nombre de mes al principio de una frase. */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Une una lista en castellano: comas, y una sola «y» al final.
 *
 * `join(' y ')` encadenaba: *«la lectura del 202 y la lectura del 301 y la
 * lectura del 401»*. Con dos elementos se lee bien y por eso pasó desapercibido;
 * con tres o más, no. Este texto lo leen los siete en el aviso.
 */
export function enumerar(partes: readonly string[]): string {
  if (partes.length === 0) return ''
  if (partes.length === 1) return partes[0]!
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}
