#!/usr/bin/env node
/**
 * Cero valores huérfanos. Requisito explícito del cliente.
 *
 * Falla con código distinto de cero si encuentra un color, un tamaño, un radio
 * o un espaciado suelto fuera de `app/globals.css`, que es el único sitio donde
 * los valores literales pueden vivir.
 *
 *   node scripts/verificar-tokens.mjs
 *
 * Está en `npm run verify` y en el pipeline de CI. Si esto falla, no despliega.
 */

import fs from 'node:fs'
import path from 'node:path'

/**
 * Por defecto revisa el repositorio. Con `--raiz <dir>` revisa otro árbol, que
 * es como `lib/__tests__/verificar-tokens.test.ts` le mete defectos a propósito
 * y comprueba que los atrapa, sin ensuciar el repo.
 */
const banderaRaiz = process.argv.indexOf('--raiz')
const RAIZ =
  banderaRaiz !== -1 && process.argv[banderaRaiz + 1]
    ? path.resolve(process.argv[banderaRaiz + 1])
    : path.resolve(import.meta.dirname, '..')
const ES_FIXTURE = banderaRaiz !== -1

/** Se revisa el código de la aplicación. No el mockup, que es la referencia. */
const CARPETAS = ['app', 'components', 'lib', 'scripts', 'tests', 'prisma']
const EXTENSIONES = new Set(['.ts', '.tsx', '.mjs', '.js', '.css'])

/** El único archivo donde un valor literal es legítimo. */
const ARCHIVO_TOKENS = 'app/globals.css'

/**
 * Excepción única y comentada: el color de tema de la PWA y el de los iconos
 * los consume el sistema operativo, no el navegador, así que no pueden salir de
 * una variable CSS. Viven en `lib/tema.ts` y **`lib/__tests__/tema.test.ts`
 * comprueba que son idénticos a los tokens de `globals.css`**, así que no
 * pueden desincronizarse en silencio.
 */
const EXCEPCION_TEMA = 'lib/tema.ts'

/**
 * Lista blanca, explícita y comentada.
 *
 * Cada entrada es `[patrón, motivo]`. Un `px` solo se salva si está aquí.
 */
const LISTA_BLANCA = [
  // Geometría de SVG: `viewBox`, `stroke-width`, `cx`, `r`… son coordenadas del
  // dibujo, no medidas de la interfaz. No escalan con el tema ni con el zoom.
  [/viewBox=/, 'coordenadas de un SVG'],
  [/stroke-?[Ww]idth/, 'grosor de trazo de un SVG'],
  // `env(safe-area-inset-*)` y las tres variables del dispositivo: por
  // definición son medidas del aparato y viven en :root de globals.css.
  [/--(top|bot|rad)\b/, 'las tres variables de dispositivo de 02 §7'],
  // Los breakpoints de `@media` en globals.css son parte de la definición
  // responsive de 02 §7, no un valor de componente.
  [/@media/, 'punto de corte responsive'],
]

