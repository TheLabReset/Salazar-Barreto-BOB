'use client'

import { useQuery } from '@tanstack/react-query'
import type { DatosAdmin } from '@/lib/datos/admin'
import { Hoja } from './Hoja'
import { HojaCargos } from './HojaCargos'
import { HojaExport } from './HojaExport'

/** Carga lo que necesitan las dos hojas del panel que dependen de la base. */
export function HojaAdminDatos({ modo }: { modo: 'export' | 'cargos' }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin'],
    queryFn: async (): Promise<DatosAdmin> => {
      const r = await fetch('/api/admin/panel')
      if (!r.ok) throw new Error('No se pudo cargar')
      return r.json()
    },
  })

  if (isLoading || !data) {
    return (
      <Hoja titulo={modo === 'export' ? 'Exportar el año' : 'Cargos y créditos'}>
        <div className="hoja-cuerpo">
          <p className="tipo-cuerpo-menor text-gris">Cargando…</p>
        </div>
      </Hoja>
    )
  }
  return modo === 'export' ? <HojaExport anios={data.anios} /> : <HojaCargos lavado={data.lavado} />
}
