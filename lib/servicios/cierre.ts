/**
 * Las escrituras del cierre del mes.
 *
 * Todas siguen el mismo patrón, en una sola transacción:
 *
 *   1. leer el estado anterior
 *   2. comprobar la versión (bloqueo optimista)
 *   3. escribir el cambio
 *   4. escribir el rastro en `Auditoria`
 *   5. avisar a los siete **solo si el mes ya estaba publicado**
 */

import { prisma } from '@/lib/datos/prisma'
import { aDecimal2, aDecimal3, aNumero, aNumeroObligatorio } from '@/lib/datos/decimal'
import { entradasDeMes, resultadoDeMes } from '@/lib/datos/mes'
import { calcularMes } from '@/lib/calculo/calcularMes'
import { nombreMes } from '@/lib/calculo/mes'
import { fmt } from '@/lib/calculo/redondeo'
import { DPTO_IDS } from '@/lib/calculo/constantes'
import type { DptoId, MesId, ResultadoMes } from '@/lib/calculo/tipos'
import type { GuardarGastos, GuardarLecturas, GuardarRecibo, Publicar } from '@/lib/esquemas'
import { auditar, avisarSiPublicado, type Tx } from './auditoria'
import { cierreDe, exigirNoPublicado, tomarVersion } from './bloqueo'
import { conflicto, peticionMala } from './errores'

const ADMIN = 'admin'

/** Guardar lecturas del mes. Parcial: se guardan las que vengan. */
export async function guardarLecturas(mes: MesId, datos: GuardarLecturas) {
  return prisma.$transaction(async (tx) => {
    await exigirNoPublicado(tx, mes)
    const version = await tomarVersion(tx, mes, datos.version)

    for (const [dpto, valor] of Object.entries(datos.lecturas)) {
      if (valor === undefined) continue
      const anterior = await tx.lectura.findUnique({ where: { mes_dptoId: { mes, dptoId: dpto } } })
      await tx.lectura.upsert({
        where: { mes_dptoId: { mes, dptoId: dpto } },
        create: { mes, dptoId: dpto, valor: aDecimal3(valor), registradoPor: ADMIN },
        update: { valor: aDecimal3(valor) },
      })
      await auditar(tx, {
        usuario: ADMIN,
        accion: anterior ? 'editar' : 'crear',
        entidad: 'lectura',
        entidadId: `${mes}/${dpto}`,
        campo: 'valor',
        valorAnterior: anterior ? aNumeroObligatorio(anterior.valor) : null,
        valorNuevo: valor,
        mes,
      })
      // Nada de avisos: el mes está en curso. Ver `auditoria.ts`.
    }
    return { version }
  })
}

/** Guardar el recibo. Parcial. `descuento: null` lo borra. */
export async function guardarRecibo(mes: MesId, datos: GuardarRecibo) {
  return prisma.$transaction(async (tx) => {
    await exigirNoPublicado(tx, mes)
    const version = await tomarVersion(tx, mes, datos.version)
    const anterior = await tx.recibo.findUnique({ where: { mes } })

    const nuevo = {
      aguaM3: datos.aguaM3 ?? anterior?.aguaM3 ?? 0,
      aguaMonto: datos.aguaMonto ?? (anterior ? aNumeroObligatorio(anterior.aguaMonto) : 0),
      luz: datos.luz ?? (anterior ? aNumeroObligatorio(anterior.luz) : 0),
      // `undefined` no toca; `null` borra. Es la semántica de `01` §11.
      descuento:
        datos.descuento !== undefined ? datos.descuento : anterior ? aNumero(anterior.descuento) : null,
    }
    if (nuevo.descuento !== null && nuevo.descuento > nuevo.aguaMonto) {
      throw peticionMala(
        'El descuento no puede ser mayor que el monto de la factura: saldría un precio del m³ negativo.',
      )
    }

    await tx.recibo.upsert({
      where: { mes },
      create: {
        mes,
        aguaM3: nuevo.aguaM3,
        aguaMonto: aDecimal2(nuevo.aguaMonto),
        luz: aDecimal2(nuevo.luz),
        descuento: nuevo.descuento === null ? null : aDecimal2(nuevo.descuento),
        registradoPor: ADMIN,
      },
      update: {
        aguaM3: nuevo.aguaM3,
        aguaMonto: aDecimal2(nuevo.aguaMonto),
        luz: aDecimal2(nuevo.luz),
        descuento: nuevo.descuento === null ? null : aDecimal2(nuevo.descuento),
      },
    })

    const antes = {
      aguaM3: anterior?.aguaM3 ?? null,
      aguaMonto: anterior ? aNumeroObligatorio(anterior.aguaMonto) : null,
      luz: anterior ? aNumeroObligatorio(anterior.luz) : null,
      descuento: anterior ? aNumero(anterior.descuento) : null,
    }
    for (const campo of ['aguaM3', 'aguaMonto', 'luz', 'descuento'] as const) {
      if (antes[campo] === nuevo[campo]) continue
      await auditar(tx, {
        usuario: ADMIN,
        accion: anterior ? 'editar' : 'crear',
        entidad: 'recibo',
        entidadId: mes,
        campo,
        valorAnterior: antes[campo],
        valorNuevo: nuevo[campo],
        mes,
      })
    }
    return { version }
  })
}