/** Colores por defecto de Tailwind que no deben aparecer nunca. */
const PALETA_TAILWIND =
  /\b(?:bg|text|border|fill|stroke|from|via|to|ring|decoration|outline|shadow|accent|caret|divide|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/

const REGLAS = [
  {
    nombre: 'hex',
    // Un color hexadecimal de 3 a 8 dígitos.
    patron: /#[0-9a-f]{3,8}\b/i,
    aplicaA: ['.ts', '.tsx'],
    mensaje: 'color hexadecimal suelto · define un token en @theme y úsalo',
  },
  {
    nombre: 'rgb',
    patron: /\brgba?\s*\(/,
    aplicaA: ['.ts', '.tsx'],
    mensaje: 'rgb()/rgba() suelto · define un token en @theme y úsalo',
  },
  {
    nombre: 'px-en-style',
    // `style={{ ...: '12px' }}` o `style="...12px..."`
    patron: /style\s*=\s*(?:\{\{[^}]*\d+px|["'][^"']*\d+px)/,
    aplicaA: ['.ts', '.tsx'],
    mensaje: 'px literal en una prop style · usa un token de espaciado',
  },
  {
    nombre: 'px-en-clase-arbitraria',
    // Clase arbitraria de Tailwind con px: `w-[132px]`, `p-[24px]`…
    patron: /-\[[^\]]*\d+px[^\]]*\]/,
    aplicaA: ['.ts', '.tsx', '.css'],
    mensaje: 'px literal en una clase arbitraria · define un token de espaciado',
  },
  {
    nombre: 'paleta-tailwind',
    patron: PALETA_TAILWIND,
    aplicaA: ['.ts', '.tsx', '.css'],
    mensaje: 'color por defecto de Tailwind · la paleta de la app es la de 02 §1',
  },
  {
    nombre: 'fuente-ajena',
    patron: /\b(Inter|Roboto|Arial|Helvetica)\b/,
    aplicaA: ['.ts', '.tsx', '.css'],
    mensaje: 'fuente que no es del sistema de diseño · son Syne, DM Sans y JetBrains Mono',
  },
  {
    nombre: 'font-family-suelta',
    // Un `font-family` o un shorthand `font:` que no venga de un token.
    patron: /font-family\s*:\s*(?!var\(--font-)/,
    aplicaA: ['.ts', '.tsx', '.css'],
    mensaje: 'font-family que no viene de un token · usa var(--font-…)',
    exceptoEn: [ARCHIVO_TOKENS],
  },
]

function archivos(dir) {
  const salida = []
  const completo = path.join(RAIZ, dir)
  if (!fs.existsSync(completo)) return salida
  for (const entrada of fs.readdirSync(completo, { withFileTypes: true })) {
    const rel = path.join(dir, entrada.name)
    if (entrada.isDirectory()) {
      if (['node_modules', '.next', 'migrations'].includes(entrada.name)) continue
      salida.push(...archivos(rel))
    } else if (EXTENSIONES.has(path.extname(entrada.name))) {
      salida.push(rel)
    }
  }
  return salida
}

function enListaBlanca(linea) {
  return LISTA_BLANCA.find(([patron]) => patron.test(linea))
}

const fallos = []
let lineasRevisadas = 0
const archivosRevisados = []

for (const carpeta of CARPETAS) {
  for (const rel of archivos(carpeta)) {
    // globals.css es donde viven los valores: es el objetivo del ejercicio.
    if (rel === ARCHIVO_TOKENS) {
      // Aun así se comprueba que no meta una fuente ajena ni la paleta de Tailwind.
      const lineas = fs.readFileSync(path.join(RAIZ, rel), 'utf8').split('\n')
      archivosRevisados.push(rel)
      lineas.forEach((linea, i) => {
        lineasRevisadas++
        for (const regla of ['fuente-ajena', 'paleta-tailwind']) {
          const r = REGLAS.find((x) => x.nombre === regla)
          if (r.patron.test(linea)) {
            fallos.push({ archivo: rel, linea: i + 1, regla: r.nombre, texto: linea.trim(), mensaje: r.mensaje })
          }
        }
      })
      continue
    }
    if (rel === EXCEPCION_TEMA) continue
    const ext = path.extname(rel)
    const contenido = fs.readFileSync(path.join(RAIZ, rel), 'utf8')
    archivosRevisados.push(rel)
    contenido.split('\n').forEach((linea, i) => {
      lineasRevisadas++
      const blanca = enListaBlanca(linea)
      for (const regla of REGLAS) {
        if (!regla.aplicaA.includes(ext)) continue
        if (regla.exceptoEn?.includes(rel)) continue
        if (!regla.patron.test(linea)) continue
        if (blanca) continue
        fallos.push({
          archivo: rel,
          linea: i + 1,
          regla: regla.nombre,
          texto: linea.trim().slice(0, 120),
          mensaje: regla.mensaje,
        })
      }
    })
  }
}

// El chequeo miente si dice cubrir archivos que no existen. Se comprueba que
// haya revisado algo de verdad y se reporta el alcance exacto.
if (archivosRevisados.length === 0) {
  console.error('verificar-tokens: no se revisó ni un archivo. El chequeo está roto.')
  process.exit(2)
}
if (!archivosRevisados.includes(ARCHIVO_TOKENS)) {
  console.error(`verificar-tokens: no se encontró ${ARCHIVO_TOKENS}. El chequeo está roto.`)
  process.exit(2)
}
// Si la excepción ya no existe, sobra: un chequeo con una excepción muerta
// miente sobre su alcance.
if (!ES_FIXTURE) {
  if (!fs.existsSync(path.join(RAIZ, EXCEPCION_TEMA))) {
    console.error(`verificar-tokens: ${EXCEPCION_TEMA} ya no existe. Quita la excepción.`)
    process.exit(2)
  }
  if (!fs.existsSync(path.join(RAIZ, 'lib/__tests__/tema.test.ts'))) {
    console.error('verificar-tokens: falta el test que ata lib/tema.ts a los tokens.')
    process.exit(2)
  }
}

const porCarpeta = {}
for (const a of archivosRevisados) {
  const c = a.split(path.sep)[0]
  porCarpeta[c] = (porCarpeta[c] ?? 0) + 1
}

if (fallos.length > 0) {
  console.error(`\n✗ ${fallos.length} valor(es) huérfano(s):\n`)
  for (const f of fallos) {
    console.error(`  ${f.archivo}:${f.linea}  [${f.regla}]  ${f.mensaje}`)
    console.error(`      ${f.texto}`)
  }
  console.error(
    `\nRevisados ${archivosRevisados.length} archivos / ${lineasRevisadas} líneas ` +
      `(${Object.entries(porCarpeta).map(([c, n]) => `${c}:${n}`).join(' ')})\n`,
  )
  process.exit(1)
}

console.log(
  `✓ cero valores huérfanos · ${archivosRevisados.length} archivos, ${lineasRevisadas} líneas ` +
    `(${Object.entries(porCarpeta).map(([c, n]) => `${c}:${n}`).join(' ')})`,
)
