import { prisma } from '@/lib/datos/prisma'
import { aDecimal2, aNumeroObligatorio } from '@/lib/datos/decimal'
import { auditar, avisar } from '@/lib/servicios/auditoria'
import { noEncontrado } from '@/lib/servicios/errores'
import { zConfigurarLavado } from '@/lib/esquemas'
import { exigirAdmin, leerCuerpo, responder } from '@/lib/servicios/ruta'
import { fmt } from '@/lib/calculo/redondeo'

/**
 * `PUT /api/reasignaciones` · cambiar los m³ del lavado.
 *
 * Cambia lo que se le cobra al 401 todos los meses, así que **avisa a los
 * siete**: `06` §3 lista las reasignaciones entre lo que genera aviso.
 */
export async function PUT(peticion: Request) {
  return responder(async () => {
    await exigirAdmin()
    const { m3 } = await leerCuerpo(peticion, zConfigurarLavado)

    return prisma.$transaction(async (tx) => {
      const reasignacion = await tx.reasignacionAgua.findFirst()
      if (!reasignacion) throw noEncontrado('No hay ninguna reasignación configurada.')
      const antes = aNumeroObligatorio(reasignacion.m3)
      if (antes === m3) return { m3, cambio: false }

      await tx.reasignacionAgua.update({ where: { id: reasignacion.id }, data: { m3: aDecimal2(m3) } })
      await auditar(tx, {
        usuario: 'admin',
        accion: 'editar',
        entidad: 'reasignacionAgua',
        entidadId: reasignacion.id,
        campo: 'm3',
        valorAnterior: antes,
        valorNuevo: m3,
      })
      await avisar(tx, {
        tipo: 'reasignacion',
        titulo: `El ${reasignacion.concepto} del ${reasignacion.dptoId} pasa de ${fmt(antes)} a ${fmt(m3)} m³`,
        detalle:
          'Se sigue restando del área común y sumando al departamento: el total del edificio no cambia. Los meses ya cerrados no se tocan.',
      })
      return { m3, cambio: true }
    })
  })
}
