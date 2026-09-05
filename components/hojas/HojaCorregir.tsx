'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { COPYS } from '@/lib/copys'
import { DPTOS } from '@/lib/calculo/constantes'
import { etiquetaMes, nombreMes } from '@/lib/calculo/mes'
import { fmt, fmt3 } from '@/lib/calculo/redondeo'
import type { DptoId, MesId, ResultadoMes } from '@/lib/calculo/tipos'
import { useNumpad } from '@/components/Numpad'
import { Hoja } from './Hoja'
import { useHoja } from './Hojas'

/**
 * Corregir un mes ya publicado. `04-cierre-del-mes.md`.
 *
 * **No hay correcciones silenciosas.** Es la contrapartida de permitir editar:
 * al guardar se recalculan las cuotas, se genera un aviso a los siete diciendo
 * qué cambió y de cuánto a cuánto, y queda en el registro de auditoría.
 *
 * Por eso el motivo es obligatorio: lo van a leer los siete.
 */
export function HojaCorregir({ mes }: { mes: MesId }) {
  const { cerrar } = useHoja()
  const { abrir } = useNumpad()
  const router = useRouter()
  const [cambios, setCambios] = useState<Partial<Record<DptoId, number>>>({})
  const [motivo, setMotivo] = useState('')
  const [hecho, setHecho] = useState<string | null>(null)

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['mes', mes],
    queryFn: async (): Promise<{ resultado: ResultadoMes; version: number }> => {
      const r = await fetch(`/api/meses/${mes}`)
      if (!r.ok) throw new Error('No se pudo cargar el mes')
      return r.json()
    },
  })

  const corregir = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/meses/${mes}/corregir`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lecturas: cambios, motivo, version: data?.version ?? 0 }),
      })
      const cuerpo = await r.json()
      if (!r.ok) throw new Error(cuerpo.error ?? 'No se pudo corregir')
      return cuerpo as { cuotasQueCambiaron: number }
    },
    onSuccess: (d) => {
      setHecho(
        d.cuotasQueCambiaron === 0
          ? 'Ninguna cuota cambió de monto, pero el cambio queda registrado y avisado.'
          : `Cambiaron ${d.cuotasQueCambiaron} ${d.cuotasQueCambiaron === 1 ? 'cuota' : 'cuotas'}. Los siete ya tienen el aviso.`,
      )
      router.refresh()
    },
  })

  const c = data?.resultado

  /**
   * Si el mes no se pudo traer, se dice **por qué** y no se le echa la culpa a
   * quien mira.
   *
   * Las siete filas de lecturas están detrás de `c?.valido &&`; la etiqueta «Las
   * lecturas de este mes» y el botón no lo estaban. Con la consulta caída se
   * veía el título, la promesa de que las lecturas estaban ahí abajo, un hueco,
   * y un botón mandando «Cambia algo para poder corregir» sobre una lista vacía.
   */
  const noSePudo = isError || (!isPending && !c)

  const bloqueo =
    Object.keys(cambios).length === 0
      ? COPYS.correccion.sinCambios
      : motivo.trim().length === 0
        ? COPYS.correccion.sinMotivo
        : null

  if (hecho) {
    return (
      <Hoja titulo={COPYS.correccion.hecho} altura="alta">
        <div className="cierre-cuerpo publicado">
          <h2 className="tipo-titulo-hoja publicado-titulo">{COPYS.correccion.hecho}</h2>
          <p className="tipo-cuerpo-chico text-gris publicado-texto">{hecho}</p>
          <button type="button" onClick={cerrar} className="cierre-boton">
            {COPYS.cierre.volverAlPanel}
          </button>
        </div>
      </Hoja>
    )
  }

  if (noSePudo) {
    return (
      <Hoja titulo={COPYS.correccion.titulo(etiquetaMes(mes))} altura="alta">
        <div className="hoja-cuerpo">
          <h2 className="tipo-titulo-hoja cierre-titulo">
            {COPYS.correccion.titulo(etiquetaMes(mes))}
          </h2>
          <p className="tipo-cuerpo-menor text-ambar">
            {(error as Error | null)?.message ?? COPYS.error.lecturasDelMes(nombreMes(mes))}
          </p>
          <button type="button" onClick={() => void refetch()} className="cierre-boton">
            {COPYS.error.reintentar}
          </button>
        </div>
      </Hoja>
    )
  }

  return (
    <Hoja titulo={COPYS.correccion.titulo(etiquetaMes(mes))} altura="alta">
      <div className="hoja-cuerpo">
        <h2 className="tipo-titulo-hoja cierre-titulo">{COPYS.correccion.titulo(etiquetaMes(mes))}</h2>
        <p className="tipo-cuerpo-chico text-gris cierre-intro">{COPYS.correccion.intro}</p>

        <p className="tipo-etiqueta-seccion text-gris revision-etiqueta">{COPYS.correccion.lecturas}</p>
        {isPending && <p className="tipo-cuerpo-menor text-gris">Cargando…</p>}
        {c?.valido &&
          DPTOS.map((d) => {
            const actual = cambios[d.id] ?? c.cuotas[d.id].lecturaActual
            const cambiada = cambios[d.id] !== undefined
            return (
              <button
                key={d.id}
                type="button"
                onClick={() =>
                  abrir({
                    etiqueta: `Lectura del ${d.id} · anterior ${fmt3(c.cuotas[d.id].lecturaAnterior)}`,
                    valorInicial: actual,
                    decimales: true,
                    maxDecimales: 3,
                    sufijo: null,
                    /**
                     * Solo cuenta como cambio si de verdad cambia. Guardar el
                     * valor tal cual venía desbloqueaba el botón —"Guardar la
                     * corrección y avisar"— sobre una corrección vacía, y el
                     * servidor la rechazaba con un 400 que el administrador
                     * leía como que la app se rompió.
                     */
                    onOk: (v) =>
                      setCambios((previos) => {
                        const original = c.cuotas[d.id].lecturaActual
                        const { [d.id]: _fuera, ...resto } = previos
                        return v === original ? resto : { ...resto, [d.id]: v }
                      }),
                  })
                }
                className="lectura-fila"
              >
                <span className="min-w-0 flex-1 text-left">
                  <span className="tipo-cuerpo-lista block">
                    {d.id} <span className="text-gris">{d.nombre}</span>
                  </span>
                  <span className="tipo-contexto-chico block text-gris lectura-anterior">
                    cuota actual S/ {fmt(c.cuotas[d.id].total)}
                  </span>
                </span>
                <span className={`tipo-lectura ${cambiada ? 'text-terra' : ''}`}>{fmt3(actual)}</span>
              </button>
            )
          })}

        <div className="nota-campo correccion-motivo">
          <label htmlFor="motivo-correccion" className="tipo-etiqueta-pequena text-gris nota-etiqueta">
            {COPYS.correccion.motivo}
          </label>
          <textarea
            id="motivo-correccion"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            maxLength={500}
            className="nota-texto tipo-cuerpo-chico"
          />
          <p className="tipo-contexto text-gris correccion-ayuda">{COPYS.correccion.motivoAyuda}</p>
        </div>

        {corregir.isError && (
          <p className="tipo-cuerpo-menor text-ambar cierre-error">{(corregir.error as Error).message}</p>
        )}

        <button
          type="button"
          onClick={bloqueo ? undefined : () => corregir.mutate()}
          aria-disabled={Boolean(bloqueo) || corregir.isPending}
          className={bloqueo ? 'cierre-boton cierre-boton-bloqueado' : 'cierre-boton'}
        >
          {corregir.isPending ? 'Guardando…' : (bloqueo ?? COPYS.correccion.guardar)}
        </button>
      </div>
    </Hoja>
  )
}
