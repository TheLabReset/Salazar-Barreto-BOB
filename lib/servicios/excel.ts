/**
 * Exportar el año a Excel. De verdad, no solo la hoja.
 *
 * El prototipo tenía la pantalla y no la descarga. Esto genera un `.xlsx` con
 * cuatro pestañas y **los mismos números que la app**, calculados con el mismo
 * motor: si el Excel y la pantalla no coincidieran, uno de los dos mentiría.
 */

import ExcelJS from 'exceljs'
import { DPTOS } from '@/lib/calculo/constantes'
import { etiquetaMes } from '@/lib/calculo/mes'
import { pagosDe, resultadoDeMes } from '@/lib/datos/mes'
import { mesesConDatos, serieDelSaldo } from '@/lib/datos/meses'

const MONEDA = '#,##0.00'
const M3 = '#,##0.00'
const LECTURA = '#,##0.000'

export async function excelDelAnio(anio: number): Promise<Buffer> {
  const meses = (await mesesConDatos()).filter((m) => m.startsWith(String(anio)))
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Edificio Jr. Enrique Salazar Barreto'
  libro.created = new Date()

  // ── Cuotas: una fila por mes, una columna por departamento
  const cuotas = libro.addWorksheet('Cuotas')
  cuotas.addRow(['Mes', ...DPTOS.map((d) => `${d.id} · ${d.nombre}`), 'Área común', 'Total del mes'])
  cuotas.getRow(1).font = { bold: true }

  // ── Agua: consumo medido y cobrado
  const agua = libro.addWorksheet('Agua')
  agua.addRow([
    'Mes', 'm³ SEDAPAL', 'Suma medidores', 'Área común m³', 'Lavado m³',
    'Factura S/', 'Descuento S/', 'Precio m³', '¿Reparto ajustado?',
    ...DPTOS.flatMap((d) => [`${d.id} medidos`, `${d.id} cobrados`, `${d.id} S/`]),
  ])
  agua.getRow(1).font = { bold: true }

  // ── Gastos: una fila por mes y concepto
  const gastos = libro.addWorksheet('Gastos')
  gastos.addRow(['Mes', 'Concepto', 'Monto S/', 'Anual ÷ 12', 'Por confirmar'])
  gastos.getRow(1).font = { bold: true }

  // ── Pagos
  const pagos = libro.addWorksheet('Pagos')
  pagos.addRow(['Mes', 'Departamento', 'Cuota S/', 'Estado', 'Fecha', 'Operación'])
  pagos.getRow(1).font = { bold: true }

  for (const mes of meses) {
    const [r, p] = await Promise.all([resultadoDeMes(mes), pagosDe(mes)])
    const etiqueta = etiquetaMes(mes)
    if (!r.valido) {
      cuotas.addRow([etiqueta, ...DPTOS.map(() => null), null, null])
      continue
    }

    cuotas.addRow([
      etiqueta,
      ...DPTOS.map((d) => r.cuotas[d.id].total),
      r.montoComun,
      r.totalMes,
    ])

    agua.addRow([
      etiqueta, r.rec.aguaM3, r.sumaMedida, r.comunReal, r.lavado,
      r.facturaAgua, r.descuento, r.precioM3, r.ajustado ? 'sí' : 'no',
      ...DPTOS.flatMap((d) => [r.cuotas[d.id].m3medidos, r.cuotas[d.id].m3, r.cuotas[d.id].agua]),
    ])

    for (const g of r.gastos) {
      gastos.addRow([etiqueta, g.concepto, g.monto, g.anual ? 'sí' : '', g.porConfirmar ? 'sí' : ''])
    }

    for (const d of DPTOS) {
      const pago = p[d.id]
      pagos.addRow([
        etiqueta,
        `${d.id} · ${d.nombre}`,
        r.cuotas[d.id].total,
        pago ? (pago.estado === 'confirmado' ? 'Al día' : 'En verificación') : 'Sin registrar',
        pago?.fecha ?? '',
        pago?.op ?? '',
      ])
    }
  }

  // ── La cuenta
  const cuenta = libro.addWorksheet('La cuenta')
  cuenta.addRow(['Mes', 'Recibido S/', 'Gastado S/', 'Diferencia S/', 'Saldo S/'])
  cuenta.getRow(1).font = { bold: true }
  for (const fila of await serieDelSaldo()) {
    if (!fila.mes.startsWith(String(anio))) continue
    cuenta.addRow([etiquetaMes(fila.mes), fila.recibido, fila.gastado, fila.delta, fila.saldo])
  }

  // Formatos de número: sin esto Excel muestra 373.82 como 373.82000000000005.
  for (let c = 2; c <= DPTOS.length + 3; c++) cuotas.getColumn(c).numFmt = MONEDA
  for (const [col, fmt] of [[3, M3], [4, M3], [5, M3], [6, MONEDA], [7, MONEDA], [8, LECTURA]] as const) {
    agua.getColumn(col).numFmt = fmt
  }
  for (let c = 10; c <= 9 + DPTOS.length * 3; c++) {
    agua.getColumn(c).numFmt = (c - 9) % 3 === 0 ? MONEDA : M3
  }
  gastos.getColumn(3).numFmt = MONEDA
  pagos.getColumn(3).numFmt = MONEDA
  for (let c = 2; c <= 5; c++) cuenta.getColumn(c).numFmt = MONEDA

  for (const hoja of [cuotas, agua, gastos, pagos, cuenta]) {
    hoja.views = [{ state: 'frozen', ySplit: 1 }]
    hoja.columns.forEach((col) => {
      col.width = Math.max(12, String(col.header ?? '').length + 2)
    })
  }

  const datos = await libro.xlsx.writeBuffer()
  return Buffer.from(datos)
}
