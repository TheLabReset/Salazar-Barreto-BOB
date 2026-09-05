/**
 * `lib/tema.ts` es la única excepción a "cero valores huérfanos". Este test es
 * lo que la convierte en una excepción segura: comprueba que cada valor de ahí
 * sale, letra por letra, del token correspondiente de `app/globals.css`.
 */

import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { COLOR_NOCHE, COLOR_TEMA, ORIGEN_TOKENS } from '../tema'

const css = fs.readFileSync(path.resolve(import.meta.dirname, '../../app/globals.css'), 'utf8')

function valorDeToken(token: string): string | null {
  const m = css.match(new RegExp(`${token}\\s*:\\s*([^;]+);`))
  return m ? m[1]!.trim() : null
}

describe('lib/tema.ts no se desincroniza de los tokens', () => {
  it('el token de cada constante existe en globals.css', () => {
    for (const token of Object.values(ORIGEN_TOKENS)) {
      expect(valorDeToken(token), `falta ${token} en globals.css`).not.toBeNull()
    }
  })

  it('COLOR_TEMA es --color-crema', () => {
    expect(COLOR_TEMA.toLowerCase()).toBe(valorDeToken(ORIGEN_TOKENS.COLOR_TEMA)!.toLowerCase())
  })

  it('COLOR_NOCHE es --color-noche', () => {
    expect(COLOR_NOCHE.toLowerCase()).toBe(valorDeToken(ORIGEN_TOKENS.COLOR_NOCHE)!.toLowerCase())
  })
})
