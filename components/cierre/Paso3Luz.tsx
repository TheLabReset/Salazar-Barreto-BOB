'use client'

import { COPYS } from '@/lib/copys'
import { fmt } from '@/lib/calculo/redondeo'
import { useNumpad } from '@/components/Numpad'
import type { PropsPaso } from './Wizard'
import { BotonAvanzar } from './BotonAvanzar'
import { AvisoBob } from './AvisoBob'
import { CampoNumerico } from './CampoNumerico'
import { Fallo } from '@/components/ui/Fallo'

/** Paso 3 · El recibo de luz común. Un solo campo. `04-cierre-del-mes.md`. */
export function Paso3Luz({ borrador, guardar, guardando, errorGuardar, avanzar }: PropsPaso) {
  const { abrir } = useNumpad()
  const luz = borrador.resultado.rec.luz
  const tiene = luz > 0

  return (
    <div className="cierre-cuerpo">
      <h2 className="tipo-titulo-hoja cierre-titulo">{COPYS.cierre.luzTitulo}</h2>
      <p className="tipo-cuerpo-chico text-gris cierre-intro">{COPYS.cierre.luzIntro}</p>

      <CampoNumerico
        etiqueta={COPYS.cierre.campoLuz}
        valor={tiene ? fmt(luz) : null}
        prefijo="S/"
        onTocar={() =>
          abrir({
            etiqueta: COPYS.cierre.campoLuz,
            valorInicial: tiene ? luz : null,
            decimales: true,
            maxDecimales: 2,
            sufijo: 'S/',
            onOk: (v) => void guardar('recibo', { luz: v }),
          })
        }
      />

      {tiene && (
        <AvisoBob>
          {`S/ ${fmt(luz)} es lo que llegó en el recibo de luz común. Si no coincide con el papel, cámbialo antes de seguir.`}
        </AvisoBob>
      )}
      {errorGuardar && <Fallo>{errorGuardar}</Fallo>}

      <BotonAvanzar onClick={avanzar} bloqueadoPor={tiene ? null : COPYS.cierre.faltaMonto} cargando={guardando}>
        Continuar
      </BotonAvanzar>
    </div>
  )
}
