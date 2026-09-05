import { dptoElegido } from '@/lib/sesion'
import { listaDeMeses, serieDelSaldo } from '@/lib/datos/meses'
import { resultadoDeMes } from '@/lib/datos/mes'
import { Historial } from '@/components/pantallas/Historial'
import { Onboarding } from '@/components/pantallas/Onboarding'
import { SinDatos } from '@/components/pantallas/SinDatos'
import type { MesId } from '@/lib/calculo/tipos'

export default async function Pagina() {
  const dpto = await dptoElegido()
  if (!dpto) return <Onboarding />

  const [meses, serie] = await Promise.all([listaDeMeses(), serieDelSaldo()])
  const publicados = meses.filter((m) => m.publicado)
  if (publicados.length === 0) return <SinDatos />

  const m3PorMes = await Promise.all(
    publicados.map(async (m) => {
      const r = await resultadoDeMes(m.mes)
      return { mes: m.mes, corto: m.corto, m3: r.valido ? r.rec.aguaM3 : 0 }
    }),
  )

  return (
    <Historial
      dpto={dpto}
      mes={(publicados[publicados.length - 1]?.mes ?? null) as MesId | null}
      serie={serie.filter((f) => publicados.some((m) => m.mes === f.mes))}
      meses={publicados}
      m3PorMes={m3PorMes}
    />
  )
}
