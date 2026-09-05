'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { fmt } from '@/lib/calculo/redondeo'
import { etiquetaMes } from '@/lib/calculo/mes'
import type { MesId } from '@/lib/calculo/tipos'
import { useNumpad } from '@/components/Numpad'
import { Hoja } from './Hoja'

/**
 * `cargos` · Cargos y créditos activos. `04-cierre-del-mes.md`.
 *
 * Lo que se aplica todos los meses hasta que alguien lo cambie. Hoy solo hay uno:
 * el lavado del 401.
 *
 * Los gastos puntuales de un solo mes **no** están aquí: se añaden en el paso 5
 * del cierre, y son otra cosa.
 */
export function HojaCargos({
  lavado,
}: {
  lavado: { dpto: string; concepto: string; m3: number; desde: string } | null
}) {
  const { abrir } = useNumpad()
  const router = useRouter()

  const cambiar = useMutation({
    mutationFn: async (m3: number) => {
      const r = await fetch('/api/reasignaciones', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ m3 }),
      })
      const cuerpo = await r.json()
      if (!r.ok) throw new Error(cuerpo.error ?? 'No se pudo guardar')
      return cuerpo
    },
    onSuccess: () => router.refresh(),
  })

  return (
    <Hoja titulo="Cargos y créditos activos">
      <div className="hoja-cuerpo">
        <h2 className="tipo-titulo-hoja pagar-titulo">Cargos y créditos activos</h2>
        <p className="tipo-cuerpo-chico text-gris pagar-intro">
          Lo que se aplica todos los meses hasta que alguien lo cambie.
        </p>

        {lavado ? (
          <div className="pagar-nota">
            <div className="midpto-lavado-cabecera flex items-center justify-between">
              <span className="tipo-etiqueta-pequena text-agua min-w-0 flex-1 truncate">
                {lavado.dpto} · {lavado.concepto}
              </span>
              <span className="tipo-monto-lista shrink-0">{fmt(lavado.m3)} m³</span>
            </div>
            <p className="tipo-cuerpo-menor text-gris midpto-lavado-texto">
              Sale del caño común, así que se resta del área común y se le suma al {lavado.dpto}. Activo desde{' '}
              {etiquetaMes(lavado.desde as MesId)}.
            </p>
            {cambiar.isError && (
              <p className="tipo-cuerpo-menor text-ambar pagar-error">{(cambiar.error as Error).message}</p>
            )}
            <button
              type="button"
              onClick={() =>
                abrir({
                  etiqueta: `Consumo mensual del ${lavado.concepto} · ${lavado.dpto}`,
                  valorInicial: lavado.m3,
                  decimales: true,
                  maxDecimales: 2,
                  sufijo: 'm³',
                  onOk: (m3) => cambiar.mutate(m3),
                })
              }
              className="admin-pago-boton"
            >
              Cambiar el consumo
            </button>
          </div>
        ) : (
          <p className="tipo-cuerpo-menor text-gris">No hay ninguna reasignación configurada.</p>
        )}

        <p className="tipo-cuerpo-menor text-gris cargos-nota">
          No hay otros cargos ni créditos activos. Los gastos puntuales de un solo mes se añaden en el paso 5
          al cerrar el mes.
        </p>
      </div>
    </Hoja>
  )
}
