/** Aritmética de identificadores de mes. Un mes es `'AAAA-MM'`. */

import type { MesId } from './tipos'

const PATRON_MES = /^\d{4}-(0[1-9]|1[0-2])$/

/** `true` si la cadena tiene la forma `'2026-07'` con un mes real. */
export function esMesId(valor: unknown): valor is MesId {
  return typeof valor === 'string' && PATRON_MES.test(valor)
}

/** El mes anterior. `'2026-01'` → `'2025-12'`. */
export function mesAnterior(id: MesId): MesId {
  // `as`: `MesId` garantiza la forma 'AAAA-MM', así que el split da dos números.
  const [anio, mes] = id.split('-').map(Number) as [number, number]
  return mes === 1
    ? (`${anio - 1}-12` as MesId)
    : (`${anio}-${String(mes - 1).padStart(2, '0')}` as MesId)
}

/** El mes siguiente. `'2026-12'` → `'2027-01'`. */
export function mesSiguiente(id: MesId): MesId {
  // `as`: ídem, la forma de `MesId` está validada por `esMesId`.
  const [anio, mes] = id.split('-').map(Number) as [number, number]
  return mes === 12
    ? (`${anio + 1}-01` as MesId)
    : (`${anio}-${String(mes + 1).padStart(2, '0')}` as MesId)
}

const NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const

const CORTOS = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC',
] as const

/** `'2026-07'` → `'Julio 2026'`. */
export function etiquetaMes(id: MesId): string {
  // `as`: ídem.
  const [anio, mes] = id.split('-').map(Number) as [number, number]
  return `${NOMBRES[mes - 1]} ${anio}`
}

/** `'2026-07'` → `'julio'`. En minúscula, como aparece dentro de una frase. */
export function nombreMes(id: MesId): string {
  const mes = Number(id.split('-')[1])
  return NOMBRES[mes - 1]!.toLowerCase()
}

/** `'2026-07'` → `'JUL'`. */
export function mesCorto(id: MesId): string {
  const mes = Number(id.split('-')[1])
  return CORTOS[mes - 1]!
}
