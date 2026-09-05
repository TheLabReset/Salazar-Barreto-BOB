'use client'

import { useState } from 'react'
import { Hoja } from './Hoja'

/**
 * `export` · Exportar el año. **Con la descarga de verdad.**
 *
 * El prototipo tenía la pantalla y no el archivo. Aquí el botón pide
 * `/api/export/[anio]`, que genera un `.xlsx` con el mismo motor que la app: si
 * el Excel y la pantalla no coincidieran, uno de los dos mentiría.
 */
export function HojaExport({ anios }: { anios: readonly number[] }) {
  const [bajando, setBajando] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const descargar = async (anio: number) => {
    setBajando(anio)
    setError(null)
    try {
      const r = await fetch(`/api/export/${anio}`)
      if (!r.ok) throw new Error('No se pudo generar el archivo')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `edificio-salazar-barreto-${anio}.xlsx`
      document.body.append(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el archivo')
    } finally {
      setBajando(null)
    }
  }

  const incluye = [
    'Las 7 cuotas de cada mes con su desglose',
    'Las lecturas de medidor y los consumos',
    'Los recibos de agua y de luz común',
    'Todos los gastos, mes por mes',
    'Los pagos con fecha y número de operación',
    'La cuenta: recibido, gastado y saldo',
  ]

  return (
    <Hoja titulo="Exportar el año">
      <div className="hoja-cuerpo">
        <h2 className="tipo-titulo-hoja pagar-titulo">Exportar el año</h2>
        <p className="tipo-cuerpo-chico text-gris pagar-intro">
          Un archivo con todo lo que hay en la app, mes por mes.
        </p>

        <div className="pagar-nota">
          <p className="tipo-etiqueta-pequena text-gris publicar-etiqueta">Va a incluir</p>
          <ul className="publicar-lista">
            {incluye.map((x) => (
              <li key={x} className="publicar-punto">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-verde publicar-check" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span className="tipo-cuerpo-menor">{x}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && <p className="tipo-cuerpo-menor text-ambar pagar-error">{error}</p>}

        {anios.length === 0 && (
          <p className="tipo-cuerpo-menor text-gris pagar-error">Todavía no hay ningún mes cargado.</p>
        )}
        {anios.map((anio) => (
          <button
            key={anio}
            type="button"
            onClick={() => void descargar(anio)}
            aria-disabled={bajando === anio}
            className="cierre-boton"
          >
            {bajando === anio ? 'Generando…' : `Descargar ${anio} en Excel`}
          </button>
        ))}
      </div>
    </Hoja>
  )
}
