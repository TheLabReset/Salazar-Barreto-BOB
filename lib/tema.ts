/**
 * Los pocos valores del sistema de diseño que tienen que existir **fuera** de
 * CSS, porque los consume el sistema operativo y no el navegador: el color de
 * la barra del teléfono y el del manifiesto de la PWA.
 *
 * Este archivo es la única excepción a "cero valores huérfanos", y no es una
 * excepción de verdad: `lib/__tests__/tema.test.ts` comprueba que cada valor de
 * aquí es idéntico al token de `app/globals.css`. Si alguien cambia el token y
 * se olvida de este archivo, el test se pone rojo.
 */

/** `--color-crema` · el fondo de la app y el color de tema de la PWA. */
export const COLOR_TEMA = '#F7F4EE'

/** `--color-noche` · el color de los iconos del manifiesto. */
export const COLOR_NOCHE = '#17172B'

/** El token de `globals.css` del que sale cada uno. Lo usa el test. */
export const ORIGEN_TOKENS = {
  COLOR_TEMA: '--color-crema',
  COLOR_NOCHE: '--color-noche',
} as const