/** Guardar los gastos puntuales del mes. Reemplaza la lista entera. */
export async function guardarGastos(mes: MesId, datos: GuardarGastos) {
  return prisma.$transaction(async (tx) => {
    await exigirNoPublicado(tx, mes)
    const version = await tomarVersion(tx, mes, datos.version)

    const anteriores = await tx.gastoExtra.findMany({ where: { mes } })
    await tx.gastoExtra.deleteMany({ where: { mes } })
    for (const e of datos.extras) {
      await tx.gastoExtra.create({
        data: {
          mes,
          tipo: e.tipo,
          concepto: e.concepto,
          monto: aDecimal2(e.monto),
          dptoId: e.tipo === 'credito' ? e.dpto : null,
        },
      })
    }
    const resumen = (lista: { tipo: string; concepto: string; monto: unknown; dptoId?: string | null }[]) =>
      lista.map((e) => `${e.tipo} ${e.concepto} ${String(e.monto)}${e.dptoId ? ` → ${e.dptoId}` : ''}`).join(' · ')
    await auditar(tx, {
      usuario: ADMIN,
      accion: 'editar',
      entidad: 'gastoExtra',
      entidadId: mes,
      campo: 'lista',
      valorAnterior: resumen(anteriores),
      valorNuevo: resumen(datos.extras.map((e) => ({ ...e, dptoId: e.tipo === 'credito' ? e.dpto : null }))),
      mes,
    })
    return { version }
  })
}

/**
 * La casilla del lavado del paso 5.
 *
 * Desmarcarla pone `lavadoM3 = 0`: todo el área común vuelve a repartirse entre
 * los siete y el 401 solo paga su medidor. **El total del mes no cambia.**
 */
export async function guardarReasignacion(mes: MesId, activa: boolean, version?: number) {
  return prisma.$transaction(async (tx) => {
    await exigirNoPublicado(tx, mes)
    const nuevaVersion = await tomarVersion(tx, mes, version)

    const reasignacion = await tx.reasignacionAgua.findFirst({ where: { desde: { lte: mes } } })
    if (!reasignacion) throw peticionMala('No hay ninguna reasignación de agua configurada.')

    const anterior = await tx.reasignacionActivaEnMes.findUnique({
      where: { reasignacionId_mes: { reasignacionId: reasignacion.id, mes } },
    })
    await tx.reasignacionActivaEnMes.upsert({
      where: { reasignacionId_mes: { reasignacionId: reasignacion.id, mes } },
      create: { reasignacionId: reasignacion.id, mes, activa },
      update: { activa },
    })
    await auditar(tx, {
      usuario: ADMIN,
      accion: 'editar',
      entidad: 'reasignacionAgua',
      entidadId: `${reasignacion.dptoId}/${mes}`,
      campo: 'activa',
      valorAnterior: anterior ? String(anterior.activa) : null,
      valorNuevo: String(activa),
      mes,
    })
    await avisarSiPublicado(tx, mes, {
      tipo: 'reasignacion',
      titulo: activa
        ? `El lavado del ${reasignacion.dptoId} vuelve a aplicarse en ${nombreMes(mes)}`
        : `El lavado del ${reasignacion.dptoId} queda desactivado en ${nombreMes(mes)}`,
      detalle: activa
        ? `${fmt(aNumeroObligatorio(reasignacion.m3))} m³ se descuentan del área común y se le suman al ${reasignacion.dptoId}.`
        : `El área común vuelve a repartirse entre los siete. El total del mes no cambia.`,
      mes,
    })
    return { version: nuevaVersion }
  })
}

