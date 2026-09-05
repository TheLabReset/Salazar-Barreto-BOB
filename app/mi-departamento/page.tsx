import { dptoElegido } from '@/lib/sesion'
import { mesesPublicados } from '@/lib/datos/meses'
import { pagosDe, resultadoDeMes } from '@/lib/datos/mes'
import { historialDeDpto } from '@/lib/datos/historial'
import { MiDepartamento } from '@/components/pantallas/MiDepartamento'
import { Onboarding } from '@/components/pantallas/Onboarding'
import { SinDatos } from '@/components/pantallas/SinDatos'
import type { MesId } from '@/lib/calculo/tipos'

export default async function Pagina() {
  const dpto = await dptoElegido()
  if (!dpto) return <Onboarding />

  const publicados = await mesesPublicados()
  const mes = publicados[publicados.length - 1] as MesId | undefined
  if (!mes) return <SinDatos />

  const [resultado, pagos, historial] = await Promise.all([
    resultadoDeMes(mes),
    pagosDe(mes),
    historialDeDpto(dpto),
  ])
  if (!resultado.valido) return <SinDatos motivo={resultado.motivoInvalido} />

  return <MiDepartamento dpto={dpto} mes={mes} resultado={resultado} pagos={pagos} historial={historial} />
}
