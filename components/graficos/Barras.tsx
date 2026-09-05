'use client'

import { useState } from 'react'
import { fmt } from '@/lib/calculo/redondeo'

/**
 * Gráfico de barras. `02-sistema-de-diseno.md` §4.4.
 *
 * SVG y CSS a mano, sin librería: son barras. Sin ejes, sin leyenda, sin
 * cuadrícula. **Una sola barra en color** —la del usuario o la del mes activo—
 * y el resto en neutro. El color del destacado depende del dato: terracota para
 * dinero, celeste para agua.
 *
 * Al tocar una barra sale un tooltip noche con el valor exacto.
 */

export interface Barra {
  id: string
  etiqueta: string
  valor: number
}

export function Barras({
  barras,
  destacado,
  alto = 'mes',
  color = 'agua',
  sufijo,
  titulo,
}: {
  barras: readonly Barra[]
  destacado?: string
  /** `mes` es 132px; `edificio`, 100px. */
  alto?: 'mes' | 'edificio'
  color?: 'agua' | 'terra'
  sufijo?: string
  /** Para el lector de pantalla: qué muestra el gráfico. */
  titulo: string
}) {
  const [tocada, setTocada] = useState<string | null>(null)
  const maximo = Math.max(...barras.map((b) => b.valor), 0) || 1

  return (
    <div className="relative" role="img" aria-label={titulo}>
      <div className={`flex items-end gap-barras ${alto === 'mes' ? 'h-grafico-mes' : 'h-grafico-edificio'}`}>
        {barras.map((b) => {
          const activa = b.id === destacado
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setTocada(tocada === b.id ? null : b.id)}
              aria-label={`${b.etiqueta}: ${fmt(b.valor)}${sufijo ? ` ${sufijo}` : ''}`}
              className="barra-toque"
              style={{ ['--alto-barra' as string]: `${Math.max(3, (b.valor / maximo) * 100)}%` }}
            >
              <span
                className={`barra ${
                  activa ? (color === 'agua' ? 'bg-agua' : 'bg-terra') : 'bg-neutro-barra'
                }`}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-eje flex gap-barras">
        {barras.map((b) => (
          <span
            key={b.id}
            className={`tipo-mono-eje flex-1 text-center ${
              b.id === destacado ? (color === 'agua' ? 'text-agua' : 'text-terra') : 'text-gris'
            }`}
          >
            {b.etiqueta}
          </span>
        ))}
      </div>
      {tocada && (
        <output className="tooltip-noche">
          {barras.find((b) => b.id === tocada)!.etiqueta} · {fmt(barras.find((b) => b.id === tocada)!.valor)}
          {sufijo ? ` ${sufijo}` : ''}
        </output>
      )}
    </div>
  )
}
