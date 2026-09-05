import { COPYS } from '@/lib/copys'
import { fmt } from '@/lib/calculo/redondeo'
import { etiquetaMes, nombreMes } from '@/lib/calculo/mes'
import { fechaCorta } from '@/lib/formato'
import { estadoCuota } from '@/lib/estados'
import type { DptoId, MesId, PagosMes, ResultadoMes } from '@/lib/calculo/tipos'
import type { HistorialDpto } from '@/lib/datos/historial'
import { FijarContexto } from '@/components/hojas/Contexto'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Cifra } from '@/components/ui/Cifra'
import { PildoraEstado } from '@/components/ui/PildoraEstado'
import { TarjetaNoche } from '@/components/ui/TarjetaNoche'
import { TarjetaBlanca } from '@/components/ui/TarjetaBlanca'
import { AccionesPago } from './AccionesPago'
import { AbrirHoja } from './AbrirHoja'
import { CambiarDpto } from './CambiarDpto'
import { EnlaceAdmin } from './EnlaceAdmin'

/**
 * P3 · Mi departamento. `03-pantallas.md`.
 *
 * Mi historia: la cuota del mes desglosada, el lavado si me toca, y las dos
 * tarjetas tocables con pagos y consumo.
 */
export function MiDepartamento({
  dpto,
  mes,
  resultado,
  pagos,
  historial,
}: {
  dpto: DptoId
  mes: MesId
  resultado: ResultadoMes
  pagos: PagosMes
  historial: HistorialDpto
}) {
  const mia = resultado.cuotas[dpto]
  const miPago = pagos[dpto] ?? null
  const estado = estadoCuota(miPago)
  const detalle =
    estado === 'sin-registrar'
      ? COPYS.inicio.detalleSinRegistrar
      : estado === 'en-verificacion'
        ? COPYS.inicio.detalleEnVerificacion(fechaCorta(miPago!.fecha))
        : COPYS.inicio.detalleAlDia(fechaCorta(miPago!.fecha), miPago!.op ?? '—')

  const consumos = historial.filas.map((f) => f.m3)
  const maximo = Math.max(...consumos, 0) || 1
  const promedio = historial.promedioM3

  const bobConsumo =
    consumos.length < 3
      ? 'Todavía no tengo suficientes meses para ver un patrón.'
      : mia.m3 > promedio * 1.2
        ? `Es tu mes más alto del año, ${fmt(mia.m3 - promedio)} m³ sobre tu promedio.`
        : mia.m3 < promedio * 0.8
          ? 'Este mes consumiste bastante menos de lo habitual.'
          : 'Tu consumo está estable, cerca de tu promedio de siempre.'

  return (
    <div className="pantalla scroll-limpio con-nav">
      <FijarContexto mes={mes} dpto={dpto} />

      <div className="midpto-cabecera">
        <div className="min-w-0">
          <Etiqueta className="block midpto-etiqueta">
            {COPYS.miDpto.cabecera(historial.nombre, historial.flat)}
          </Etiqueta>
          <h1 className="tipo-titulo-grande whitespace-nowrap">{COPYS.miDpto.titulo(dpto)}</h1>
        </div>
        <CambiarDpto />
      </div>

      <div className="animar-entrada midpto-noche">
        <TarjetaNoche>
          <div className="flex items-center justify-between midpto-noche-cabecera">
            <Etiqueta tono="sobre-noche">{etiquetaMes(mes)}</Etiqueta>
            <PildoraEstado estado={estado} sobreNoche />
          </div>
          <Cifra valor={mia.total} tamano="secundaria" simbolo sobreNoche />
          <p className="tipo-cuerpo-menor text-sobre-noche-contexto midpto-noche-nota">{detalle}</p>
          {estado === 'sin-registrar' && <AccionesPago mes={mes} dpto={dpto} />}
        </TarjetaNoche>
      </div>

      {mia.lavado > 0 && (
        <div className="animar-entrada midpto-lavado-contenedor">
          <TarjetaBlanca tamano="media" className="midpto-lavado">
            <div className="flex items-center justify-between midpto-lavado-cabecera">
              <Etiqueta tono="agua" tamano="pequena">
                {COPYS.miDpto.lavado}
              </Etiqueta>
              <span className="tipo-monto-lista">{fmt(mia.lavado)} m³</span>
            </div>
            <p className="tipo-cuerpo-menor text-gris midpto-lavado-texto">
              {COPYS.miDpto.explicaLavado(mia.lavado)}
            </p>
          </TarjetaBlanca>
        </div>
      )}

      <section className="animar-entrada midpto-historia">
        <Etiqueta className="block midpto-historia-titulo">{COPYS.miDpto.tuHistoria}</Etiqueta>

        <AbrirHoja hoja="pagos" className="midpto-tarjeta">
          <div className="flex items-start justify-between midpto-tarjeta-cabecera">
            <div className="min-w-0">
              <Etiqueta tamano="pequena" className="block midpto-tarjeta-etiqueta">
                {COPYS.miDpto.historialPagos}
              </Etiqueta>
              <Cifra valor={historial.totalPagado} tamano="tarjeta-media" simbolo />
              <p className="tipo-contexto text-gris midpto-tarjeta-nota">
                {COPYS.miDpto.resumenAnual(
                  historial.mesesAlDia,
                  historial.filas.length,
                  historial.mesesEnVerificacion,
                )}
              </p>
            </div>
            <span className="midpto-flecha" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 4h11v11M20 4 4 20" />
              </svg>
            </span>
          </div>
          <div className="flex gap-tira">
            {Array.from({ length: 12 }, (_, i) => {
              const fila = historial.filas[i]
              const clase = !fila
                ? 'bg-neutro-suave'
                : fila.estado === 'confirmado'
                  ? i === historial.filas.length - 1
                    ? 'bg-verde'
                    : 'bg-verde-tira'
                  : fila.estado === 'aviso'
                    ? 'bg-agua'
                    : 'bg-ambar-tira'
              return <span key={i} className={`tira-pago ${clase}`} />
            })}
          </div>
          <div className="flex justify-between midpto-eje">
            <span className="tipo-mono-eje text-gris">{COPYS.miDpto.ejeInicio}</span>
            <span className="tipo-mono-eje text-gris">{COPYS.miDpto.ejeFin}</span>
          </div>
        </AbrirHoja>

        <AbrirHoja hoja="agua" className="midpto-tarjeta">
          <div className="flex items-start justify-between midpto-tarjeta-cabecera">
            <div className="min-w-0">
              <Etiqueta tono="agua" tamano="pequena" className="block midpto-tarjeta-etiqueta">
                {COPYS.miDpto.tuConsumo}
              </Etiqueta>
              <Cifra valor={mia.m3} tamano="tarjeta-media" sufijo="m³" />
              <p className="tipo-contexto text-gris midpto-tarjeta-nota">
                {COPYS.miDpto.notaConsumo(nombreMes(mes), promedio)}
              </p>
            </div>
            <span className="midpto-flecha" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 4h11v11M20 4 4 20" />
              </svg>
            </span>
          </div>
          <div className="flex items-end gap-tira midpto-tira-agua">
            {Array.from({ length: 12 }, (_, i) => {
              const fila = historial.filas[i]
              return (
                <span
                  key={i}
                  className={`tira-agua ${fila ? (i === historial.filas.length - 1 ? 'bg-agua' : 'bg-neutro-barra') : 'bg-neutro-suave'}`}
                  style={{
                    ['--alto-tira' as string]: fila
                      ? `${Math.max(11, (fila.m3 / maximo) * 100)}%`
                      : '9%',
                  }}
                />
              )
            })}
          </div>
          <p className="tipo-cuerpo-menor text-gris midpto-bob">{bobConsumo}</p>
        </AbrirHoja>
      </section>

      <EnlaceAdmin />
    </div>
  )
}
