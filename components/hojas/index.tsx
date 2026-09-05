'use client'

import { useHoja } from './Hojas'
import { HojaAvisoOk } from './HojaAvisoOk'
import { HojaCalculo } from './HojaCalculo'
import { HojaHistorial } from './HojaHistorial'
import { HojaPagarConDatos } from './HojaPagarConDatos'
import { HojaWizard } from './HojaWizard'
import { useContexto } from './Contexto'

/**
 * El despachador de hojas.
 *
 * Cada hoja se monta solo cuando está abierta: así el contenido se pide al
 * servidor en ese momento y no en cada carga de pantalla.
 */
export function Hojas() {
  const { hoja } = useHoja()
  const { mes, dpto } = useContexto()
  if (!hoja) return null
  switch (hoja) {
    case 'aviso-ok':
      return <HojaAvisoOk />
    case 'calculo':
      return mes && dpto ? <HojaCalculo mes={mes} dpto={dpto} /> : null
    case 'pagos':
      return dpto ? <HojaHistorial dpto={dpto} modo="pagos" /> : null
    case 'agua':
      return dpto ? <HojaHistorial dpto={dpto} modo="agua" /> : null
    case 'pagar':
      return mes && dpto ? <HojaPagarConDatos mes={mes} dpto={dpto} /> : null
    case 'wizard':
      return <HojaWizard />
    default:
      return null
  }
}
