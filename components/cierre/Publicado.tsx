'use client'

import { COPYS } from '@/lib/copys'
import { fmt } from '@/lib/calculo/redondeo'
import { Hoja } from '@/components/hojas/Hoja'

/** La pantalla de confirmación del paso 7. `04-cierre-del-mes.md`. */
export function Publicado({
  mes,
  total,
  cuadra,
  onVolver,
}: {
  mes: string
  total: number
  cuadra: boolean
  onVolver: () => void
}) {
  return (
    <Hoja titulo={COPYS.cierre.publicado(mes)} altura="alta">
      <div className="cierre-cuerpo publicado">
        <span className="publicado-icono" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <h2 className="tipo-titulo-hoja publicado-titulo">{COPYS.cierre.publicado(mes)}</h2>
        <p className="publicado-total">
          <span className="tipo-simbolo text-gris">S/</span>
          <span className="tipo-cifra-secundaria">{fmt(total)}</span>
        </p>
        <p className="tipo-cuerpo-chico text-gris publicado-texto">
          repartido entre los siete{cuadra ? ' · el agua cuadró exacto' : ''}
        </p>
        <p className="tipo-cuerpo-menor text-gris publicado-nota">{COPYS.cierre.publicadoTexto}</p>
        <button type="button" onClick={onVolver} className="cierre-boton">
          {COPYS.cierre.volverAlPanel}
        </button>
      </div>
    </Hoja>
  )
}
