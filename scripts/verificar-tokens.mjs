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

/**
 * Las extensiones de código a las que se aplican las reglas.
 *
 * `.mjs` y `.js` faltaban: los ocho ficheros de `scripts/` se recorrían, se
 * contaban en el alcance que imprime el resumen, y **ninguna regla se les
 * aplicaba**. Un `#ff0000` ahí no lo veía nadie, y el resumen decía
 * `scripts:8` como si los hubiera mirado.
 */
const CODIGO = ['.ts', '.tsx', '.mjs', '.js']

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
 * Los dos ficheros que quedan fuera de las reglas de código, y por qué.
 *
 * Salieron a la luz al empezar a revisar `.mjs`, que antes se recorrían sin
 * aplicarles nada. Se listan aquí, con motivo, y **se comprueba que existan**:
 * una exención a un fichero que ya no está es una mentira sobre el alcance.
 */
const EXENTOS = [
  [
    'scripts/verificar-tokens.mjs',
    'es este chequeo: contiene los patrones que busca, así que se encuentra a sí mismo',
  ],
  [
    'scripts/comparar-con-mockup.mjs',
    'lee los estilos del mockup dentro del navegador; esos valores son de la referencia, no de la app',
  ],
]

/**
 * Lista blanca, explícita, comentada y **acotada a la regla que perdona**.
 *
 * Cada entrada es `[patrón, reglas, motivo]`: la línea queda exenta solo de las
 * reglas que se nombran, no de las siete.
 *
 * Esto último era el agujero. La lista eximía la línea **entera**, así que
 * cualquier línea con `viewBox=` o `strokeWidth` —el patrón más común del
 * repo: `<svg viewBox="0 0 24 24" strokeWidth="1.8" className="text-verde">`—
 * quedaba fuera de todo. Medido: de diez defectos plantados, el chequeo
 * atrapaba **uno**; un `className="bg-red-500"` con un `#ff0000` al lado pasaba
 * limpio si compartía línea con un `viewBox`. Y 33 líneas reales del repo
 * estaban exentas de todo sin que nadie lo supiera.
 */
const LISTA_BLANCA = [
  // Geometría de SVG: `viewBox`, `stroke-width`, `cx`, `r`… son coordenadas del
  // dibujo, no medidas de la interfaz. No escalan con el tema ni con el zoom.
  // Perdona el `px` y el número, **no** el color ni la fuente.
  [/viewBox=/, ['px-en-style', 'px-en-clase-arbitraria'], 'coordenadas de un SVG'],
  [/stroke-?[Ww]idth/, ['px-en-style', 'px-en-clase-arbitraria'], 'grosor de trazo de un SVG'],
  // `env(safe-area-inset-*)` y las tres variables del dispositivo: por
  // definición son medidas del aparato y viven en :root de globals.css.
  [/--(top|bot|rad)\b/, ['px-en-style', 'px-en-clase-arbitraria'], 'las tres variables de dispositivo de 02 §7'],
  // Los breakpoints de `@media` en globals.css son parte de la definición
  // responsive de 02 §7, no un valor de componente.
  [/@media/, ['px-en-clase-arbitraria', 'px-en-style'], 'punto de corte responsive'],
]

