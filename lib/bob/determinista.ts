/**
 * El catálogo de intenciones. `05-bob-agente.md` §3 y §5.
 *
 * Con `BOB_MODO=determinista` esto es Bob entero: **sin clave, sin coste y sin
 * red**. Y con `BOB_MODO=deepseek` sigue siendo el suelo: cuando el modelo
 * tarda, falla o inventa una cifra, la respuesta se descarta y se cae aquí, sin
 * que el vecino vea un error.
 *
 * Las reglas de voz de `05` §3 valen igual aquí que allí, y aquí se cumplen por
 * construcción:
 *
 *  - **Dos líneas.** Si hace falta más, el momento está mal diseñado.
 *  - **Siempre con el dato.** No «tu consumo subió» sino «subiste de 6.20 a 8.42».
 *  - **Con dónde verificarlo.** Cada respuesta lleva a la pantalla que la
 *    demuestra: es el «nada de confía en mí» aplicado a Bob.
 *  - **Sin hablar de sí mismo.** Nunca «como asistente, no puedo…». Dice qué sí
 *    puede y quién sí puede lo otro.
 *  - **Reporta lo bueno también.** No solo pendientes.
 *
 * Todas las cifras salen de las herramientas. Ninguna se escribe aquí.
 */

import { fmt } from '@/lib/calculo/redondeo'
import { capitalizar, enumerar } from '@/lib/formato'
import { herramienta } from './herramientas'
import type { Contexto, Llamada, Respuesta } from './tipos'

/** Ejecuta una herramienta y deja constancia, que es de donde sale la guarda. */
async function llamar(
  nombre: string,
  argumentos: Record<string, unknown>,
  contexto: Contexto,
  llamadas: Llamada[],
): Promise<Record<string, unknown>> {
  const h = herramienta(nombre)
  if (!h) throw new Error(`No existe la herramienta ${nombre}`)
  const t = Date.now()
  const resultado = (await h.ejecutar(argumentos, contexto)) as Record<string, unknown>
  llamadas.push({ herramienta: nombre, argumentos, resultado, ms: Date.now() - t })
  return resultado
}

/** Las palabras que disparan cada intención, sin tildes y en minúscula. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

const INTENCIONES = [
  { id: 'cuota', palabras: ['cuanto debo', 'cuanto pago', 'mi cuota', 'cuanto es', 'cuanto me toca'] },
  { id: 'agua', palabras: ['agua', 'consumo', 'm3', 'metros cubicos', 'subio el agua', 'sedapal'] },
  { id: 'pagos', palabras: ['quien falta', 'quien no ha pagado', 'quien pago', 'pagos', 'al dia'] },
  { id: 'lavado', palabras: ['lavado', 'carro', 'vehiculo', 'auto'] },
  { id: 'gastos', palabras: ['en que se gasto', 'gastos', 'en que se fue', 'guardiania', 'ascensor'] },
  { id: 'saldo', palabras: ['saldo', 'cuenta', 'fondo', 'cuanto hay'] },
  { id: 'comparar', palabras: ['mas que', 'menos que', 'comparado', 'mes pasado', 'subio', 'bajo'] },
  { id: 'banco', palabras: ['deposito', 'transferencia', 'banco', 'viste mi pago', 'ya pague'] },
  { id: 'escribir', palabras: ['confirma', 'cambia', 'publica', 'registra', 'corrige', 'modifica', 'borra'] },
] as const

type Intencion = (typeof INTENCIONES)[number]['id'] | 'nada'

/** Qué está preguntando. La primera que encaja gana. */
export function intencionDe(texto: string): Intencion {
  const t = normalizar(texto)
  // Lo que Bob **no** puede hacer se mira primero: si alguien pide que confirme
  // un pago hablando del banco, la respuesta correcta es la del banco.
  for (const id of ['escribir', 'banco'] as const) {
    const i = INTENCIONES.find((x) => x.id === id)!
    if (i.palabras.some((p) => t.includes(p))) return id
  }
  for (const i of INTENCIONES) {
    if (i.palabras.some((p) => t.includes(p))) return i.id
  }
  return 'nada'
}

/** Responde con el catálogo. Nunca falla: es el suelo de todo lo demás. */
export async function responderDeterminista(
  texto: string,
  contexto: Contexto,
  llamadasPrevias: Llamada[] = [],
): Promise<Omit<Respuesta, 'modo' | 'motivoCaida'>> {
  const llamadas = [...llamadasPrevias]
  const r = await redactar(texto, contexto, llamadas)
  return { ...r, llamadas }
}

