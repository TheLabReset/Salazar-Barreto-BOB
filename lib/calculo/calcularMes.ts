/**
 * El motor de cálculo. `01-reglas-de-negocio.md` es la especificación.
 *
 * Port literal de `calcularMes()` de `mockup/datos-edificio.js`, con el mismo
 * orden de operaciones y los mismos puntos de redondeo. **No mover un `round2`
 * de sitio**: el cuadre depende de dónde cae cada uno.
 *
 * Función pura: mismas entradas, mismas salidas. No lee la base de datos, no
 * mira el reloj y no tiene efectos. Por eso el mismo código corre en el
 * servidor al publicar y en el cliente mientras el administrador teclea.
 */

import {
  CONCEPTO_AGUA,
  CONCEPTO_LUZ,
  DPTOS,
  LAVADO,
  ORDEN_GASTOS,
  TOLERANCIA_AGUA,
  TOLERANCIA_MES,
} from './constantes'
import { round2 } from './redondeo'
import type {
  CuotaDpto,
  DptoId,
  EntradasMes,
  LineaGasto,
  Overrides,
  PorDpto,
  Recibo,
  ResultadoMes,
} from './tipos'

const RECIBO_VACIO: Recibo = { aguaM3: 0, aguaMonto: 0, luz: 0, descuento: null }

/** Resultado marcado como inválido. Nunca `null`, nunca `NaN`. */
function invalido(mesId: ResultadoMes['mesId'], rec: Recibo, motivo: string): ResultadoMes {
  // `as`: `Object.fromEntries` devuelve `{[k: string]: T}`; aquí las claves son
  // exactamente los siete ids de `DPTOS`, que es lo que `PorDpto` afirma.
  const cero = <T>(v: T): PorDpto<T> =>
    Object.fromEntries(DPTOS.map((d) => [d.id, v])) as PorDpto<T>
  const cuotaCero: CuotaDpto = {
    mantenimiento: 0, agua: 0, credito: 0, total: 0,
    m3: 0, m3medidos: 0, lavado: 0, lecturaAnterior: 0, lecturaActual: 0,
  }
  return {
    mesId,
    valido: false,
    motivoInvalido: motivo,
    rec,
    consumos: cero(0),
    sumaMedida: 0,
    facturaAgua: 0,
    precioM3: 0,
    brutoComun: 0,
    comunReal: 0,
    lavado: 0,
    ajustado: false,
    factor: 1,
    montoComun: 0,
    gastos: [],
    totalMes: 0,
    baseMant: 0,
    // `as`: mismo motivo que arriba, se construye recorriendo los siete DPTOS.
    cuotas: Object.fromEntries(
      DPTOS.map((d) => [d.id, { ...cuotaCero }]),
    ) as PorDpto<CuotaDpto>,
    sumaAgua: 0,
    sumaCuotas: 0,
    totalCreditos: 0,
    cuadraAgua: false,
    cuadraMes: false,
    cuadra: false,
    descuento: 0,
  }
}

/**
 * Calcula un mes completo.
 *
 * @param entradas Lo guardado: recibo, lecturas del mes y del anterior, gastos
 *                 fijos vigentes, extras y los m³ del lavado configurados.
 * @param ov       Lo que el administrador está escribiendo y aún no guardó.
 *                 Cada campo pisa la entrada guardada individualmente.
 */
