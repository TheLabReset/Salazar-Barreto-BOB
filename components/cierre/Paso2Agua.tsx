'use client'

import { useState } from 'react'
import { COPYS } from '@/lib/copys'
import { DPTOS } from '@/lib/calculo/constantes'
import { revisarLecturas } from '@/lib/calculo/correccion'
import { fmt } from '@/lib/calculo/redondeo'
import { useNumpad } from '@/components/Numpad'
import type { PropsPaso } from './Wizard'
import { BotonAvanzar } from './BotonAvanzar'
import { AvisoBob } from './AvisoBob'
import { CampoNumerico } from './CampoNumerico'
import { PropuestaCorreccion } from './PropuestaCorreccion'

/** Los siete ids, en el orden del edificio. */
const IDS = DPTOS.map((d) => d.id)

/**
 * Paso 2 · La factura de agua. `04-cierre-del-mes.md`.
 *
 * Las etiquetas dicen **de qué** es el consumo y **de qué** es la factura —nunca
 * "consumo" a secas—, porque el administrador tiene delante dos recibos y dos
 * cifras que se parecen.
 *
 * Aquí sale también la **corrección de tecleo** de `04` § *Corrección de tecleo*,
 * aunque el documento la dibuje en el paso 1. No es una licencia: la regla de
 * `01` §8 descarta candidatas comparando contra los m³ que facturó SEDAPAL y
 * contra la suma de los otros seis medidores, y en el paso 1 todavía no hay
 * recibo. Preguntada allí, `objetivoM3` vale 0, ninguna candidata sobrevive y la
 * propuesta no aparece nunca —medido: cero en 11.329 lecturas—. El primer
 * instante del cierre en que la regla se puede evaluar es este, en cuanto se
 * escriben los m³. El paso 1 la conserva para cuando se vuelve a editar una
 * lectura con el recibo ya puesto.
 */
export function Paso2Agua({ borrador, guardar, guardando, errorGuardar, avanzar }: PropsPaso) {
  const { abrir } = useNumpad()
  const rec = borrador.resultado.rec
  const tieneM3 = rec.aguaM3 > 0
  const tieneMonto = rec.aguaMonto > 0

  /**
   * Las propuestas que el administrador ya descartó, en esta visita al paso.
   *
   * No se guardan en el servidor a propósito: la lectura sospechosa sigue
   * siéndolo, y si se vuelve a este paso con el mismo recibo delante, la
   * pregunta vuelve a ser pertinente. Callarla para siempre porque una vez se
   * dijo "lo dejo así" es esconder un dato que aún no cuadra.
   */
  const [descartadas, setDescartadas] = useState<readonly string[]>([])

  const sospecha = revisarLecturas(
    borrador.lecturas,
    borrador.lecturasAnteriores,
    borrador.promedios,
    rec.aguaM3,
    IDS,
  )
  const propuesta =
    sospecha && !descartadas.includes(`${sospecha.dpto}:${sospecha.tecleado}`) ? sospecha : null

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

      {propuesta && (
        <PropuestaCorreccion
          propuesta={propuesta}
          aceptar={() =>
            void guardar('lecturas', { lecturas: { [propuesta.dpto]: propuesta.valor } })
          }
          mantener={() =>
            setDescartadas((d) => [...d, `${propuesta.dpto}:${propuesta.tecleado}`])
          }
          ocupado={guardando}
        />
      )}

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