/** Guardar el paso en el que se quedó el administrador. */
export async function guardarPaso(mes: MesId, paso: number) {
  return prisma.$transaction(async (tx) => {
    await cierreDe(tx, mes)
    await tx.cierre.update({ where: { mes }, data: { paso } })
    return { paso }
  })
}

/**
 * Publicar el mes. El paso 7.
 *
 * Es lo único que hace visible el mes para los siete, y lo primero que genera un
 * aviso. Antes de esto, ningún vecino ve nada.
 */
export async function publicarMes(mes: MesId, datos: Publicar) {
  const resultado = await resultadoDeMes(mes)
  if (!resultado.valido) {
    throw peticionMala(`Este mes todavía no se puede publicar: ${resultado.motivoInvalido}`)
  }
  // La última red de seguridad. `04` §6: el paso 6 bloquea si el cuadre falla.
  if (!resultado.cuadra) {
    throw conflicto('El mes no cuadra, así que no se puede publicar.', {
      cuadraAgua: resultado.cuadraAgua,
      cuadraMes: resultado.cuadraMes,
      cuadraSanidad: resultado.cuadraSanidad,
      motivos: resultado.motivosSanidad,
    })
  }

  return prisma.$transaction(async (tx) => {
    const cierre = await cierreDe(tx, mes)
    if (cierre.publicado) {
      throw conflicto('Este mes ya estaba publicado.')
    }
    if (datos.version !== undefined && datos.version !== cierre.version) {
      throw conflicto('Alguien más guardó cambios en este mes. Recarga para ver lo último.')
    }

    await tx.cierre.update({
      where: { mes },
      data: {
        publicado: true,
        publicadoPor: ADMIN,
        publicadoEn: new Date(),
        paso: 7,
        version: { increment: 1 },
        notaQuePaso: datos.notaQuePaso,
        notaQueCambio: datos.notaQueCambio,
        notaQuePendiente: datos.notaQuePendiente,
        // La única cuota que se guarda: la instantánea de lo que se publicó.
        instantanea: JSON.parse(JSON.stringify(resultado)),
      },
    })
    await auditar(tx, {
      usuario: ADMIN,
      accion: 'publicar',
      entidad: 'cierre',
      entidadId: mes,
      campo: 'publicado',
      valorAnterior: 'false',
      valorNuevo: 'true',
      mes,
    })
    await tx.aviso.create({
      data: {
        tipo: 'mes_publicado',
        titulo: `Ya está el cierre de ${nombreMes(mes)}`,
        detalle: `El mes cerró en S/ ${fmt(resultado.totalMes)}, repartido entre los siete.`,
        mes,
      },
    })
    return { publicado: true, totalMes: resultado.totalMes }
  })
}

/**
 * Corregir un mes ya publicado.
 *
 * **Está permitido, y deja rastro.** Se recalcula, se avisa a los siete con qué
 * cambió, y queda en auditoría. No hay correcciones silenciosas: es la
 * contrapartida de permitir editar.
 */
