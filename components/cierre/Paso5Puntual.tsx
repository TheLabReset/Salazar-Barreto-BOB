'use client'

import { useState } from 'react'
import { COPYS } from '@/lib/copys'
import { DPTOS } from '@/lib/calculo/constantes'
import { fmt } from '@/lib/calculo/redondeo'
import type { DptoId, Extra } from '@/lib/calculo/tipos'
import { useNumpad } from '@/components/Numpad'
import type { PropsPaso } from './Wizard'
import { BotonAvanzar } from './BotonAvanzar'
import { Fallo } from '@/components/ui/Fallo'

/**
 * Paso 5 · Lo puntual. `04-cierre-del-mes.md`.
 *
 * Dos cosas que no se pueden confundir:
 *
 *  - un **gasto extraordinario** se suma al total y lo pagan los siete por flat;
 *  - un **crédito** se resta de la cuota de un departamento y **sale del saldo
 *    de la cuenta**, no del bolsillo de los demás.
 *
 * Y dos requisitos que salieron de corregir el diseño:
 *
 *  - **Lo que se añade aparece listado debajo del botón**, con su monto y quién
 *    lo paga. Antes se seleccionaba y no pasaba nada visible.
 *  - **La reasignación del lavado es una casilla, no un campo.** Viene marcada si
 *    estuvo activa el mes anterior, y el valor en m³ sigue lo configurado en el
 *    panel: no es un número que se escriba aquí a mano.
 */