export function calcularMes(entradas: EntradasMes, ov: Overrides = {}): ResultadoMes {
  const { mesId } = entradas

  // ── Recibo efectivo: lo escrito pisa lo guardado, campo por campo
  const base = entradas.recibo
  const rec: Recibo = {
    aguaM3: ov.recibo?.aguaM3 ?? base?.aguaM3 ?? 0,
    aguaMonto: ov.recibo?.aguaMonto ?? base?.aguaMonto ?? 0,
    luz: ov.recibo?.luz ?? base?.luz ?? 0,
    descuento: ov.recibo?.descuento ?? base?.descuento ?? null,
  }

  if (!base && !ov.recibo) {
    return invalido(mesId, rec, 'Todavía no se registró el recibo de este mes.')
  }

  // Sin las lecturas del mes anterior no hay consumo que calcular.
  const faltantesAnteriores = DPTOS.filter(
    (d) => entradas.lecturasAnteriores[d.id] == null,
  ).map((d) => d.id)
  if (faltantesAnteriores.length > 0) {
    return invalido(
      mesId,
      rec,
      `Faltan las lecturas del mes anterior de ${faltantesAnteriores.join(', ')}.`,
    )
  }

  // Dividir entre los m³ facturados: sin ellos no hay precio por m³.
  if (!(rec.aguaM3 > 0)) {
    return invalido(
      mesId,
      rec,
      'El recibo de SEDAPAL no tiene m³ facturados, así que no hay precio por m³ que repartir.',
    )
  }

  // ── Lecturas efectivas. Si no hay lectura del mes, se arrastra la anterior
  //    (consumo 0: el medidor no se movió o todavía no se tecleó).
  // `as`: el tipo declarado es parcial, pero justo arriba se comprobó que los
  // siete departamentos tienen lectura anterior; si faltara alguna ya se
  // habría devuelto un resultado inválido.
  const lecAnt = entradas.lecturasAnteriores as Record<DptoId, number>
  // `as`: se recorre `DPTOS`, así que las siete claves están presentes, y el
  // valor nunca es `undefined` porque `lecAnt` ya está completo.
  const lecAct: PorDpto<number> = Object.fromEntries(
    DPTOS.map((d) => {
      const escrito = ov.lecturas?.[d.id]
      const guardado = entradas.lecturas[d.id]
      return [d.id, escrito ?? guardado ?? lecAnt[d.id]]
    }),
  ) as PorDpto<number>

  // ── Consumo medido · §3.1
  // `as`: acumuladores que el bucle de justo abajo rellena para los siete.
  const consumos = {} as PorDpto<number>
  let sumaMedida = 0
  for (const d of DPTOS) {
    const c = round2(lecAct[d.id] - lecAnt[d.id])
    consumos[d.id] = c
    sumaMedida += c
  }
  sumaMedida = round2(sumaMedida)

  // ── El agua · §2.2 y §3.2
  const facturaAgua = round2(rec.aguaMonto - (rec.descuento ?? 0))
  // precioM3 NO se redondea: se arrastra a precisión completa. Redondear el
  // precio unitario descuadra el total.
  const precioM3 = facturaAgua / rec.aguaM3
  const brutoComun = round2(rec.aguaM3 - sumaMedida)

  // ── Reparto ajustado · §3.4 · los medidores midieron más de lo facturado
  const ajustado = brutoComun < 0
  const factor = ajustado ? rec.aguaM3 / sumaMedida : 1

  // ── El lavado sale del caño común: se reasigna, no se suma · §3.3
  const lavM3 = ov.lavadoM3 ?? entradas.lavadoM3
  const lavado =
    !ajustado && lavM3 > 0 && brutoComun >= lavM3 && mesId >= LAVADO.desde ? lavM3 : 0
  const comunReal = round2(brutoComun - lavado)

  // `as`: los rellena el bucle siguiente, uno por departamento.
  const m3Cobrados = {} as PorDpto<number>
  const montoAgua = {} as PorDpto<number>
  for (const d of DPTOS) {
    const extra = d.id === LAVADO.dpto ? lavado : 0
    const m3 = round2(consumos[d.id] * factor + extra)
    m3Cobrados[d.id] = m3
    montoAgua[d.id] = round2(m3 * precioM3)
  }

  const montoComun = ajustado ? 0 : round2(comunReal * precioM3)

  // ── Los gastos del mes · §4
  // Se recorre el orden documentado e insertando el agua y la luz en su sitio.
  const porConcepto = new Map(entradas.fijos.map((g) => [g.concepto, g]))
  const montoDe = (concepto: string): number | null => {
    if (ov.fijos && Object.prototype.hasOwnProperty.call(ov.fijos, concepto)) {
      return ov.fijos[concepto] ?? null
    }
    return porConcepto.get(concepto)?.monto ?? null
  }

  const gastos: LineaGasto[] = []
  for (const concepto of ORDEN_GASTOS) {
    if (concepto === CONCEPTO_AGUA) {
      gastos.push({ concepto, monto: facturaAgua, esAgua: true })
      continue
    }
    if (concepto === CONCEPTO_LUZ) {
      gastos.push({ concepto, monto: rec.luz })
      continue
    }
    const fijo = porConcepto.get(concepto)
    const monto = montoDe(concepto)
    gastos.push({
      concepto,
      monto,
      ...(fijo?.anual ? { anual: true } : {}),
      // `null` es "por confirmar", no "cuesta cero". La interfaz lo muestra distinto.
      ...(monto == null ? { porConfirmar: true } : {}),
    })
  }
  // Conceptos fijos que el administrador añadió y no están en el orden documentado.
  for (const fijo of entradas.fijos) {
    // `as`: `ORDEN_GASTOS` es una tupla literal; se ensancha a string para
    // poder buscar en ella un concepto que viene de la base de datos.
    if ((ORDEN_GASTOS as readonly string[]).includes(fijo.concepto)) continue
    const monto = montoDe(fijo.concepto)
    gastos.push({
      concepto: fijo.concepto,
      monto,
      ...(fijo.anual ? { anual: true } : {}),
      ...(monto == null ? { porConfirmar: true } : {}),
    })
  }
  // Gastos extraordinarios del paso 5: se suman al total y los pagan los siete.
  for (const e of ov.extras ?? entradas.extras) {
    if (e.tipo === 'gasto') gastos.push({ concepto: e.concepto, monto: e.monto, extra: true })
  }

  const totalMes = round2(gastos.reduce((s, g) => s + (g.monto || 0), 0))
  // El agua se saca de la base porque no se reparte por flat sino por consumo.
  const baseMant = round2(totalMes - facturaAgua)

  // ── Créditos · §4.2 · salen del saldo de la cuenta, no de los demás vecinos
  const creditos: Partial<Record<DptoId, number>> = {}
  for (const e of ov.extras ?? entradas.extras) {
    if (e.tipo === 'credito' && e.dpto) {
      creditos[e.dpto] = (creditos[e.dpto] ?? 0) + e.monto
    }
  }

  // `as`: lo rellena el bucle de abajo, uno por departamento.
  const cuotas = {} as PorDpto<CuotaDpto>
  for (const d of DPTOS) {
    // `round(baseMant * flat) / 100` es exactamente `round2(baseMant * flat / 100)`.
    // Se conserva la forma escrita del original para que la comparación línea a
    // línea con `datos-edificio.js` sea trivial.
    const mant = Math.round(baseMant * d.flat) / 100
    const cred = creditos[d.id] ?? 0
    cuotas[d.id] = {
      credito: cred,
      mantenimiento: round2(mant),
      agua: montoAgua[d.id],
      m3: m3Cobrados[d.id],
      m3medidos: consumos[d.id],
      lavado: d.id === LAVADO.dpto ? lavado : 0,
      total: round2(mant + montoAgua[d.id] - cred),
      lecturaAnterior: lecAnt[d.id],
      lecturaActual: lecAct[d.id],
    }
  }

  // ── Los dos cuadres · §5
  const sumaAgua = round2(DPTOS.reduce((s, d) => s + montoAgua[d.id], 0))
  const cuadraAgua = Math.abs(sumaAgua + montoComun - facturaAgua) < TOLERANCIA_AGUA

  const totalCreditos = round2(DPTOS.reduce((s, d) => s + (cuotas[d.id].credito || 0), 0))
  const sumaCuotas = round2(DPTOS.reduce((s, d) => s + cuotas[d.id].total, 0))
  const cuadraMes =
    Math.abs(sumaCuotas + montoComun + totalCreditos - totalMes) < TOLERANCIA_MES

  return {
    mesId,
    valido: true,
    motivoInvalido: null,
    rec,
    consumos,
    sumaMedida,
    facturaAgua,
    precioM3,
    brutoComun,
    comunReal,
    lavado,
    ajustado,
    factor,
    montoComun,
    gastos,
    totalMes,
    baseMant,
    cuotas,
    sumaAgua,
    sumaCuotas,
    totalCreditos,
    cuadraAgua,
    cuadraMes,
    cuadra: cuadraAgua && cuadraMes,
    descuento: rec.descuento ?? 0,
  }
}

export { RECIBO_VACIO }
