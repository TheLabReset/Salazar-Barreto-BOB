import { z } from 'zod'
import { guardarGastosFijos } from '@/lib/servicios/gastosFijos'
import { zMes, zMonto, zTexto } from '@/lib/esquemas'
import { exigirAdmin, leerCuerpo, responder, validarParametro } from '@/lib/servicios/ruta'
import type { MesId } from '@/lib/calculo/tipos'

const zUno = z.object({
  concepto: zTexto(80).min(1),
  monto: zMonto.nullable(),
})

/**
 * `PUT /api/meses/[mes]/gastos-fijos` · editar un concepto desde el paso 4.
 *
 * Aplica **desde ese mes**, no reescribe el pasado: subir el ascensor en agosto
 * no puede cambiar las cuotas de enero, que ya se cobraron.
 */
export async function PUT(peticion: Request, ctx: { params: Promise<{ mes: string }> }) {
  return responder(async () => {
    await exigirAdmin()
    const { mes } = await ctx.params
    const mesId = validarParametro(mes, zMes, 'mes') as MesId
    const cambio = await leerCuerpo(peticion, zUno)
    return guardarGastosFijos({ cambios: [cambio], vigenteDesde: mesId })
  })
}
