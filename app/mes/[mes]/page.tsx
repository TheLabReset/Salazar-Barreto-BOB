import { notFound } from 'next/navigation'
import { dptoElegido } from '@/lib/sesion'
import { listaDeMeses } from '@/lib/datos/meses'
import { pagosDe, resultadoDeMes } from '@/lib/datos/mes'
import { mesAnterior } from '@/lib/calculo/mes'
import { zMes } from '@/lib/esquemas'
import { ElMes } from '@/components/pantallas/ElMes'
import { Onboarding } from '@/components/pantallas/Onboarding'
import { SinDatos } from '@/components/pantallas/SinDatos'

export default async function Pagina({ params }: { params: Promise<{ mes: string }> }) {
  const dpto = await dptoElegido()
  if (!dpto) return <Onboarding />

  const { mes } = await params
  // Se estrecha con el resultado del propio parseo, no con un `as` a ciegas: si
  // mañana `zMes` cambia de forma, esto deja de compilar en vez de mentir.
  const parseado = zMes.safeParse(mes)
  if (!parseado.success) notFound()
  const mesId = parseado.data

  const meses = await listaDeMeses()
  const publicados = meses.filter((m) => m.publicado)
  if (!publicados.some((m) => m.mes === mesId)) notFound()

  const [resultado, pagos, anterior] = await Promise.all([
    resultadoDeMes(mesId),
    pagosDe(mesId),
    resultadoDeMes(mesAnterior(mesId)),
  ])
  if (!resultado.valido) return <SinDatos motivo={resultado.motivoInvalido} />

  return (
    <ElMes
      dpto={dpto}
      mes={mesId}
      resultado={resultado}
      anterior={anterior.valido ? anterior : null}
      pagos={pagos}
      meses={publicados}
    />
  )
}