/** Colores por defecto de Tailwind que no deben aparecer nunca. */
const PALETA_TAILWIND =
  /\b(?:bg|text|border|fill|stroke|from|via|to|ring|decoration|outline|shadow|accent|caret|divide|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/

const REGLAS = [
  {
    nombre: 'hex',
    // Un color hexadecimal de 3 a 8 dígitos.
    patron: /#[0-9a-f]{3,8}\b/i,
    aplicaA: CODIGO,
    mensaje: 'color hexadecimal suelto · define un token en @theme y úsalo',
  },
  {
    nombre: 'rgb',
    patron: /\brgba?\s*\(/,
    aplicaA: CODIGO,
    mensaje: 'rgb()/rgba() suelto · define un token en @theme y úsalo',
  },
  {
    nombre: 'px-en-style',
    // `style={{ ...: '12px' }}` o `style="...12px..."`
    patron: /style\s*=\s*(?:\{\{[^}]*\d+px|["'][^"']*\d+px)/,
    aplicaA: CODIGO,
    mensaje: 'px literal en una prop style · usa un token de espaciado',
  },
  {
    nombre: 'px-en-clase-arbitraria',
    // Clase arbitraria de Tailwind con px: `w-[132px]`, `p-[24px]`…
    patron: /-\[[^\]]*\d+px[^\]]*\]/,
    aplicaA: [...CODIGO, '.css'],
    mensaje: 'px literal en una clase arbitraria · define un token de espaciado',
  },
  {
    nombre: 'paleta-tailwind',
    patron: PALETA_TAILWIND,
    aplicaA: [...CODIGO, '.css'],
    mensaje: 'color por defecto de Tailwind · la paleta de la app es la de 02 §1',
  },
  {
    nombre: 'fuente-ajena',
    patron: /\b(Inter|Roboto|Arial|Helvetica)\b/,
    aplicaA: [...CODIGO, '.css'],
    mensaje: 'fuente que no es del sistema de diseño · son Syne, DM Sans y JetBrains Mono',
  },
  {
    nombre: 'font-family-suelta',
    // Un `font-family` o un shorthand `font:` que no venga de un token.
    patron: /font-family\s*:\s*(?!var\(--font-)/,
    aplicaA: [...CODIGO, '.css'],
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

/** ¿Esta línea está perdonada **para esta regla**? */
function enListaBlanca(linea, regla) {
  return LISTA_BLANCA.find(([patron, reglas]) => reglas.includes(regla) && patron.test(linea))
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
    if (EXENTOS.some(([f]) => f === rel)) continue
    const ext = path.extname(rel)
    const contenido = fs.readFileSync(path.join(RAIZ, rel), 'utf8')
    archivosRevisados.push(rel)
    contenido.split('\n').forEach((linea, i) => {
      lineasRevisadas++
      for (const regla of REGLAS) {
        if (!regla.aplicaA.includes(ext)) continue
        if (regla.exceptoEn?.includes(rel)) continue
        if (!regla.patron.test(linea)) continue
        if (enListaBlanca(linea, regla.nombre)) continue
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

/**
 * Un piso por carpeta.
 *
 * «Revisó al menos un archivo» era un listón inútil: un árbol con solo
 * `app/globals.css` dentro pasaba con `✓ cero valores huérfanos · 1 archivos` y
 * salida 0. Un `cd` mal puesto, un `--raiz` equivocado o un borrado accidental
 * daban verde. Los pisos son holgados —la mitad larga de lo que hay— para que
 * no haya que tocarlos al borrar un componente, y saltan a la vista si alguien
 * apunta el chequeo a otro sitio.
 */
const PISOS = { app: 20, components: 40, lib: 25 }
if (ES_FIXTURE) {
  /**
   * Un fixture **declara** cuántos archivos espera que se revisen.
   *
   * Sin esto, `--raiz` era la puerta de atrás al piso de abajo: apuntar el
   * chequeo a un árbol con un solo `app/globals.css` daba `✓ cero valores
   * huérfanos · 1 archivos` y salida 0. Un `cd` mal puesto o una ruta
   * equivocada pasaban por verdes.
   */
  const bandera = process.argv.indexOf('--espera')
  if (bandera === -1) {
    console.error('verificar-tokens: con --raiz hay que declarar --espera N, los archivos a revisar.')
    process.exit(2)
  }
  const espera = Number(process.argv[bandera + 1])
  if (!Number.isInteger(espera) || archivosRevisados.length !== espera) {
    console.error(
      `verificar-tokens: se revisaron ${archivosRevisados.length} archivos y el fixture declaraba ${process.argv[bandera + 1]}.`,
    )
    process.exit(2)
  }
} else {
  for (const [carpeta, minimo] of Object.entries(PISOS)) {
    const cuantos = archivosRevisados.filter((f) => f.startsWith(`${carpeta}/`)).length
    if (cuantos < minimo) {
      console.error(
        `verificar-tokens: solo ${cuantos} archivos en ${carpeta}/, se esperaban al menos ${minimo}. ` +
          'O el chequeo está apuntando al sitio equivocado, o falta medio proyecto.',
      )
      process.exit(2)
    }
  }
}
// Si la excepción ya no existe, sobra: un chequeo con una excepción muerta
// miente sobre su alcance.
if (!ES_FIXTURE) {
  for (const [fichero, motivo] of EXENTOS) {
    if (!fs.existsSync(path.join(RAIZ, fichero))) {
      console.error(`verificar-tokens: ${fichero} ya no existe (exento: ${motivo}). Quita la exención.`)
      process.exit(2)
    }
  }
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
