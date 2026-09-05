'use client'

import { COPYS } from '@/lib/copys'
import { fmt } from '@/lib/calculo/redondeo'
import { CONCEPTO_AGUA, CONCEPTO_LUZ } from '@/lib/calculo/constantes'
import { useNumpad } from '@/components/Numpad'
import type { PropsPaso } from './Wizard'
import { BotonAvanzar } from './BotonAvanzar'
import { AvisoBob } from './AvisoBob'

/**
 * Paso 4 · Los gastos fijos. `04-cierre-del-mes.md`.
 *
 * Ya están puestos con su monto habitual. El **pozo a tierra** aparece sin cifra
 * y con fondo ámbar: es un gasto real cuya cifra nadie confirmó todavía. **No
 * bloquea el avance**, porque no tenerla no impide cerrar el mes.
 */
export function Paso4Fijos({ borrador, guardar, guardando, errorGuardar, avanzar }: PropsPaso) {
  const { abrir } = useNumpad()
  const fijos = borrador.resultado.gastos.filter(
    (g) => g.concepto !== CONCEPTO_AGUA && g.concepto !== CONCEPTO_LUZ && !g.extra,
  )
  const suman = fijos.reduce((s, g) => s + (g.monto ?? 0), 0)
  const sinCifra = fijos.filter((g) => g.porConfirmar)

  return (
    <div className="cierre-cuerpo">
      <h2 className="tipo-titulo-hoja cierre-titulo">{COPYS.cierre.fijosTitulo}</h2>
      <p className="tipo-cuerpo-chico text-gris cierre-intro">{COPYS.cierre.fijosIntro}</p>

      {fijos.map((g) => (
        <button
          key={g.concepto}
          type="button"
          onClick={() =>
            abrir({
              etiqueta: g.concepto,
              valorInicial: g.monto,
              decimales: true,
              maxDecimales: 2,
              sufijo: 'S/',
              onOk: (v) => void guardar('gastos-fijos', { concepto: g.concepto, monto: v }),
            })
          }
          className={g.porConfirmar ? 'fijo-fila fijo-fila-pendiente' : 'fijo-fila'}
        >
          <span className="tipo-cuerpo-medio flex min-w-0 flex-1 items-center gap-etiqueta">
            <span className="truncate">{g.concepto}</span>
            {g.anual && <span className="tipo-etiqueta-anual etiqueta-anual">{COPYS.mes.anual}</span>}
          </span>
          <span className={g.porConfirmar ? 'tipo-etiqueta-pequena text-ambar' : 'tipo-monto-lista'}>
            {g.porConfirmar ? COPYS.cierre.escribirMonto : fmt(g.monto)}
          </span>
        </button>
      ))}

      <div className="fijos-suman">
        <span className="tipo-etiqueta-seccion text-sobre-noche-etiqueta">{COPYS.cierre.suman}</span>
        <span className="tipo-cifra-bloque">{fmt(suman)}</span>
      </div>

      {sinCifra.length > 0 && (
        <AvisoBob>
          {`${sinCifra[0]!.concepto} sigue sin cifra. Puedes dejarlo así y ponerlo cuando lo tengas.`}
        </AvisoBob>
      )}
      {errorGuardar && <p className="tipo-cuerpo-menor text-ambar cierre-error">{errorGuardar}</p>}

      <BotonAvanzar onClick={avanzar} cargando={guardando}>
        {COPYS.cierre.confirmarSeguir}
      </BotonAvanzar>
    </div>
  )
}
