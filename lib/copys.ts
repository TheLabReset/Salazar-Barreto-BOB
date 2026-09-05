/**
 * TODOS los textos de pantalla, transcritos literalmente de
 * `mockup/03-pantallas.md`, `mockup/04-cierre-del-mes.md` y del prototipo.
 *
 * Están aquí y no repartidos por los componentes para que se vea que son
 * **contenido, no decoración**. Se escribieron y reescribieron para el tono
 * "vecino, no cobrador": no se mejoran, no se acortan, no se traducen.
 *
 * Regla dura: **ningún valor interpolado se escribe fijo.** Los copys que
 * llevan un número son funciones que reciben el valor del cálculo. El caso
 * concreto es la línea del lavado: dice "Incluye 1.50 m³" y ese 1.50 viene del
 * motor. Este bug apareció dos veces durante el diseño.
 */

import { fmt } from './calculo/redondeo'
import type { EstadoCuota } from './estados'

export const COPYS = {
  app: {
    nombre: 'Edificio Jr. Enrique Salazar Barreto',
    nombreCorto: 'Salazar Barreto',
    descripcion:
      'Las cuentas del edificio, abiertas. Cada cuota se abre y muestra cómo se calculó.',
    direccion: 'Jr. Enrique Salazar Barreto',
  },

  /** `01` §7 · nunca "deudor", "moroso" ni "vencido". */
  estados: {
    'al-dia': 'Al día',
    'sin-registrar': 'Sin registrar',
    'en-verificacion': 'En verificación',
  } satisfies Record<EstadoCuota, string>,

  // ── P0 · Elegir departamento ───────────────────────────────────────────
  onboarding: {
    marca: 'Jr. Enrique Salazar Barreto',
    titulo: '¿Cuál es tu departamento?',
    subtitulo: 'Así Inicio te muestra lo tuyo primero.',
    entrar: 'Entrar',
  },

  // ── P1 · Inicio ────────────────────────────────────────────────────────
  inicio: {
    saludo: (dpto: string) => `Hola, ${dpto}`,
    tuCuota: (mes: string) => `Tu cuota de ${mes}`,
    comoSeCalculo: '¿Cómo se calculó?',
    yaPague: 'Ya pagué',
    mantenimiento: 'Mantenimiento',
    consumoAgua: (m3: number) => `Consumo de agua · ${fmt(m3)} m³`,
    /** El 1.50 viene del cálculo. Si el admin lo cambia a 3, la frase dice 3.00. */
    incluyeLavado: (m3: number) =>
      `Incluye ${fmt(m3)} m³ del lavado de vehículo, que salen del caño común.`,
    los7: 'Los 7 este mes',
    grupoAlDia: 'Al día',
    grupoAvisaron: 'Avisaron, falta confirmar',
    grupoSinAviso: 'Sin aviso todavía',
    leyendaAlDia: 'Al día',
    leyendaPorConfirmar: 'Por confirmar',
    leyendaSinAviso: 'Sin aviso',
    tuDepartamento: 'Tu departamento',
    enQueSeGasto: 'En qué se gastó',
    facturaAguaCon: (m3: number) => `Factura de agua · ${m3} m³`,
    restoGastos: (n: number) => `+ ${n} gastos más · total del mes`,
    laCuenta: 'La cuenta',
    recibido: 'Recibido',
    gastado: 'Gastado',
    resumenPagos: (confirmados: number, avisados: number) =>
      avisados
        ? `${confirmados} confirmados · ${avisados} por confirmar`
        : `${confirmados} / 7`,
    notaSaldo: (delta: number) =>
      delta < 0
        ? `acumulado de la cuenta conjunta · este mes bajó S/ ${fmt(Math.abs(delta))}`
        : `acumulado de la cuenta conjunta · este mes subió S/ ${fmt(delta)}`,
    sparklineCorta: 'La curva aparece con el tercer mes',
    detalleSinRegistrar: 'Aún no hay un pago asociado a este mes.',
    detalleEnVerificacion: (fecha: string) =>
      `Avisaste el ${fecha}. Falta que lo confirmen contra el estado de cuenta.`,
    detalleAlDia: (fecha: string, op: string) => `Pagado el ${fecha} · op. ${op}`,
  },

  // ── P2 · El mes ────────────────────────────────────────────────────────
  mes: {
    titulo: 'El mes',
    costoTotal: 'Costó mantener el edificio',
    comparacion: (diferencia: number) =>
      diferencia >= 0
        ? `S/ ${fmt(diferencia)} más que el mes pasado`
        : `S/ ${fmt(Math.abs(diferencia))} menos que el mes pasado`,
    sinComparacion: 'repartido entre los siete según metraje',
    consumoPorDpto: 'Consumo de agua por dpto · m³',
    aguaSedapal: 'Agua SEDAPAL',
    m3DelEdificio: 'm³ del edificio',
    facturaAgua: 'Factura de agua',
    notaComun: (m3: number) => `${fmt(m3)} m³ del área común`,
    notaComunAjustado: 'los medidores midieron de más',
    verCalculo: 'Ver el cálculo completo →',
    gastosDe: (mes: string) => `Gastos de ${mes}`,
    anual: 'ANUAL ÷ 12',
    porConfirmar: 'por confirmar',
    total: 'Total',
    las7Cuotas: 'Las 7 cuotas',
    desglose: (mantenimiento: number, agua: number) =>
      `mant. ${fmt(mantenimiento)} + agua ${fmt(agua)}`,
    pagosRecibidos: 'Pagos recibidos',
    sinPagos: 'Todavía no hay pagos confirmados de este mes.',
    detallePago: (fecha: string, op: string) => `${fecha} · op. ${op}`,
    /** `01` §3.4: en la interfaz esto nunca se llama "ajustado" ni "Ruta A/B". */
    explicaNormalConLavado: (medidores: number, sedapal: number, lavado: number, comun: number) =>
      `Los medidores sumaron ${fmt(medidores)} m³ y SEDAPAL facturó ${sedapal}. De la diferencia, ${fmt(lavado)} m³ son el lavado del 401; los ${fmt(comun)} m³ restantes son área común y se reparten entre los siete.`,
    explicaNormalSinLavado: (medidores: number, sedapal: number, comun: number) =>
      `Los medidores sumaron ${fmt(medidores)} m³ y SEDAPAL facturó ${sedapal}. La diferencia, ${fmt(comun)} m³, se cobra como área común.`,
    explicaAjustado: (medidores: number, sedapal: number) =>
      `Los medidores sumaron ${fmt(medidores)} m³ y SEDAPAL facturó ${sedapal}. Como no se puede cobrar más de lo que llegó en el recibo, a cada uno se le descontó la misma proporción.`,
  },

  // ── P3 · Mi departamento ───────────────────────────────────────────────
  miDpto: {
    cabecera: (nombre: string, flat: number) => `${nombre} · Flat ${flat}%`,
    titulo: (dpto: string) => `Depa ${dpto}`,
    cambiar: 'Cambiar',
    comoPagar: 'Cómo pagar',
    yaPague: 'Ya pagué',
    lavado: 'Lavado de vehículo',
    explicaLavado: (m3: number) =>
      `El agua sale del caño común, así que esos ${fmt(m3)} m³ se restan del área común y se suman a los tuyos. No es un cobro aparte: el total sigue siendo lo que factura SEDAPAL.`,
    tuHistoria: 'Tu historia en el edificio',
    historialPagos: 'Historial de pagos',
    resumenAnual: (alDia: number, meses: number, enVerificacion: number) =>
      enVerificacion
        ? `pagado en 2026 · ${alDia} al día, ${enVerificacion} en verificación`
        : `pagado en 2026 · ${alDia} de ${meses} meses al día`,
    tuConsumo: 'Tu consumo de agua',
    notaConsumo: (mes: string, promedio: number) =>
      `en ${mes} · tu promedio del año es ${fmt(promedio)}`,
    administrar: 'Administrar el edificio',
    ejeInicio: 'ENE',
    ejeFin: 'DIC',
  },

  // ── P4 · Historial ─────────────────────────────────────────────────────
  historial: {
    titulo: 'Historial',
    subtitulo: 'Desde que los propietarios tomaron la administración.',
    laCuenta: 'La cuenta',
    consumoEdificio: 'Consumo de agua del edificio · m³',
    mesAMes: 'Mes a mes',
    estadoMes: (alDia: number) => `${alDia} de 7 al día`,
  },

  // ── P5 · Avisos ────────────────────────────────────────────────────────
  avisos: {
    titulo: 'Avisos',
    subtitulo: 'Todo lo que se movió en el edificio. Los siete ven lo mismo.',
    marcarLeido: 'Marcar todo leído',
    hoy: 'Hoy',
    estaSemana: 'Esta semana',
    antes: 'Antes',
    vacio: 'Todavía no hay avisos.',
  },

  // ── Hojas ──────────────────────────────────────────────────────────────
  hojas: {
    avisoOk: {
      titulo: 'Listo, ya avisaste',
      texto:
        'Tu mes pasó a «en verificación». Deja de figurar como pendiente y quien administra lo confirma contra el estado de cuenta.',
    },
  },

  // ── Bob ────────────────────────────────────────────────────────────────
  bob: {
    nombre: 'Bob',
    subtitulo: 'lee todo el historial',
    campo: 'Escribe tu pregunta',
    sugeridas: [
      '¿Cuánto debo este mes?',
      '¿Por qué subió el agua?',
      '¿Quién falta por pagar?',
      '¿Qué es el lavado del 401?',
    ],
  },

  // ── El cierre del mes · 04-cierre-del-mes.md ───────────────────────────
  cierre: {
    paso: (n: number) => `Paso ${n} de 7`,
    // Paso 0
    titulo: (mes: string) => `Vamos a cerrar ${mes}`,
    intro:
      'Son siete pasos. Se guarda solo en cada uno, así que puedes salir y volver cuando quieras.',
    vasANecesitar: 'Vas a necesitar',
    necesitas: [
      { que: 'Las 7 lecturas de medidor', cuando: 'se leen el día 25' },
      { que: 'El recibo de SEDAPAL', cuando: 'los m³ y el monto' },
      { que: 'El recibo de luz común', cuando: 'solo el monto' },
    ],
    fijosPuestos: 'Los gastos fijos ya te los dejé puestos. Solo los confirmas en el paso 4.',
    empezar: 'Empezar',
    seguir: 'Seguir donde lo dejaste',
    // Paso 1
    lecturasTitulo: 'Las lecturas',
    lecturasIntro: 'Al lado tienes la del mes pasado.',
    contador: (hechas: number) => `${hechas} / 7`,
    anterior: (valor: string) => `anterior ${valor}`,
    consumo: (m3: string) => `consumo ${m3} m³`,
    escribirLectura: 'escribir la lectura',
    consumoAlto: (dpto: string) => `Es más del doble de lo habitual del ${dpto}. ¿Es correcto?`,
    faltaUna: 'Falta una lectura',
    faltanVarias: (n: number) => `Faltan ${n} lecturas`,
    // Paso 2
    aguaTitulo: 'La factura de agua',
    aguaIntro: 'Del recibo de SEDAPAL, tal como viene en el papel.',
    campoM3: 'Consumo de agua del edificio',
    campoM3Largo: 'Consumo de agua del edificio · m³ de SEDAPAL',
    campoMonto: 'Monto de la factura de agua',
    campoMontoLargo: 'Monto de la factura de agua · SEDAPAL',
    faltanDos: 'Escribe los dos datos',
    // Paso 3
    luzTitulo: 'El recibo de luz común',
    luzIntro: 'La luz de pasillos, ascensor y bomba. Solo el monto.',
    campoLuz: 'Monto del recibo de luz común',
    faltaMonto: 'Escribe el monto',
    // Paso 4
    fijosTitulo: 'Los gastos que no cambian',
    fijosIntro: 'Ya están puestos. Toca cualquiera si cambió de monto.',
    escribirMonto: 'Escribir monto',
    suman: 'Suman',
    confirmarSeguir: 'Confirmar y seguir',
    // Paso 5
    puntualTitulo: '¿Pasó algo fuera de lo normal?',
    puntualIntro: 'La mayoría de meses no pasa nada. Puedes seguir de largo sin añadir nada.',
    anadirGasto: 'Añadir un gasto extraordinario',
    anadirCredito: 'Añadir un crédito a un departamento',
    montoGasto: 'Monto del gasto extraordinario',
    montoCredito: 'Monto del crédito',
    anadidos: (n: number) => `Añadido este mes · ${n}`,
    seRepartte: 'se reparte entre los siete',
    aFavorDe: (dpto: string) => `a favor del ${dpto}`,
    reasignaciones: 'Reasignaciones de agua · ¿siguen?',
    lavadoActivo: 'activo · se descuenta del área común',
    lavadoInactivo: 'desactivado este mes',
    nadaMas: 'Nada más este mes, seguir',
    // Paso 6
    revisionTitulo: (mes: string) => `Así queda ${mes}`,
    revisionIntro: 'Revisa antes de que lo vean los siete.',
    totalDe: (mes: string) => `Total de ${mes}`,
    cuadraExacto: 'El agua cuadra exacto',
    cuadraAjustado: 'El agua cuadra · reparto ajustado',
    noCuadra: 'Los montos no cuadran',
    cuadraTexto:
      'Lo que pagan los siete más el área común es exactamente lo que facturó SEDAPAL.',
    loQuePagan: 'Lo que pagan los siete',
    areaComun: (m3: string) => `Área común del agua · ${m3} m³`,
    creditosAplicados: 'Créditos aplicados',
    creditosNota: 'salen del saldo de la cuenta, no de los demás vecinos',
    todoCorrecto: 'Todo correcto, seguir',
    revisaLecturas: 'Revisa las lecturas para seguir',
    revisaFactura: 'Revisa la factura para seguir',
    // Paso 7
    notaTitulo: 'La nota del mes',
    notaIntro: 'Ya te la redacté con lo que ingresaste. Corrige lo que quieras — la leen los siete.',
    quePaso: 'Qué pasó',
    queCambio: 'Qué cambió',
    quePendiente: 'Qué queda pendiente',
    alPublicar: 'Al publicar',
    alPublicarPuntos: [
      'Los siete ven las cuotas del mes',
      'A cada uno le llega un aviso con su monto',
      'Si después se corrige algo, todos se enteran',
    ],
    publicar: (mes: string) => `Publicar ${mes}`,
    publicado: (mes: string) => `${mes} ya está publicado`,
    publicadoTexto: 'Los siete ya pueden ver sus cuotas y la nota del mes.',
    volverAlPanel: 'Volver al panel',
  },

  // ── Administración ─────────────────────────────────────────────────────
  admin: {
    entrar: 'Administrar el edificio',
    pinTitulo: 'Administrar el edificio',
    pinTexto: 'La clave la tiene quien administra.',
    titulo: 'Administración',
  },
} as const

export type Copys = typeof COPYS