/** Lo que se dice, sin el registro. Cada rama devuelve texto y adónde lleva. */
async function redactar(
  texto: string,
  contexto: Contexto,
  llamadas: Llamada[],
): Promise<{ texto: string; lleva: Respuesta['lleva'] }> {
  switch (intencionDe(texto)) {
    /**
     * Lo que Bob **no** puede hacer. `05` §2, que es un contrato.
     *
     * Dice **quién sí puede**, no «como asistente, no puedo». La diferencia entre
     * las dos frases es la diferencia entre una app que ayuda y una que se
     * excusa.
     */
    case 'escribir':
      return {
        texto:
          'Yo solo leo: no puedo confirmar pagos, cambiar lecturas ni publicar un mes. ' +
          'Eso lo hace quien administra, desde Avisos → Administración, y queda registrado.',
        lleva: null,
      }

    /**
     * El banco. La prohibición más importante de `05` §2.
     *
     * Bob **no tiene acceso a la cuenta bancaria**: no puede ver depósitos, ni
     * decir que vio uno, ni rellenar un monto desde el estado de cuenta. Los
     * pagos los verifica una persona.
     */
    case 'banco': {
      const pagos = await llamar('estadoPagos', {}, contexto, llamadas)
      const mio = contexto.dpto
      const estado = mio
        ? (pagos.alDia as string[]).includes(mio)
          ? 'al día'
          : (pagos.enVerificacion as string[]).includes(mio)
            ? 'en verificación'
            : 'sin registrar'
        : null
      return {
        texto:
          'No tengo acceso a la cuenta del banco, así que no puedo ver depósitos. ' +
          (estado
            ? `Lo que sí veo es que tu pago de ${String(pagos.nombreMes)} está ${estado}; lo confirma quien administra contra el estado de cuenta.`
            : 'Los pagos los confirma quien administra contra el estado de cuenta.'),
        lleva: mio ? { hoja: 'pagos', etiqueta: 'Ver mis pagos' } : null,
      }
    }

    case 'cuota': {
      if (!contexto.dpto) {
        return { texto: 'Todavía no sé cuál es tu departamento. Elígelo y te digo tu cuota.', lleva: null }
      }
      const c = await llamar('cuotaDe', {}, contexto, llamadas)
      if (c.valido === false) {
        return {
          texto: `${capitalizar(String(c.nombreMes ?? 'ese mes'))} todavía no está cerrado, así que aún no hay cuota que decirte.`,
          lleva: null,
        }
      }
      return {
        texto:
          `Tu cuota de ${String(c.nombreMes)} es S/ ${fmt(c.total as number)}: ` +
          `S/ ${fmt(c.mantenimiento as number)} de mantenimiento y S/ ${fmt(c.agua as number)} de agua.`,
        lleva: { hoja: 'calculo', etiqueta: 'Ver el cálculo completo' },
      }
    }

    case 'agua': {
      const mes = await llamar('calcularMes', {}, contexto, llamadas)
      if (!contexto.dpto) {
        return {
          texto:
            mes.valido === false
              ? 'Todavía no hay recibo de agua de este mes.'
              : `El edificio consumió ${String(mes.aguaM3)} m³ en ${String(mes.nombreMes)} y SEDAPAL facturó S/ ${fmt(mes.facturaAgua as number)}.`,
          lleva: null,
        }
      }
      const consumo = await llamar('consumoDe', {}, contexto, llamadas)
      const meses = (consumo.meses ?? []) as { nombreMes: string; m3: number }[]
      const ultimo = meses[meses.length - 1]
      const anterior = meses[meses.length - 2]
      if (!ultimo) {
        return { texto: 'Todavía no hay consumos registrados de tu departamento.', lleva: null }
      }
      return {
        texto: anterior
          ? `En ${ultimo.nombreMes} te cobraron ${fmt(ultimo.m3)} m³ y en ${anterior.nombreMes} ${fmt(anterior.m3)}. Tu promedio del año es ${fmt(consumo.promedio as number)} m³.`
          : `En ${ultimo.nombreMes} te cobraron ${fmt(ultimo.m3)} m³. Es el primer mes, así que todavía no hay con qué compararlo.`,
        lleva: { hoja: 'agua', etiqueta: 'Ver mi consumo' },
      }
    }

    case 'pagos': {
      const p = await llamar('estadoPagos', {}, contexto, llamadas)
      const faltan = (p.sinRegistrar as string[]).map((d) => `el ${d}`)
      const verificando = (p.enVerificacion as string[]).map((d) => `el ${d}`)
      // Reporta lo bueno también (`05` §3): primero lo que va bien.
      const bueno = `${capitalizar(String(p.nombreMes))} va con ${String(p.cuantosAlDia)} de ${String(p.deCuantos)} al día`
      if (faltan.length === 0 && verificando.length === 0) {
        return { texto: `${bueno}: están los siete.`, lleva: null }
      }
      /**
       * Dos pendientes distintos se separan con punto y coma, no con otra «y».
       * Con «y» salía *«Queda el 201 avisó y falta confirmar y el 501 sin aviso
       * todavía»*: dos «y» en una frase, y la primera parecía unir «confirmar»
       * con «el 501».
       */
      const pendiente = [
        verificando.length > 0
          ? `${capitalizar(enumerar(verificando))} ${verificando.length === 1 ? 'avisó' : 'avisaron'} y falta confirmarlo`
          : '',
        faltan.length > 0
          ? `${enumerar(faltan)} ${faltan.length === 1 ? 'todavía no avisa' : 'todavía no avisan'} nada`
          : '',
      ].filter(Boolean)
      // La segunda mitad va con minúscula tras el punto y coma; si solo hay una
      // pendiente, la mayúscula de `capitalizar` la pone bien igual.
      const frase = pendiente.length === 2 ? pendiente.join('; ') : capitalizar(pendiente[0]!)
      return { texto: `${bueno}. ${frase}.`, lleva: null }
    }

    case 'lavado': {
      const l = await llamar('explicaLavado', {}, contexto, llamadas)
      if (l.valido === false) {
        return { texto: 'Ese mes todavía no está cerrado, así que no puedo decirte cómo quedó el lavado.', lleva: null }
      }
      if (l.activo === false) {
        return {
          texto: `En ${String(l.nombreMes)} el lavado no se aplicó, así que el área común se repartió entre los siete.`,
          lleva: null,
        }
      }
      return { texto: String(l.explicacion), lleva: { hoja: 'calculo', etiqueta: 'Ver el cálculo' } }
    }

    case 'gastos': {
      const g = await llamar('gastosDe', {}, contexto, llamadas)
      if (g.valido === false) {
        return { texto: `${capitalizar(String(g.nombreMes ?? 'ese mes'))} todavía no está cerrado.`, lleva: null }
      }
      const gastos = (g.gastos as { concepto: string; monto: number | null }[])
        .filter((x) => x.monto !== null)
        .sort((a, b) => (b.monto ?? 0) - (a.monto ?? 0))
        .slice(0, 2)
      return {
        texto:
          `${capitalizar(String(g.nombreMes))} costó S/ ${fmt(g.total as number)}. Lo más grande: ` +
          `${gastos.map((x) => `${x.concepto} S/ ${fmt(x.monto ?? 0)}`).join(' y ')}.`,
        lleva: { hoja: 'calculo', etiqueta: 'Ver el cálculo completo' },
      }
    }

    case 'saldo': {
      const s = await llamar('serieSaldo', {}, contexto, llamadas)
      const meses = s.meses as { nombreMes: string; saldo: number; recibido: number; gastado: number }[]
      const ultimo = meses[meses.length - 1]
      if (!ultimo) return { texto: 'Todavía no hay meses cerrados que sumar.', lleva: null }
      return {
        texto:
          `La cuenta conjunta cerró ${ultimo.nombreMes} en S/ ${fmt(ultimo.saldo)}: ` +
          `entraron S/ ${fmt(ultimo.recibido)} y se gastaron S/ ${fmt(ultimo.gastado)}.`,
        lleva: null,
      }
    }

    case 'comparar': {
      const c = await llamar('comparaMeses', {}, contexto, llamadas)
      if (c.valido === false) return { texto: 'Todavía no hay dos meses cerrados que comparar.', lleva: null }
      const dif = c.diferenciaTotal as number
      return {
        texto:
          dif === 0
            ? `${capitalizar(String(c.nombreMesB))} costó lo mismo que ${String(c.nombreMesA)}: S/ ${fmt(c.totalB as number)}.`
            : `${capitalizar(String(c.nombreMesB))} costó S/ ${fmt(Math.abs(dif))} ${dif > 0 ? 'más' : 'menos'} que ${String(c.nombreMesA)}: ` +
              `S/ ${fmt(c.totalB as number)} contra S/ ${fmt(c.totalA as number)}.`,
        lleva: { hoja: 'calculo', etiqueta: 'Ver el cálculo' },
      }
    }

    default:
      /**
       * Lo que no sabe. `05` §2: **si no tiene el dato, lo dice**.
       *
       * Y dice qué sí puede, en vez de disculparse: la lista de lo posible es
       * más útil que una disculpa por lo imposible.
       */
      return {
        texto:
          'De eso no tengo dato. Puedo decirte tu cuota, tu consumo de agua, en qué se gastó el mes, ' +
          'cómo va la cuenta o quién falta por pagar.',
        lleva: null,
      }
  }
}
