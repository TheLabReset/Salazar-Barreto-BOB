/**
 * Lo común de todas las rutas de la API.
 *
 * Un error de validación devuelve **400 con un mensaje claro**, no un 500. Un
 * 500 significa que se nos escapó algo, y por eso se registra distinto.
 */

import { NextResponse } from 'next/server'
import { ZodError, type ZodTypeAny, type output } from 'zod'
import { cookies, headers } from 'next/headers'
import { COOKIE_ADMIN, sesionValida } from './admin'
import { ErrorDeApi, peticionMala, sinPermiso } from './errores'

/** Tamaño máximo de un cuerpo. Un JSON de 10 MB no es una petición legítima. */
const MAX_CUERPO = 256 * 1024 // 256 KB

export async function leerCuerpo<E extends ZodTypeAny>(
  peticion: Request,
  esquema: E,
): Promise<output<E>> {
  const largo = peticion.headers.get('content-length')
  if (largo && Number(largo) > MAX_CUERPO) {
    throw peticionMala('El cuerpo de la petición es demasiado grande.')
  }
  let crudo: unknown
  const texto = await peticion.text()
  if (texto.length > MAX_CUERPO) throw peticionMala('El cuerpo de la petición es demasiado grande.')
  try {
    crudo = texto ? JSON.parse(texto) : {}
  } catch {
    throw peticionMala('El cuerpo de la petición no es JSON válido.')
  }
  const resultado = esquema.safeParse(crudo)
  if (!resultado.success) {
    throw peticionMala(mensajeDeZod(resultado.error), resultado.error.flatten())
  }
  return resultado.data
}

/** El primer mensaje de Zod, que es el que el usuario puede entender. */
function mensajeDeZod(error: ZodError): string {
  const primero = error.issues[0]
  if (!primero) return 'Los datos enviados no son válidos.'
  const donde = primero.path.length > 0 ? `${primero.path.join('.')}: ` : ''
  return `${donde}${primero.message}`
}

/** Valida un parámetro de ruta, por ejemplo el mes. */
export function validarParametro<E extends ZodTypeAny>(
  valor: unknown,
  esquema: E,
  nombre: string,
): output<E> {
  const resultado = esquema.safeParse(valor)
  if (!resultado.success) {
    throw peticionMala(`${nombre}: ${resultado.error.issues[0]?.message ?? 'no es válido'}`)
  }
  return resultado.data
}

/** Exige una sesión de administración válida. */
export async function exigirAdmin(): Promise<void> {
  const tarro = await cookies()
  if (!sesionValida(tarro.get(COOKIE_ADMIN)?.value)) {
    throw sinPermiso()
  }
}

/** La IP de quien pide, para el límite de intentos. */
export async function ipDeLaPeticion(): Promise<string> {
  const cabeceras = await headers()
  const reenviada = cabeceras.get('x-forwarded-for')
  if (reenviada) return reenviada.split(',')[0]!.trim()
  return cabeceras.get('x-real-ip') ?? 'desconocida'
}

/**
 * Envuelve el cuerpo de una ruta y traduce los errores.
 *
 * Nunca devuelve un 500 con una traza: si algo revienta de verdad, se registra
 * en el servidor y al cliente le llega un mensaje sobrio.
 */
export async function responder<T>(accion: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json(await accion())
  } catch (e) {
    if (e instanceof ErrorDeApi) {
      return NextResponse.json({ error: e.message, detalle: e.detalle }, { status: e.estado })
    }
    if (e instanceof ZodError) {
      return NextResponse.json({ error: mensajeDeZod(e) }, { status: 400 })
    }
    // Un error de restricción de la base es un dato incoherente que se coló:
    // es culpa nuestra, pero al usuario se le dice qué pasó, no el SQL.
    const mensaje = e instanceof Error ? e.message : String(e)
    if (mensaje.includes('violates check constraint') || mensaje.includes('Unique constraint')) {
      console.error('[api] restricción de la base:', mensaje)
      return NextResponse.json(
        { error: 'Esos datos no son coherentes con lo que ya está guardado.' },
        { status: 409 },
      )
    }
    console.error('[api] error no previsto:', e)
    return NextResponse.json({ error: 'Algo salió mal de nuestro lado.' }, { status: 500 })
  }
}
