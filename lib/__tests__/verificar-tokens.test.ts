/**
 * La prueba negativa de `scripts/verificar-tokens.mjs`, hecha permanente.
 *
 * Un chequeo que nunca se vio fallar no es un chequeo: es una decoración. Este
 * test le mete a propósito, una por una, cada clase de valor huérfano que el
 * script dice atrapar, y comprueba que **sale en rojo y con código distinto de
 * cero**. Después comprueba que un árbol limpio sale en verde.
 *
 * Los defectos se inyectan en un árbol temporal fuera del repo, con `--raiz`.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SCRIPT = path.resolve(import.meta.dirname, '../../scripts/verificar-tokens.mjs')
const CSS_ORIGINAL = path.resolve(import.meta.dirname, '../../app/globals.css')

let raiz: string

beforeAll(() => {
  raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'verificar-tokens-'))
  fs.mkdirSync(path.join(raiz, 'app'), { recursive: true })
  fs.mkdirSync(path.join(raiz, 'components'), { recursive: true })
  // El árbol de prueba lleva el globals.css de verdad: si el script lo tratara
  // mal, este test lo vería.
  fs.copyFileSync(CSS_ORIGINAL, path.join(raiz, 'app/globals.css'))
})

afterAll(() => {
  fs.rmSync(raiz, { recursive: true, force: true })
})

function correr(): { codigo: number; salida: string } {
  try {
    const salida = execFileSync('node', [SCRIPT, '--raiz', raiz], { encoding: 'utf8' })
    return { codigo: 0, salida }
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string }
    return { codigo: err.status ?? 1, salida: (err.stdout ?? '') + (err.stderr ?? '') }
  }
}

function conDefecto(contenido: string, nombre = 'components/defecto.tsx'): { codigo: number; salida: string } {
  const archivo = path.join(raiz, nombre)
  fs.mkdirSync(path.dirname(archivo), { recursive: true })
  fs.writeFileSync(archivo, contenido)
  try {
    return correr()
  } finally {
    fs.rmSync(archivo, { force: true })
  }
}

/**
 * Los defectos se arman por trozos a propósito.
 *
 * Si estuvieran escritos enteros, este mismo archivo sería un valor huérfano y
 * el script se marcaría a sí mismo. La alternativa —excluir este archivo del
 * chequeo— sería peor: un chequeo con un agujero es un chequeo que miente
 * sobre su alcance.
 */
const DEFECTOS: [regla: string, codigo: string][] = [
  ['hex', `export const c = '` + '#' + `C9773A'`],
  ['rgb', `export const c = '` + 'rgb' + `a(14,14,14,.08)'`],
  ['px-en-style', `export const c = <div style={{ padding: '24` + 'px' + `' }} />`],
  ['px-en-clase-arbitraria', `export const c = <div className="w-[132` + 'px' + `]" />`],
  ['paleta-tailwind', `export const c = <div className="text-` + 'gray' + `-500" />`],
  ['fuente-ajena', `export const c = '` + 'Int' + `er'`],
  ['font-family-suelta', `export const c = '` + 'font-fam' + `ily: Comic Sans'`],
]

describe('verificar-tokens · prueba negativa de cada regla', () => {
  for (const [regla, codigo] of DEFECTOS) {
    it(`atrapa un valor huérfano de tipo "${regla}"`, () => {
      const { codigo: salida, salida: texto } = conDefecto(codigo)
      expect(salida, `el script debería salir con código != 0 ante: ${codigo}`).not.toBe(0)
      expect(texto).toContain(`[${regla}]`)
    })
  }
})

describe('verificar-tokens · un árbol limpio pasa', () => {
  it('sale en verde y dice cuántos archivos revisó', () => {
    const { codigo, salida } = correr()
    expect(codigo).toBe(0)
    expect(salida).toContain('cero valores huérfanos')
    expect(salida).toMatch(/\d+ archivos/)
  })

  it('no se queda callado si no revisó nada: sale con código 2', () => {
    const vacio = fs.mkdtempSync(path.join(os.tmpdir(), 'vt-vacio-'))
    try {
      let codigo = 0
      try {
        execFileSync('node', [SCRIPT, '--raiz', vacio], { encoding: 'utf8' })
      } catch (e) {
        codigo = (e as { status?: number }).status ?? 1
      }
      expect(codigo).toBe(2)
    } finally {
      fs.rmSync(vacio, { recursive: true, force: true })
    }
  })
})

describe('verificar-tokens · el repo de verdad está limpio', () => {
  it('cero valores huérfanos en app, components, lib, scripts', () => {
    const salida = execFileSync('node', [SCRIPT], { encoding: 'utf8' })
    expect(salida).toContain('cero valores huérfanos')
  })
})
