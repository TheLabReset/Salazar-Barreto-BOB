/**
 * Leer de la base todo lo que el motor necesita para calcular un mes.
 *
 * Este módulo es el único que sabe a la vez de Prisma y del motor. Todo lo de
 * arriba —rutas, servicios, pantallas— consume `ResultadoMes`, que es puro.
 */

import { calcularMes } from '@/lib/calculo/calcularMes'
import { mesAnterior } from '@/lib/calculo/mes'
import type {
  DptoId,
  EntradasMes,
  Extra,
  GastoFijo,
  Lecturas,
  MesId,
  Overrides,
  PagosMes,
  Recibo,
  ResultadoMes,
} from '@/lib/calculo/tipos'
import { aNumero, aNumeroObligatorio } from './decimal'
import { prisma } from './prisma'

/** Las lecturas de un mes, por departamento. */
export async function lecturasDe(mes: MesId): Promise<Lecturas> {
  const filas = await prisma.lectura.findMany({ where: { mes } })
  const salida: Lecturas = {}
  for (const f of filas) salida[f.dptoId as DptoId] = aNumeroObligatorio(f.valor)
  return salida
}

/** El recibo de un mes, o `null` si todavía no se registró. */
export async function reciboDe(mes: MesId): Promise<Recibo | null> {
  const r = await prisma.recibo.findUnique({ where: { mes } })
  if (!r) return null
  return {
    aguaM3: r.aguaM3,
    aguaMonto: aNumeroObligatorio(r.aguaMonto),
    luz: aNumeroObligatorio(r.luz),
    descuento: aNumero(r.descuento),
  }
}

/**
 * Los gastos fijos vigentes en un mes.
 *
 * Un cambio de monto no reescribe el pasado: para cada concepto se toma la fila
 * con el `vigenteDesde` más alto que no pase del mes pedido.
 */
export async function fijosVigentesEn(mes: MesId): Promise<GastoFijo[]> {
  const filas = await prisma.gastoFijo.findMany({
    where: { vigenteDesde: { lte: mes } },
    orderBy: [{ orden: 'asc' }, { vigenteDesde: 'asc' }],
  })
  const porConcepto = new Map<string, (typeof filas)[number]>()
  for (const f of filas) porConcepto.set(f.concepto, f) // la última gana: es la más reciente
  return [...porConcepto.values()]
    .sort((a, b) => a.orden - b.orden || a.concepto.localeCompare(b.concepto))
    .map((f) => ({
      concepto: f.concepto,
      monto: aNumero(f.monto),
      ...(f.anual ? { anual: true } : {}),
      ...(f.monto === null ? { porConfirmar: true } : {}),
    }))
}

/** Los gastos extraordinarios y créditos de un mes. */
export async function extrasDe(mes: MesId): Promise<Extra[]> {
  const filas = await prisma.gastoExtra.findMany({ where: { mes }, orderBy: { creadoEn: 'asc' } })
  return filas.map((f): Extra =>
    f.tipo === 'credito'
      ? { tipo: 'credito', concepto: f.concepto, monto: aNumeroObligatorio(f.monto), dpto: f.dptoId as DptoId }
      : { tipo: 'gasto', concepto: f.concepto, monto: aNumeroObligatorio(f.monto) },
  )
}

/**
 * Los m³ del lavado que aplican a un mes.
 *
 * 0 si la casilla del paso 5 está desmarcada para ese mes. Si no hay marca
 * explícita, se hereda: viene marcada si estuvo activa el mes anterior.
 */
export async function lavadoM3En(mes: MesId): Promise<number> {
  const reasignacion = await prisma.reasignacionAgua.findFirst({
    where: { desde: { lte: mes } },
    include: { activaEn: true },
  })
  if (!reasignacion) return 0
  const marcaDelMes = reasignacion.activaEn.find((a) => a.mes === mes)
  if (marcaDelMes) return marcaDelMes.activa ? aNumeroObligatorio(reasignacion.m3) : 0
  // Sin marca explícita: se hereda la del mes anterior, y si tampoco la hay,
  // se asume activa desde la fecha en que empieza a aplicar.
  const anterior = reasignacion.activaEn.find((a) => a.mes === mesAnterior(mes))
  if (anterior) return anterior.activa ? aNumeroObligatorio(reasignacion.m3) : 0
  return aNumeroObligatorio(reasignacion.m3)
}

/** Los pagos de un mes, por departamento. */
export async function pagosDe(mes: MesId): Promise<PagosMes> {
  const filas = await prisma.pago.findMany({ where: { mes } })
  const salida: PagosMes = {}
  for (const f of filas) {
    salida[f.dptoId as DptoId] = {
      estado: f.estado,
      fecha: f.fecha.toISOString().slice(0, 10),
      op: f.operacion,
      texto: f.texto,
    }
  }
  return salida
}

/** Todo lo que el motor necesita de un mes, leído de la base. */
export async function entradasDeMes(mes: MesId): Promise<EntradasMes> {
  const [recibo, lecturas, lecturasAnteriores, fijos, extras, lavadoM3] = await Promise.all([
    reciboDe(mes),
    lecturasDe(mes),
    lecturasDe(mesAnterior(mes)),
    fijosVigentesEn(mes),
    extrasDe(mes),
    lavadoM3En(mes),
  ])
  return { mesId: mes, recibo, lecturas, lecturasAnteriores, fijos, extras, lavadoM3 }
}

/** El mes ya calculado. Es lo que consumen las pantallas y la API. */
export async function resultadoDeMes(mes: MesId, ov: Overrides = {}): Promise<ResultadoMes> {
  return calcularMes(await entradasDeMes(mes), ov)
}
