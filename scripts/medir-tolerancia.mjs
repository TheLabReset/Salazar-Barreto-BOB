#!/usr/bin/env node
/**
 * Mide cada cuánto falla el cuadre del agua por puro redondeo.
 *
 * Existe porque un comentario que afirma "falla el 0.028 % de las veces, peor
 * error 0.03" y no se puede reproducir es una cifra escrita de memoria. Aquí
 * está el generador, a la vista, y el número sale de ejecutarlo:
 *
 *   node scripts/medir-tolerancia.mjs [N]
 *
 * Los dos generadores son distintos a propósito:
 *
 *  - NORMAL: SEDAPAL factura al menos lo que suman los medidores, que es lo que
 *    dice `01` §3.2 que pasa siempre. Precio del m³ entre 3.80 y 4.60 S/, que es
 *    el rango de los ocho meses de la semilla.
 *  - AJUSTADO: SEDAPAL factura MENOS que los medidores. Es el caso ocasional de
 *    `01` §3.4, y es donde el cuadre se rompe de verdad, porque además de los
 *    ocho redondeos a céntimo se redondean los m³ de cada departamento antes de
 *    multiplicarlos por el precio.
 */

import { pathToFileURL } from 'node:url'
import path from 'node:path'

const { calcularMes } = await import(
  pathToFileURL(path.resolve(import.meta.dirname, '../lib/calculo/calcularMes.ts')).href
).catch(async () => {
  // El motor es TypeScript: se ejecuta con tsx.
  console.error('Ejecútalo con tsx:  npx tsx scripts/medir-tolerancia.mjs')
  process.exit(2)
})

const { DPTOS, GASTOS_FIJOS, TOLERANCIA_AGUA } = await import(
  pathToFileURL(path.resolve(import.meta.dirname, '../lib/calculo/constantes.ts')).href
)
const { round2 } = await import(
  pathToFileURL(path.resolve(import.meta.dirname, '../lib/calculo/redondeo.ts')).href
)

const N = Number(process.argv[2] ?? 500_000)

/** Generador determinista: la medición se puede repetir. */
function crearAzar(semilla) {
  let s = semilla
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function medir(nombre, construir, semilla) {
  const azar = crearAzar(semilla)
  let n = 0
  let fallos = 0
  let peor = 0
  let fallosMes = 0
  for (let i = 0; i < N; i++) {
    const entradas = construir(azar)
    const c = calcularMes(entradas)
    if (!c.valido) continue
    n++
    const error = Math.abs(c.sumaAgua + c.montoComun - c.facturaAgua)
    if (error > peor) peor = error
    if (!c.cuadraAgua) fallos++
    if (!c.cuadraMes) fallosMes++
  }
  const pct = (x) => ((x / n) * 100).toFixed(4)
  console.log(
    `${nombre.padEnd(9)} n=${n}  cuadraAgua falla ${fallos} (${pct(fallos)} %)  ` +
      `cuadraMes falla ${fallosMes} (${pct(fallosMes)} %)  peor error ${peor.toFixed(6)}`,
  )
  return { n, fallos, fallosMes, peor }
}

function base(azar, ajustado) {
  const anteriores = {}
  const actuales = {}
  let suma = 0
  for (const d of DPTOS) {
    const a = Math.round(azar() * 400 * 1000) / 1000
    const cons = Math.round(azar() * 26 * 1000) / 1000
    anteriores[d.id] = a
    actuales[d.id] = Math.round((a + cons) * 1000) / 1000
    suma += round2(cons)
  }
  suma = round2(suma)
  const aguaM3 = ajustado
    ? Math.max(1, Math.floor(suma) - Math.floor(azar() * 6))
    : Math.ceil(suma) + Math.floor(azar() * 7)
  const precio = 3.8 + azar() * 0.8
  return {
    mesId: '2026-06',
    recibo: { aguaM3, aguaMonto: Math.max(1, round2(aguaM3 * precio)), luz: 300, descuento: null },
    lecturas: actuales,
    lecturasAnteriores: anteriores,
    fijos: GASTOS_FIJOS,
    extras: [],
    lavadoM3: 1.5,
  }
}

console.log(`Tolerancia del cuadre del agua: ${TOLERANCIA_AGUA} · ${N} meses por rama\n`)
const normal = medir('NORMAL', (azar) => base(azar, false), 20260701)
const ajustado = medir('AJUSTADO', (azar) => base(azar, true), 20260702)

console.log(
  `\nCota estructural: ocho redondeos a céntimo (siete cuotas de agua más el área\n` +
    `común) dan hasta 8 × 0.005 = 0.04, por encima de la tolerancia de ${TOLERANCIA_AGUA}.\n` +
    `En reparto ajustado se suman los redondeos de los m³ de cada departamento,\n` +
    `que van multiplicados por el precio del m³, y la cota se dispara.`,
)

process.exitCode = normal.n > 0 && ajustado.n > 0 ? 0 : 1
