/**
 * El avatar de Bob. `02` §5.
 *
 * Una forma redondeada con hue ámbar. **Nunca** una chispa, ni un gradiente
 * morado, ni una cara con expresión de juicio. Bob no finge ser una persona.
 */

const TAMANOS = {
  linea: 20,
  tarjeta: 24,
  aviso: 22,
  nav: 38,
  cabecera: 30,
} as const

export function Avatar({
  tamano = 'tarjeta',
  invertido = false,
  sonrie = false,
}: {
  tamano?: keyof typeof TAMANOS
  /** Relleno crema sobre fondo ámbar, para el botón de la navegación. */
  invertido?: boolean
  sonrie?: boolean
}) {
  const px = TAMANOS[tamano]
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={invertido ? 'avatar-invertido' : 'avatar'}
    >
      <path
        d="M20 4c9.4 0 16.6 5.4 16.6 15.4S30 36 20 36 3.4 29.4 3.4 19.4 10.6 4 20 4z"
        className="avatar-cuerpo"
      />
      <ellipse cx="14.6" cy={sonrie ? 18.2 : 19.6} rx="2.6" ry="3" className="avatar-ojo" />
      <ellipse cx="25.4" cy={sonrie ? 18.2 : 19.6} rx="2.6" ry="3" className="avatar-ojo" />
      {sonrie && (
        <path
          d="M16 26c2.4 1.6 5.6 1.6 8 0"
          className="avatar-boca"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  )
}
