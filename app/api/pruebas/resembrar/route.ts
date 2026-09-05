import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { prisma } from '@/lib/datos/prisma'

const ejecutar = promisify(execFile)

/**
 * `POST /api/pruebas/resembrar` · deja la base como la semilla.
 *
 * **Solo existe fuera de producción.** En producción devuelve 404, igual que
 * cualquier ruta que no existe: una ruta que borra la base entera no puede estar
 * accesible en el servidor donde viven los datos de siete familias.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production' && process.env.PERMITIR_RESEMBRADO !== 'si') {
    return new Response('Not Found', { status: 404 })
  }

  await prisma.avisoLeido.deleteMany()
  await prisma.aviso.deleteMany()
  await prisma.auditoria.deleteMany()
  await prisma.intentoPin.deleteMany()
  await prisma.reasignacionActivaEnMes.deleteMany()
  await prisma.reasignacionAgua.deleteMany()
  await prisma.gastoExtra.deleteMany()
  await prisma.gastoFijo.deleteMany()
  await prisma.pago.deleteMany()
  await prisma.lectura.deleteMany()
  await prisma.recibo.deleteMany()
  await prisma.cierre.deleteMany()
  await prisma.departamento.deleteMany()
  await prisma.configuracionEdificio.deleteMany()

  await ejecutar('npx', ['tsx', 'prisma/seed.ts'], { env: process.env })
  return Response.json({ ok: true })
}
