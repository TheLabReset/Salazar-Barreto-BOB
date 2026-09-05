'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useHoja } from './Hojas'

/**
 * El contenedor visual de una hoja. `02` §4.8.
 *
 * Fondo crema, `border-radius: 32px 32px var(--rad) var(--rad)` —la esquina de
 * abajo sigue al marco—, asa de arrastre, y detrás el fondo oscurecido.
 *
 * Lleva **trampa de foco**: con la hoja abierta, tabular no puede salirse a la
 * pantalla de atrás. Es lo que `02` §8 marca como pendiente.
 */

const ALTURAS = {
  /** Bob ocupa casi toda la altura. */
  completa: 'hoja-completa',
  /** Cálculo, agua, pagos y el cierre del mes. */
  alta: 'hoja-alta',
  /** El resto. */
  media: 'hoja-media',
} as const

export function Hoja({
  children,
  titulo,
  altura = 'media',
}: {
  children: ReactNode
  /** Lo que anuncia el lector de pantalla al abrirse. */
  titulo: string
  altura?: keyof typeof ALTURAS
}) {
  const { cerrar } = useHoja()
  const panel = useRef<HTMLDivElement>(null)
  const antes = useRef<HTMLElement | null>(null)

  useEffect(() => {
    antes.current = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const alTabular = (ev: KeyboardEvent) => {
      if (ev.key !== 'Tab' || !panel.current) return
      const focos = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focos.length === 0) return
      const primero = focos[0]!
      const ultimo = focos[focos.length - 1]!
      if (ev.shiftKey && document.activeElement === primero) {
        ev.preventDefault()
        ultimo.focus()
      } else if (!ev.shiftKey && document.activeElement === ultimo) {
        ev.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', alTabular)
    return () => {
      document.removeEventListener('keydown', alTabular)
      antes.current?.focus()
    }
  }, [])

  return (
    <>
      <button type="button" className="velo" onClick={cerrar} aria-label="Cerrar" tabIndex={-1} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={`hoja animar-hoja scroll-limpio ${ALTURAS[altura]}`}
      >
        <div className="asa-contenedor">
          <span className="asa" />
        </div>
        {children}
      </div>
    </>
  )
}
