/**
 * Editar los montos de los gastos fijos.
 *
 * Un cambio **no reescribe el pasado**: se guarda una fila nueva con su
 * `vigenteDesde`, y cada mes usa la que estaba vigente entonces. Si no fuera
 * así, subir el ascensor en agosto cambiaría las cuotas de enero, que ya se
 * cobraron.
 */

import { prisma } from '@/lib/datos/prisma'
import { aDecimal2, aNumero } from '@/lib/datos/decimal'
import { nombreMes } from '@/lib/calculo/mes'
import { fmt } from '@/lib/calculo/redondeo'
import type { MesId } from '@/lib/calculo/tipos'
import type { GuardarGastosFijos } from '@/lib/esquemas'
import { auditar, avisar } from './auditoria'

export async function guardarGastosFijos(datos: GuardarGastosFijos) {
  return prisma.$transaction(async (tx) => {
    const cambiados: { concepto: string; de: number | null; a: number | null }[] = []

    for (const cambio of datos.cambios) {
      const vigente = await tx.gastoFijo.findFirst({
        where: { concepto: cambio.concepto, vigenteDesde: { lte: datos.vigenteDesde } },
        orderBy: { vigenteDesde: 'desc' },
      })
      const de = vigente ? aNumero(vigente.monto) : null
      if (de === cambio.monto) continue

      await tx.gastoFijo.upsert({
        where: { concepto_vigenteDesde: { concepto: cambio.concepto, vigenteDesde: datos.vigenteDesde } },
        create: {
          concepto: cambio.concepto,
          monto: cambio.monto === null ? null : aDecimal2(cambio.monto),
          anual: cambio.anual ?? vigente?.anual ?? false,
          vigenteDesde: datos.vigenteDesde,
          orden: vigente?.orden ?? 99,
        },
        update: {
          monto: cambio.monto === null ? null : aDecimal2(cambio.monto),
          ...(cambio.anual === undefined ? {} : { anual: cambio.anual }),
        },
      })
      await auditar(tx, {
        usuario: 'admin',
        accion: vigente ? 'editar' : 'crear',
        entidad: 'gastoFijo',
        entidadId: `${cambio.concepto}@${datos.vigenteDesde}`,
        campo: 'monto',
        valorAnterior: de,
        valorNuevo: cambio.monto,
        mes: datos.vigenteDesde,
      })
      cambiados.push({ concepto: cambio.concepto, de, a: cambio.monto })
    }

    // Un gasto fijo cambia lo que pagan los siete a partir de ese mes: sí avisa,
    // aunque el mes todavía no esté publicado, porque no es una tecla del cierre
    // sino una decisión de administración. `06` §3 lo lista explícitamente.
    for (const c of cambiados) {
      await avisar(tx, {
        tipo: 'gasto_fijo',
        titulo:
          c.a === null
            ? `${c.concepto} queda por confirmar desde ${nombreMes(datos.vigenteDesde as MesId)}`
            : c.de === null
              ? `${c.concepto} queda en S/ ${fmt(c.a)} desde ${nombreMes(datos.vigenteDesde as MesId)}`
              : `${c.concepto} pasó de S/ ${fmt(c.de)} a S/ ${fmt(c.a)} desde ${nombreMes(datos.vigenteDesde as MesId)}`,
        detalle: 'Los meses ya cerrados no cambian.',
        mes: datos.vigenteDesde,
      })
    }

    return { cambiados }
  })
}
