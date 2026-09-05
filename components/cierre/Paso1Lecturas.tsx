'use client'

import { useState } from 'react'
import { COPYS } from '@/lib/copys'
import { DPTOS } from '@/lib/calculo/constantes'
import { fmt, fmt3 } from '@/lib/calculo/redondeo'
import { proponerCorreccion } from '@/lib/calculo/correccion'
import { round2 } from '@/lib/calculo/redondeo'
import type { DptoId } from '@/lib/calculo/tipos'
import { useNumpad } from '@/components/Numpad'
import type { PropsPaso } from './Wizard'
import { BotonAvanzar } from './BotonAvanzar'
import { AvisoBob } from './AvisoBob'

/**
 * Paso 1 · Las lecturas. **El paso más delicado.** `04-cierre-del-mes.md`.
 *
 * Siete medidores, siete números de tres decimales. Al lado, la del mes pasado.
 * El consumo se calcula al vuelo; si supera el doble del promedio se pinta en
 * ámbar y avisa, **pero no bloquea**: el que decide es el administrador.
 *
 * La corrección de tecleo **nunca corrige sola**: propone con dos botones, y solo
 * si existe exactamente una candidata válida. Con dos o más se calla, porque
 * proponer la equivocada es peor que no proponer (`01` §8).
 */
export function Paso1Lecturas({ borrador, guardar, guardando, errorGuardar, avanzar }: PropsPaso) {
  const { abrir } = useNumpad()
  const [propuesta, setPropuesta] = useState<{
    dpto: DptoId
    tecleado: number
    valor: number
    consumo: number
  } | null>(null)

  const anteriores = borrador.lecturasAnteriores
  /**
   * Las lecturas guardadas de este mes, leídas directamente del borrador.
   *
   * No se derivan del `ResultadoMes`: al empezar el cierre no hay recibo, el mes
   * sale inválido por eso, y `dptosSinLectura` viene vacío aunque no haya ni una
   * lectura. Con esa vía el contador abría en "7 / 7" sobre un mes en blanco.
   */
  const escritas = borrador.lecturas
  const hechas = DPTOS.filter((d) => escritas[d.id] !== undefined).length

  const escribir = (dpto: DptoId) => {
    const anterior = anteriores[dpto]
    abrir({
      etiqueta:
        anterior === undefined
          ? `Lectura del ${dpto}`
          : `Lectura del ${dpto} · ${COPYS.cierre.anterior(fmt3(anterior))}`,
      valorInicial: escritas[dpto] ?? null,
      decimales: true,
      maxDecimales: 3,
      sufijo: null,
      onOk: (valor) => {
        // Antes de guardar, ¿parece un error de tecleo con una única corrección?
        const otros = DPTOS.filter((d) => d.id !== dpto).reduce((s, d) => {
          const escrita = escritas[d.id]
          const anterior = anteriores[d.id]
          if (escrita === undefined || anterior === undefined) return s
          return s + round2(escrita - anterior)
        }, 0)
        const candidata = proponerCorreccion(
          valor,
          anterior ?? 0,
          borrador.promedios[dpto] ?? 0,
          borrador.resultado.rec.aguaM3 || 0,
          round2(otros),
        )
        if (candidata && candidata.valor !== valor) {
          setPropuesta({ dpto, tecleado: valor, valor: candidata.valor, consumo: candidata.consumo })
          return
        }
        void guardar('lecturas', { lecturas: { [dpto]: valor } })
      },
    })
  }

  const aceptarPropuesta = () => {
    if (!propuesta) return
    void guardar('lecturas', { lecturas: { [propuesta.dpto]: propuesta.valor } })
    setPropuesta(null)
  }

  const mantenerTecleado = () => {
    if (!propuesta) return
    void guardar('lecturas', { lecturas: { [propuesta.dpto]: propuesta.tecleado } })
    setPropuesta(null)
  }

  const bloqueo =
    hechas === 7 ? null : hechas === 6 ? COPYS.cierre.faltaUna : COPYS.cierre.faltanVarias(7 - hechas)

  return (
    <div className="cierre-cuerpo">
      <div className="flex items-start justify-between gap-fila-x cierre-titulo-fila">
        <div className="min-w-0">
          <h2 className="tipo-titulo-hoja cierre-titulo">{COPYS.cierre.lecturasTitulo}</h2>
          <p className="tipo-cuerpo-chico text-gris cierre-intro">{COPYS.cierre.lecturasIntro}</p>
        </div>
        <span className="cierre-contador">{COPYS.cierre.contador(hechas)}</span>
      </div>

      {propuesta && (
        <div className="cierre-correccion">
          <AvisoBob>
            {`¿Será ${fmt3(propuesta.valor)}? Con ${fmt3(propuesta.tecleado)} el consumo no cuadra con el resto de medidores ni con lo que facturó SEDAPAL.`}
          </AvisoBob>
          <div className="flex gap-acciones cierre-correccion-botones">
            <button type="button" onClick={aceptarPropuesta} className="cierre-correccion-si">
              Sí, es {fmt3(propuesta.valor)}
            </button>
            <button type="button" onClick={mantenerTecleado} className="cierre-correccion-no">
              No, lo dejo así
            </button>
          </div>
        </div>
      )}

      {DPTOS.map((d) => {
        const anterior = anteriores[d.id]
        const escrita = escritas[d.id] ?? null
        const consumo = escrita !== null && anterior !== undefined ? round2(escrita - anterior) : null
        const promedio = borrador.promedios[d.id] ?? 0
        const alto = consumo !== null && promedio > 0 && consumo > promedio * 2
        return (
          <button key={d.id} type="button" onClick={() => escribir(d.id)} className="lectura-fila">
            <span className="min-w-0 flex-1 text-left">
              <span className="tipo-cuerpo-lista block">
                {d.id} <span className="text-gris">{d.nombre}</span>
              </span>
              <span className="tipo-contexto-chico block text-gris lectura-anterior">
                {anterior === undefined ? '—' : COPYS.cierre.anterior(fmt3(anterior))}
              </span>
            </span>
            <span className="text-right">
              <span className={`tipo-lectura block ${escrita === null ? 'text-apagado' : ''}`}>
                {escrita === null ? '000.000' : fmt3(escrita)}
              </span>
              <span className={`tipo-mono-etiqueta block lectura-consumo ${alto ? 'text-ambar' : 'text-agua'}`}>
                {consumo === null ? COPYS.cierre.escribirLectura : COPYS.cierre.consumo(fmt(consumo))}
              </span>
            </span>
          </button>
        )
      })}

      {DPTOS.filter((d) => {
        const anterior = anteriores[d.id]
        const escrita = escritas[d.id] ?? null
        const consumo = escrita !== null && anterior !== undefined ? round2(escrita - anterior) : null
        const promedio = borrador.promedios[d.id] ?? 0
        return consumo !== null && promedio > 0 && consumo > promedio * 2
      }).map((d) => (
        <AvisoBob key={d.id}>{COPYS.cierre.consumoAlto(d.id)}</AvisoBob>
      ))}

      {errorGuardar && <p className="tipo-cuerpo-menor text-ambar cierre-error">{errorGuardar}</p>}

      <BotonAvanzar onClick={avanzar} bloqueadoPor={bloqueo} cargando={guardando}>
        Continuar
      </BotonAvanzar>
    </div>
  )
}
