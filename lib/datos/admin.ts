/**
 * Lo que el panel de administración necesita para pintarse.
 *
 * Reúne en una consulta lo que la persona que administra tiene que ver al
 * entrar: qué pagos faltan verificar, quién no ha avisado, y en qué mes va el
 * cierre.
 */

import { DPTOS } from '@/lib/calculo/constantes'
import { etiquetaMes, mesSiguiente, nombreMes } from '@/lib/calculo/mes'
import type { DptoId, MesId, PagosMes } from '@/lib/calculo/tipos'
import { aNumeroObligatorio } from './decimal'
import { pagosDe, resultadoDeMes } from './mes'
import { mesesConDatos, mesesPublicados } from './meses'
import { prisma } from './prisma'

export interface FilaPago {
  dpto: DptoId
  nombre: string
  cuota: number | null
  estado: 'confirmado' | 'aviso' | null
  fecha: string | null
  operacion: string | null
  texto: string | null
}

export interface DatosAdmin {
  /** El último mes publicado: es el de los pagos que hay que verificar. */
  mesPublicado: MesId | null
  etiquetaPublicado: string
  /** El mes que toca cerrar. */
  mesACerrar: MesId
  etiquetaACerrar: string
  nombreACerrar: string
  /** En qué paso se quedó el cierre. */
  paso: number
  pagos: FilaPago[]
  gastosFijos: { concepto: string; monto: number | null; anual: boolean }[]
  lavado: { dpto: string; concepto: string; m3: number; desde: string } | null
  anios: number[]
}

export async function panelDeAdmin(): Promise<DatosAdmin> {
  const [publicados, conDatos] = await Promise.all([mesesPublicados(), mesesConDatos()])
  const mesPublicado = (publicados[publicados.length - 1] ?? null) as MesId | null

  // El mes a cerrar es el primero con datos **posterior** al último publicado.
  // Si no hay ninguno, el siguiente del calendario: el administrador va a
  // teclear sus lecturas desde cero.
  //
  // El "posterior" no es un detalle: el mes base de la semilla —diciembre de
  // 2025— tiene recibo y no se publica nunca, porque existe solo para darle a
  // enero su lectura anterior. Sin esa condición, el cierre se abría sobre él.
  const siguiente = mesPublicado ? mesSiguiente(mesPublicado) : (conDatos[0] ?? '2026-01')
  const mesACerrar = (conDatos.find((m) => m > (mesPublicado ?? '')) ?? siguiente) as MesId

  const [cierre, resultado, pagosMes, fijos, reasignacion] = await Promise.all([
    prisma.cierre.findUnique({ where: { mes: mesACerrar } }),
    mesPublicado ? resultadoDeMes(mesPublicado) : Promise.resolve(null),
    mesPublicado ? pagosDe(mesPublicado) : Promise.resolve({} as PagosMes),
    prisma.gastoFijo.findMany({
      where: { vigenteDesde: { lte: mesACerrar } },
      orderBy: [{ orden: 'asc' }, { vigenteDesde: 'asc' }],
    }),
    prisma.reasignacionAgua.findFirst(),
  ])

  const porConcepto = new Map<string, (typeof fijos)[number]>()
  for (const f of fijos) porConcepto.set(f.concepto, f)

  return {
    mesPublicado,
    etiquetaPublicado: mesPublicado ? etiquetaMes(mesPublicado) : '',
    mesACerrar,
    etiquetaACerrar: etiquetaMes(mesACerrar),
    nombreACerrar: nombreMes(mesACerrar),
    paso: cierre?.paso ?? 0,
    pagos: DPTOS.map((d) => {
      const p = pagosMes[d.id] ?? null
      return {
        dpto: d.id,
        nombre: d.nombre,
        cuota: resultado?.valido ? resultado.cuotas[d.id].total : null,
        estado: p?.estado ?? null,
        fecha: p?.fecha ?? null,
        operacion: p?.op ?? null,
        texto: p?.texto ?? null,
      }
    }),
    gastosFijos: [...porConcepto.values()]
      .sort((a, b) => a.orden - b.orden)
      .map((f) => ({
        concepto: f.concepto,
        monto: f.monto === null ? null : aNumeroObligatorio(f.monto),
        anual: f.anual,
      })),
    lavado: reasignacion
      ? {
          dpto: reasignacion.dptoId,
          concepto: reasignacion.concepto,
          m3: aNumeroObligatorio(reasignacion.m3),
          desde: reasignacion.desde,
        }
      : null,
    anios: [...new Set(conDatos.map((m) => Number(m.split('-')[0])))].sort(),
  }
}
