/**
 * Utilidades para los tests de integración.
 *
 * Cada archivo de test **resiembra la base desde cero**: un test que depende de
 * lo que dejó otro es un test que pasa hasta que alguien cambia el orden.
 */

import { execFileSync } from 'node:child_process'
import { prisma } from '@/lib/datos/prisma'

export function exigirBaseDeDatos(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'Los tests de integración necesitan DATABASE_URL. Levanta una base y vuelve a correrlos.',
    )
  }
}

/** Deja la base en el estado exacto de la semilla. */
export async function resembrar(): Promise<void> {
  exigirBaseDeDatos()
  // El orden importa por las claves foráneas.
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

  execFileSync('npx', ['tsx', 'prisma/seed.ts'], {
    stdio: 'pipe',
    env: process.env,
    cwd: new URL('../..', import.meta.url).pathname,
  })
}

export { prisma }
