'use client'

import { COPYS } from '@/lib/copys'
import { useHoja } from '@/components/hojas/Hojas'
import type { DptoId, MesId } from '@/lib/calculo/tipos'

/**
 * "Cómo pagar" y "Ya pagué".
 *
 * Solo aparecen si el pago está sin registrar: a quien ya avisó no se le sigue
 * pidiendo algo que ya dijo que hizo. Es "vecinos, no morosos" aplicado a un
 * estado de datos.
 */
export function AccionesPago({ mes, dpto }: { mes: MesId; dpto: DptoId }) {
  const { abrir } = useHoja()
  return (
    <div className="flex gap-acciones midpto-acciones">
      <button type="button" onClick={() => abrir('pagar')} className="midpto-boton-pagar">
        {COPYS.miDpto.comoPagar}
      </button>
      <button type="button" onClick={() => abrir('pagar')} className="midpto-boton-avisar">
        {COPYS.miDpto.yaPague}
      </button>
      <span className="sr-only">
        {mes} · {dpto}
      </span>
    </div>
  )
}
