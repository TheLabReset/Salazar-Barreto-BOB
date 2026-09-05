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

  // ── Administración ─────────────────────────────────────────────────────
  admin: {
    entrar: 'Administrar el edificio',
    pinTitulo: 'Administrar el edificio',
    pinTexto: 'La clave la tiene quien administra.',
    titulo: 'Administración',
  },
} as const

export type Copys = typeof COPYS