export async function corregirMes(
  mes: MesId,
  datos: { lecturas?: Record<string, number>; recibo?: Record<string, number | null>; motivo: string },
) {
  const antes = await resultadoDeMes(mes)

  return prisma.$transaction(async (tx) => {
    const cierre = await tx.cierre.findUnique({ where: { mes } })
    if (!cierre?.publicado) {
      throw conflicto('Este mes no está publicado: se edita desde el cierre, sin avisar a nadie.')
    }

    const cambios: { que: string; de: string; a: string }[] = []

    for (const [dpto, valor] of Object.entries(datos.lecturas ?? {})) {
      const anterior = await tx.lectura.findUnique({ where: { mes_dptoId: { mes, dptoId: dpto } } })
      const de = anterior ? aNumeroObligatorio(anterior.valor) : null
      if (de === valor) continue
      await tx.lectura.upsert({
        where: { mes_dptoId: { mes, dptoId: dpto } },
        create: { mes, dptoId: dpto, valor: aDecimal3(valor), registradoPor: ADMIN },
        update: { valor: aDecimal3(valor) },
      })
      await auditar(tx, {
        usuario: ADMIN, accion: 'corregir', entidad: 'lectura', entidadId: `${mes}/${dpto}`,
        campo: 'valor', valorAnterior: de, valorNuevo: valor, mes,
      })
      cambios.push({ que: `la lectura del ${dpto}`, de: de === null ? '—' : de.toFixed(3), a: valor.toFixed(3) })
    }

    if (datos.recibo) {
      const anterior = await tx.recibo.findUnique({ where: { mes } })
      if (!anterior) throw peticionMala('No hay recibo que corregir en este mes.')
      const nuevo = {
        aguaM3: (datos.recibo.aguaM3 as number | undefined) ?? anterior.aguaM3,
        aguaMonto: (datos.recibo.aguaMonto as number | undefined) ?? aNumeroObligatorio(anterior.aguaMonto),
        luz: (datos.recibo.luz as number | undefined) ?? aNumeroObligatorio(anterior.luz),
        descuento:
          datos.recibo.descuento !== undefined ? (datos.recibo.descuento as number | null) : aNumero(anterior.descuento),
      }
      if (nuevo.descuento !== null && nuevo.descuento > nuevo.aguaMonto) {
        throw peticionMala('El descuento no puede ser mayor que el monto de la factura.')
      }
      await tx.recibo.update({
        where: { mes },
        data: {
          aguaM3: nuevo.aguaM3,
          aguaMonto: aDecimal2(nuevo.aguaMonto),
          luz: aDecimal2(nuevo.luz),
          descuento: nuevo.descuento === null ? null : aDecimal2(nuevo.descuento),
        },
      })
      const antesRecibo: Record<string, number | null> = {
        aguaM3: anterior.aguaM3,
        aguaMonto: aNumeroObligatorio(anterior.aguaMonto),
        luz: aNumeroObligatorio(anterior.luz),
        descuento: aNumero(anterior.descuento),
      }
      for (const campo of ['aguaM3', 'aguaMonto', 'luz', 'descuento'] as const) {
        if (antesRecibo[campo] === nuevo[campo]) continue
        await auditar(tx, {
          usuario: ADMIN, accion: 'corregir', entidad: 'recibo', entidadId: mes,
          campo, valorAnterior: antesRecibo[campo], valorNuevo: nuevo[campo], mes,
        })
        cambios.push({
          que: `el ${campo === 'aguaM3' ? 'consumo del recibo' : campo === 'aguaMonto' ? 'monto del agua' : campo === 'luz' ? 'recibo de luz' : 'descuento'}`,
          de: String(antesRecibo[campo] ?? '—'),
          a: String(nuevo[campo] ?? '—'),
        })
      }
    }

    if (cambios.length === 0) throw peticionMala('No hay nada que corregir: los valores son los mismos.')

    // Recalcular con lo ya escrito, dentro de la misma transacción.
    const despues = await recalcularEnTransaccion(tx, mes)
    if (!despues.valido || !despues.cuadra) {
      throw conflicto('Con esa corrección el mes deja de cuadrar, así que no se guarda.', {
        motivo: despues.motivoInvalido, motivos: despues.motivosSanidad,
      })
    }

    await tx.cierre.update({ where: { mes }, data: { version: { increment: 1 } } })

    // El aviso a los siete, con el monto anterior y el nuevo de quien cambió.
    const cambiaron = DPTO_IDS.filter(
      (d) => antes.valido && antes.cuotas[d].total !== despues.cuotas[d].total,
    )
    const detalleCuotas = cambiaron
      .map((d) => `El ${d} pasó de S/ ${fmt(antes.cuotas[d].total)} a S/ ${fmt(despues.cuotas[d].total)}.`)
      .join(' ')
    await tx.aviso.create({
      data: {
        tipo: 'correccion',
        titulo: `Se corrigió ${cambios.map((c) => c.que).join(' y ')} en ${nombreMes(mes)}`,
        detalle: `${datos.motivo}${detalleCuotas ? ` ${detalleCuotas}` : ' Ninguna cuota cambió de monto.'}`,
        mes,
      },
    })

    return { cambios, cuotasQueCambiaron: cambiaron.length, totalMes: despues.totalMes }
  })
}

