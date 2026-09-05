'use client'

import { COPYS } from '@/lib/copys'
import { fmt } from '@/lib/calculo/redondeo'
import { useNumpad } from '@/components/Numpad'
import type { PropsPaso } from './Wizard'
import { BotonAvanzar } from './BotonAvanzar'
import { AvisoBob } from './AvisoBob'
import { CampoNumerico } from './CampoNumerico'

/**
 * Paso 2 · La factura de agua. `04-cierre-del-mes.md`.
 *
 * Las etiquetas dicen **de qué** es el consumo y **de qué** es la factura —nunca
 * "consumo" a secas—, porque el administrador tiene delante dos recibos y dos
 * cifras que se parecen.
 */
export function Paso2Agua({ borrador, guardar, guardando, errorGuardar, avanzar }: PropsPaso) {
  const { abrir } = useNumpad()
  const rec = borrador.resultado.rec
  const tieneM3 = rec.aguaM3 > 0
  const tieneMonto = rec.aguaMonto > 0

  const bloqueo = tieneM3 && tieneMonto ? null : COPYS.cierre.faltanDos

  return (
    <div className="cierre-cuerpo">
      <h2 className="tipo-titulo-hoja cierre-titulo">{COPYS.cierre.aguaTitulo}</h2>
      <p className="tipo-cuerpo-chico text-gris cierre-intro">{COPYS.cierre.aguaIntro}</p>

      <CampoNumerico
        etiqueta={COPYS.cierre.campoM3}
        tono="agua"
        valor={tieneM3 ? String(rec.aguaM3) : null}
        sufijo="m³"
        onTocar={() =>
          abrir({
            etiqueta: COPYS.cierre.campoM3Largo,
            valorInicial: tieneM3 ? rec.aguaM3 : null,
            // Los m³ del recibo vienen en entero, como en el papel.
            decimales: false,
            sufijo: 'm³',
            onOk: (v) => void guardar('recibo', { aguaM3: v }),
          })
        }
      />

      <CampoNumerico
        etiqueta={COPYS.cierre.campoMonto}
        tono="agua"
        valor={tieneMonto ? fmt(rec.aguaMonto) : null}
        prefijo="S/"
        onTocar={() =>
          abrir({
            etiqueta: COPYS.cierre.campoMontoLargo,
            valorInicial: tieneMonto ? rec.aguaMonto : null,
            decimales: true,
            maxDecimales: 2,
            sufijo: 'S/',
            onOk: (v) => void guardar('recibo', { aguaMonto: v }),
          })
        }
      />

      {tieneM3 && <AvisoBob tono="agua">{compararM3(rec.aguaM3, borrador.mes)}</AvisoBob>}
      {errorGuardar && <p className="tipo-cuerpo-menor text-ambar cierre-error">{errorGuardar}</p>}

      <BotonAvanzar onClick={avanzar} bloqueadoPor={bloqueo} cargando={guardando}>
        Continuar
      </BotonAvanzar>
    </div>
  )
}

/**
 * Lo que Bob dice del consumo del edificio.
 *
 * Siempre con el dato y con dónde verificarlo. Nunca "tu consumo subió" a secas.
 */
function compararM3(m3: number, mes: string): string {
  return `${m3} m³ es lo que llegó en el recibo de ${mes}. Si no coincide con el papel, cámbialo aquí antes de seguir.`
}
