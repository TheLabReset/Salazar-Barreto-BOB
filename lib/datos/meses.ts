/**
 * Listas y vistas agregadas de meses.
 *
 * La lista de meses sale de la base —los meses que tienen recibo— y no de una
 * constante. El prototipo la congelaba en `MESES` porque no tenía backend; en
 * producción el mes en curso es precisamente el que se está cerrando.
 */

import { serieSaldo, type MesConPagos } from '@/lib/calculo/saldo'
import { etiquetaMes, mesCorto } from '@/lib/calculo/mes'
import { DPTO_IDS } from '@/lib/calculo/constantes'
import type { FilaSaldo, MesId, ResultadoMes } from '@/lib/calculo/tipos'
import { aNumeroObligatorio } from './decimal'
import { entradasDeMes, pagosDe, resultadoDeMes } from './mes'
import { prisma } from './prisma'
import { calcularMes } from '@/lib/calculo/calcularMes'

export interface ResumenMes {
  mes: MesId
  etiqueta: string
  corto: string
  publicado: boolean
  /** El paso del cierre, 0..7. */
  paso: number
  totalMes: number | null
  /** Cuántos de los siete están confirmados. */
  alDia: number
  cuadra: boolean
}

/** Los meses que tienen recibo, del más antiguo al más nuevo. */
export async function mesesConDatos(): Promise<MesId[]> {
  const filas = await prisma.recibo.findMany({ select: { mes: true }, orderBy: { mes: 'asc' } })
  return filas.map((f) => f.mes as MesId)
}

/**
 * Los meses **publicados**, que son los que ve un vecino.
 *
 * El primero de la lista de recibos suele existir solo para dar la lectura
 * anterior al segundo, así que no tiene por qué estar publicado.
 */
export async function mesesPublicados(): Promise<MesId[]> {
  const filas = await prisma.cierre.findMany({
    where: { publicado: true },
    select: { mes: true },
    orderBy: { mes: 'asc' },
  })
  return filas.map((f) => f.mes as MesId)
}

/** La lista de meses con su estado, para la pantalla de Historial y la API. */
export async function listaDeMeses(): Promise<ResumenMes[]> {
  const meses = await mesesConDatos()
  const cierres = await prisma.cierre.findMany()
  const porMes = new Map(cierres.map((c) => [c.mes, c]))

  const salida: ResumenMes[] = []
  for (const mes of meses) {
    const [resultado, pagos] = await Promise.all([resultadoDeMes(mes), pagosDe(mes)])
    const cierre = porMes.get(mes)
    salida.push({
      mes,
      etiqueta: etiquetaMes(mes),
      corto: mesCorto(mes),
      publicado: cierre?.publicado ?? false,
      paso: cierre?.paso ?? 0,
      totalMes: resultado.valido ? resultado.totalMes : null,
      alDia: DPTO_IDS.filter((d) => pagos[d]?.estado === 'confirmado').length,
      cuadra: resultado.cuadra,
    })
  }
  return salida
}

/** La serie del saldo, acumulando hacia adelante desde el saldo inicial real. */
export async function serieDelSaldo(): Promise<FilaSaldo[]> {
  const config = await prisma.configuracionEdificio.findUnique({ where: { id: 1 } })
  if (!config) return []
  const meses = (await mesesConDatos()).filter((m) => m >= config.mesInicial)
  const conPagos: MesConPagos[] = []
  for (const mes of meses) {
    const [resultado, pagos] = await Promise.all([resultadoDeMes(mes), pagosDe(mes)])
    conPagos.push({ mesId: mes, resultado, pagos })
  }
  return serieSaldo(conPagos, aNumeroObligatorio(config.saldoInicial))
}

export interface Borrador {
  mes: MesId
  etiqueta: string
  paso: number
  version: number
  publicado: boolean
  notaQuePaso: string | null
  notaQueCambio: string | null
  notaQuePendiente: string | null
  /** Lo guardado, ya calculado. */
  resultado: ResultadoMes
  /**
   * Las lecturas **de este mes** que ya están guardadas.
   *
   * Van aparte del `resultado` a propósito: el paso 1 tiene que saber cuántas
   * hay aunque el mes todavía no se pueda calcular. Al principio del cierre no
   * hay recibo, así que `calcularMes` devuelve inválido por eso y ni siquiera
   * llega a mirar las lecturas: derivarlas de ahí hacía que el contador abriera
   * en "7 / 7" con el mes vacío.
   */
  lecturas: Record<string, number>
  /** Las lecturas del mes anterior, para mostrarlas al lado. */
  lecturasAnteriores: Record<string, number>
  /** Promedio histórico de consumo por departamento, para avisar de lo raro. */
  promedios: Record<string, number>
  /** Los m³ del lavado configurados y si está activo este mes. */
  lavado: { m3: number; activo: boolean; dpto: string; concepto: string } | null
}

/** Todo lo que el cierre del mes necesita para pintarse. */
export async function borradorDeMes(mes: MesId): Promise<Borrador> {
  const cierre = await prisma.cierre.findUnique({ where: { mes } })
  const entradas = await entradasDeMes(mes)
  const resultado = calcularMes(entradas)

  const reasignacion = await prisma.reasignacionAgua.findFirst({
    where: { desde: { lte: mes } },
    include: { activaEn: true },
  })

  return {
    mes,
    etiqueta: etiquetaMes(mes),
    paso: cierre?.paso ?? 0,
    version: cierre?.version ?? 0,
    publicado: cierre?.publicado ?? false,
    notaQuePaso: cierre?.notaQuePaso ?? null,
    notaQueCambio: cierre?.notaQueCambio ?? null,
    notaQuePendiente: cierre?.notaQuePendiente ?? null,
    resultado,
    lecturas: entradas.lecturas as Record<string, number>,
    lecturasAnteriores: entradas.lecturasAnteriores as Record<string, number>,
    promedios: await promediosDeConsumo(mes),
    lavado: reasignacion
      ? {
          m3: aNumeroObligatorio(reasignacion.m3),
          activo: entradas.lavadoM3 > 0,
          dpto: reasignacion.dptoId,
          concepto: reasignacion.concepto,
        }
      : null,
  }
}

/**
 * Promedio de consumo de cada departamento en los meses anteriores.
 *
 * Lo usa el paso 1 para pintar en ámbar una lectura que se sale de lo normal, y
 * `proponerCorreccion` para descartar candidatas absurdas.
 */
export async function promediosDeConsumo(hasta: MesId): Promise<Record<string, number>> {
  const meses = (await mesesConDatos()).filter((m) => m < hasta)
  const suma: Record<string, number> = {}
  const cuenta: Record<string, number> = {}
  for (const mes of meses) {
    const r = await resultadoDeMes(mes)
    if (!r.valido) continue
    for (const d of DPTO_IDS) {
      suma[d] = (suma[d] ?? 0) + r.consumos[d]
      cuenta[d] = (cuenta[d] ?? 0) + 1
    }
  }
  const salida: Record<string, number> = {}
  for (const d of DPTO_IDS) salida[d] = cuenta[d] ? suma[d]! / cuenta[d]! : 0
  return salida
}