/** Recalcula un mes leyendo dentro de la transacción, no del cliente global. */
async function recalcularEnTransaccion(tx: Tx, mes: MesId): Promise<ResultadoMes> {
  const [lecturas, anteriores, recibo, fijos, extras, reasignacion] = await Promise.all([
    tx.lectura.findMany({ where: { mes } }),
    tx.lectura.findMany({ where: { mes: mesAnteriorDe(mes) } }),
    tx.recibo.findUnique({ where: { mes } }),
    tx.gastoFijo.findMany({ where: { vigenteDesde: { lte: mes } }, orderBy: [{ orden: 'asc' }, { vigenteDesde: 'asc' }] }),
    tx.gastoExtra.findMany({ where: { mes } }),
    tx.reasignacionAgua.findFirst({ where: { desde: { lte: mes } }, include: { activaEn: true } }),
  ])

  const mapa = (filas: { dptoId: string; valor: unknown }[]) => {
    const salida: Record<string, number> = {}
    for (const f of filas) salida[f.dptoId] = Number(String(f.valor))
    return salida
  }
  const porConcepto = new Map<string, (typeof fijos)[number]>()
  for (const f of fijos) porConcepto.set(f.concepto, f)

  const marca = reasignacion?.activaEn.find((a) => a.mes === mes)
  const lavadoM3 = !reasignacion
    ? 0
    : marca
      ? marca.activa
        ? Number(String(reasignacion.m3))
        : 0
      : Number(String(reasignacion.m3))

  return calcularMes({
    mesId: mes,
    recibo: recibo
      ? {
          aguaM3: recibo.aguaM3,
          aguaMonto: Number(String(recibo.aguaMonto)),
          luz: Number(String(recibo.luz)),
          descuento: recibo.descuento === null ? null : Number(String(recibo.descuento)),
        }
      : null,
    lecturas: mapa(lecturas) as Record<DptoId, number>,
    lecturasAnteriores: mapa(anteriores) as Record<DptoId, number>,
    fijos: [...porConcepto.values()]
      .sort((a, b) => a.orden - b.orden)
      .map((f) => ({
        concepto: f.concepto,
        monto: f.monto === null ? null : Number(String(f.monto)),
        ...(f.anual ? { anual: true } : {}),
      })),
    extras: extras.map((e) =>
      e.tipo === 'credito'
        ? { tipo: 'credito' as const, concepto: e.concepto, monto: Number(String(e.monto)), dpto: e.dptoId as DptoId }
        : { tipo: 'gasto' as const, concepto: e.concepto, monto: Number(String(e.monto)) },
    ),
    lavadoM3,
  })
}

function mesAnteriorDe(mes: MesId): MesId {
  const [a, m] = mes.split('-').map(Number) as [number, number]
  return m === 1 ? (`${a - 1}-12` as MesId) : (`${a}-${String(m - 1).padStart(2, '0')}` as MesId)
}

export { entradasDeMes }
