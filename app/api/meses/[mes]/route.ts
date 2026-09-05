import { resultadoDeMes } from '@/lib/datos/mes'
import { pagosDe } from '@/lib/datos/mes'
import { zMes } from '@/lib/esquemas'
import { responder, validarParametro } from '@/lib/servicios/ruta'
import type { MesId } from '@/lib/calculo/tipos'

/** `GET /api/meses/[mes]` · el `ResultadoMes` calculado, con sus pagos. */
export async function GET(_: Request, ctx: { params: Promise<{ mes: string }> }) {
  return responder(async () => {
    const { mes } = await ctx.params
    const mesId = validarParametro(mes, zMes, 'mes') as MesId
    const [resultado, pagos] = await Promise.all([resultadoDeMes(mesId), pagosDe(mesId)])
    return { resultado, pagos }
  })
}