export function Paso5Puntual({ borrador, guardar, guardando, errorGuardar, avanzar }: PropsPaso) {
  const { abrir } = useNumpad()
  const [extras, setExtras] = useState<Extra[]>(() => extrasDelMes(borrador))
  const [eligiendoDpto, setEligiendoDpto] = useState<number | null>(null)
  const [configurando, setConfigurando] = useState<number | null>(null)
  const IDS = DPTOS.map((d) => d.id)

  /** Los participantes actuales de un gasto: los que tenga, o los siete. */
  const participantesDe = (e: Extra): DptoId[] =>
    e.tipo === 'gasto' && e.participantes && e.participantes.length ? [...e.participantes] : IDS

  const guardarExtras = (lista: Extra[]) => {
    setExtras(lista)
    void guardar('gastos', { extras: lista })
  }

  const anadirGasto = () =>
    abrir({
      etiqueta: COPYS.cierre.montoGasto,
      decimales: true,
      maxDecimales: 2,
      sufijo: 'S/',
      onOk: (monto) => guardarExtras([...extras, { tipo: 'gasto', concepto: 'Gasto extraordinario', monto }]),
    })

  const anadirCredito = () =>
    abrir({
      etiqueta: COPYS.cierre.montoCredito,
      decimales: true,
      maxDecimales: 2,
      sufijo: 'S/',
      onOk: (monto) => {
        // Un crédito sin departamento se evapora: no se le resta a nadie y el
        // mes cuadra igual. Por eso se pide el departamento antes de guardarlo.
        setExtras((antes) => [...antes, { tipo: 'credito', concepto: 'Crédito', monto, dpto: '101' }])
        setEligiendoDpto(extras.length)
      },
    })

  const asignarDpto = (indice: number, dpto: DptoId) => {
    const lista = extras.map((e, i) => (i === indice && e.tipo === 'credito' ? { ...e, dpto } : e))
    setEligiendoDpto(null)
    guardarExtras(lista)
  }

  const quitar = (indice: number) => guardarExtras(extras.filter((_, i) => i !== indice))

  const cambiarReparto = (indice: number, reparto: 'flat' | 'igual') =>
    guardarExtras(extras.map((e, i) => (i === indice && e.tipo === 'gasto' ? { ...e, reparto } : e)))

  /** Saca o vuelve a poner un departamento. Nunca deja la lista vacía. */
  const alternarParticipante = (indice: number, dpto: DptoId) =>
    guardarExtras(
      extras.map((e, i) => {
        if (i !== indice || e.tipo !== 'gasto') return e
        const actuales = participantesDe(e)
        const nuevos = actuales.includes(dpto)
          ? actuales.filter((x) => x !== dpto)
          : [...actuales, dpto]
        if (nuevos.length === 0) return e // no se puede dejar sin nadie
        // Si vuelven a estar los siete, se guarda vacío: «todos» es el defecto.
        return { ...e, participantes: nuevos.length === IDS.length ? [] : nuevos }
      }),
    )

  const lavado = borrador.lavado
  const enConfig = configurando !== null ? extras[configurando] : undefined

  return (
    <div className="cierre-cuerpo">
      <h2 className="tipo-titulo-hoja cierre-titulo">{COPYS.cierre.puntualTitulo}</h2>
      <p className="tipo-cuerpo-chico text-gris cierre-intro">{COPYS.cierre.puntualIntro}</p>

      <button type="button" onClick={anadirGasto} className="puntual-boton">
        <span className="tipo-cuerpo-lista block">+ {COPYS.cierre.anadirGasto}</span>
        <span className="tipo-contexto-chico block text-gris puntual-boton-ejemplo">
          {COPYS.cierre.anadirGastoEjemplo}
        </span>
      </button>
      <button type="button" onClick={anadirCredito} className="puntual-boton">
        <span className="tipo-cuerpo-lista block">+ {COPYS.cierre.anadirCredito}</span>
        <span className="tipo-contexto-chico block text-gris puntual-boton-ejemplo">
          {COPYS.cierre.anadirCreditoEjemplo}
        </span>
      </button>

      {extras.length > 0 && (
        <>
          <p className="tipo-etiqueta-seccion text-gris puntual-etiqueta">
            {COPYS.cierre.anadidos(extras.length)}
          </p>
          {extras.map((e, i) => {
            const parts = participantesDe(e)
            const sin = e.tipo === 'gasto' ? IDS.filter((id) => !parts.includes(id)) : []
            return (
              <div key={i} className="puntual-anadido">
                <span className="min-w-0 flex-1">
                  <span className="tipo-cuerpo-lista block truncate">{e.concepto}</span>
                  <span className="tipo-contexto-chico block text-gris puntual-quien">
                    {e.tipo === 'gasto'
                      ? COPYS.cierre.comoSeReparte(e.reparto ?? 'flat', parts.length, sin)
                      : COPYS.cierre.aFavorDe(e.dpto)}
                  </span>
                  {e.tipo === 'gasto' && (
                    <button
                      type="button"
                      onClick={() => setConfigurando(configurando === i ? null : i)}
                      className="tipo-contexto-chico puntual-cambiar-reparto"
                    >
                      {COPYS.cierre.cambiarReparto}
                    </button>
                  )}
                </span>
                <span className="tipo-monto-lista">{fmt(e.monto)}</span>
                <button type="button" onClick={() => quitar(i)} className="puntual-quitar" aria-label="Quitar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 5l14 14M19 5 5 19" />
                  </svg>
                </button>
              </div>
            )
          })}
        </>
      )}

      {eligiendoDpto !== null && (
        <div className="puntual-elegir">
          <p className="tipo-cuerpo-destacado-medio puntual-elegir-titulo">¿A favor de quién?</p>
          <div className="puntual-dptos">
            {DPTOS.map((d) => (
              <button key={d.id} type="button" onClick={() => asignarDpto(eligiendoDpto, d.id)} className="puntual-dpto">
                {d.id}
              </button>
            ))}
          </div>
        </div>
      )}

      {enConfig && enConfig.tipo === 'gasto' && configurando !== null && (
        <div className="puntual-elegir">
          <p className="tipo-cuerpo-destacado-medio puntual-elegir-titulo">{COPYS.cierre.repartoTitulo}</p>
          <div className="puntual-modos">
            {(['flat', 'igual'] as const).map((modo) => (
              <button
                key={modo}
                type="button"
                onClick={() => cambiarReparto(configurando, modo)}
                aria-pressed={(enConfig.reparto ?? 'flat') === modo}
                className="puntual-modo"
              >
                {modo === 'flat' ? COPYS.cierre.repartoPorMetraje : COPYS.cierre.repartoIgual}
              </button>
            ))}
          </div>
          <p className="tipo-etiqueta-seccion text-gris puntual-etiqueta">{COPYS.cierre.quienesPagan}</p>
          <p className="tipo-contexto-chico text-gris">{COPYS.cierre.quienesPaganPista}</p>
          <div className="puntual-dptos">
            {DPTOS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => alternarParticipante(configurando, d.id)}
                aria-pressed={participantesDe(enConfig).includes(d.id)}
                className="puntual-dpto"
              >
                {d.id}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setConfigurando(null)} className="puntual-modo puntual-listo">
            {COPYS.cierre.repartoListo}
          </button>
        </div>
      )}

      {lavado && (
        <>
          <p className="tipo-etiqueta-seccion text-gris puntual-etiqueta">{COPYS.cierre.reasignaciones}</p>
          <label className="casilla-fila">
            <input
              type="checkbox"
              checked={lavado.activo}
              onChange={(e) => void guardar('reasignaciones', { activa: e.target.checked })}
              className="casilla"
            />
            <span className="min-w-0 flex-1">
              <span className="tipo-cuerpo-lista block">
                {lavado.dpto} · {lavado.concepto}
              </span>
              <span className="tipo-contexto-chico block text-gris puntual-quien">
                {!lavado.activo
                  ? COPYS.cierre.lavadoInactivo
                  : lavado.aplicado
                    ? COPYS.cierre.lavadoActivo
                    : COPYS.cierre.lavadoNoAplicado}
              </span>
            </span>
            {/* El valor sigue lo configurado en el panel, no se escribe aquí. */}
            <span className="tipo-monto-lista">{fmt(lavado.m3)} m³</span>
          </label>
        </>
      )}

      {errorGuardar && <Fallo>{errorGuardar}</Fallo>}

      <BotonAvanzar onClick={avanzar} cargando={guardando}>
        {extras.length > 0 ? 'Continuar' : COPYS.cierre.nadaMas}
      </BotonAvanzar>
    </div>
  )
}

/** Los extras que ya están guardados, leídos del resultado del borrador. */
function extrasDelMes(borrador: PropsPaso['borrador']): Extra[] {
  return borrador.resultado.gastos
    .filter((g) => g.extra)
    .map((g): Extra => ({
      tipo: 'gasto',
      concepto: g.concepto,
      monto: g.monto ?? 0,
      ...(g.reparto ? { reparto: g.reparto } : {}),
      ...(g.participantes && g.participantes.length ? { participantes: [...g.participantes] } : {}),
    }))
}
