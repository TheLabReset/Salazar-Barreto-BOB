'use client'

import { COPYS } from '@/lib/copys'
import { DPTOS } from '@/lib/calculo/constantes'
import { fmt } from '@/lib/calculo/redondeo'
import type { PropsPaso } from './Wizard'
import { BotonAvanzar } from './BotonAvanzar'

/**
 * Paso 6 · La revisión. **El paso que impide publicar algo mal.**
 * `04-cierre-del-mes.md`.
 *
 * No pide datos: los enseña ya calculados. Y distingue dos cosas que se parecen
 * y no son lo mismo:
 *
 *  - **El cuadre**, que si falla **bloquea la publicación**. Es la última red de
 *    seguridad.
 *  - **Los avisos de atención** —exceso de m³, área común anormal, una lectura
 *    rara—, que **no bloquean**: se muestran y el administrador decide.
 */
export function Paso6Revision({ borrador, guardando, avanzar, nombreMes }: PropsPaso) {
  const c = borrador.resultado

  if (!c.valido) {
    return (
      <div className="cierre-cuerpo">
        <h2 className="tipo-titulo-hoja cierre-titulo">{COPYS.cierre.revisionTitulo(nombreMes)}</h2>
        <div className="cuadre cuadre-falla">
          <p className="tipo-cuerpo-destacado-medio cuadre-titulo">Todavía falta un dato</p>
          <p className="tipo-cuerpo-menor cuadre-texto">{c.motivoInvalido}</p>
        </div>
        <BotonAvanzar onClick={avanzar} bloqueadoPor={COPYS.cierre.revisaLecturas}>
          Continuar
        </BotonAvanzar>
      </div>
    )
  }

  const exceso = c.ajustado ? Math.round((c.sumaMedida - c.rec.aguaM3) * 100) / 100 : 0
  const pctExceso = c.rec.aguaM3 > 0 ? ((exceso / c.rec.aguaM3) * 100).toFixed(1) : '0'
  const pctComun = c.rec.aguaM3 > 0 ? ((c.comunReal / c.rec.aguaM3) * 100).toFixed(1) : '0'
  const comunAnormal = !c.ajustado && Number(pctComun) > 5

  const bloqueo = c.cuadra ? null : COPYS.cierre.revisaFactura

  return (
    <div className="cierre-cuerpo">
      <h2 className="tipo-titulo-hoja cierre-titulo">{COPYS.cierre.revisionTitulo(nombreMes)}</h2>
      <p className="tipo-cuerpo-chico text-gris cierre-intro">{COPYS.cierre.revisionIntro}</p>

      {/* El cuadre. Si falla, el botón de publicar queda bloqueado. */}
      <div className={c.cuadra ? 'cuadre' : 'cuadre cuadre-falla'}>
        <p className="tipo-cuerpo-destacado-medio cuadre-titulo">
          {c.cuadra
            ? c.ajustado
              ? COPYS.cierre.cuadraAjustado
              : COPYS.cierre.cuadraExacto
            : COPYS.cierre.noCuadra}
        </p>
        <p className="tipo-cuerpo-menor cuadre-texto">
          {c.cuadra
            ? COPYS.cierre.cuadraTexto
            : c.motivosSanidad.length > 0
              ? c.motivosSanidad[0]
              : `Las tres líneas no suman el total: faltan S/ ${fmt(Math.abs(c.sumaCuotas + c.montoComun + c.totalCreditos - c.totalMes))}. Revisa antes de publicar.`}
        </p>
        {!c.cuadra && c.motivosSanidad.length > 1 && (
          <ul className="cuadre-motivos">
            {c.motivosSanidad.slice(1).map((m) => (
              <li key={m} className="tipo-cuerpo-menor">
                {m}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Avisos de atención: se muestran, no bloquean. */}
      {c.ajustado && exceso > 0 && (
        <div className="atencion">
          <p className="tipo-cuerpo-menor">
            Los medidores suman {fmt(c.sumaMedida)} m³ y SEDAPAL facturó {c.rec.aguaM3}. Sobran{' '}
            {fmt(exceso)} m³, un {pctExceso}% de la factura.
          </p>
          <p className="tipo-contexto text-gris atencion-nota">
            Cuando SEDAPAL lee unos días antes que nosotros la diferencia suele ser de 3 a 5%. Esta es más
            grande, así que conviene revisar una lectura antes de publicar.
          </p>
        </div>
      )}
      {comunAnormal && (
        <div className="atencion">
          <p className="tipo-cuerpo-menor">
            Quedarían {fmt(c.comunReal)} m³ como área común: un {pctComun}% de la factura, que se reparte
            entre los siete.
          </p>
          <p className="tipo-contexto text-gris atencion-nota">
            El área común normal del edificio es de 2 a 4%. Un salto así suele ser una fuga en el caño común,
            o un dígito de más en el recibo. Revísalo antes de publicar.
          </p>
        </div>
      )}

      <p className="tipo-etiqueta-seccion text-gris revision-etiqueta">Las 7 cuotas</p>
      {DPTOS.map((d) => {
        const q = c.cuotas[d.id]
        return (
          <div key={d.id} className="revision-fila">
            <span className="tipo-numero-dpto w-columna-dpto">{d.id}</span>
            <span className="tipo-contexto-chico min-w-0 flex-1 truncate text-gris">
              {COPYS.mes.desglose(q.mantenimiento, q.agua)}
            </span>
            <span className="tipo-monto-lista">{fmt(q.total)}</span>
          </div>
        )
      })}

      <div className="revision-cuadre">
        <div className="revision-cuadre-fila">
          <span className="tipo-cuerpo-menor">{COPYS.cierre.loQuePagan}</span>
          <span className="tipo-mono-etiqueta">{fmt(c.sumaCuotas)}</span>
        </div>
        <div className="revision-cuadre-fila">
          <span className="tipo-cuerpo-menor">{COPYS.cierre.areaComun(fmt(c.comunReal))}</span>
          <span className="tipo-mono-etiqueta">{fmt(c.montoComun)}</span>
        </div>
        {c.totalCreditos > 0 && (
          <>
            <div className="revision-cuadre-fila">
              <span className="tipo-cuerpo-menor">{COPYS.cierre.creditosAplicados}</span>
              <span className="tipo-mono-etiqueta">{fmt(c.totalCreditos)}</span>
            </div>
            <p className="tipo-contexto text-gris revision-creditos-nota">{COPYS.cierre.creditosNota}</p>
          </>
        )}
        <div className="revision-cuadre-total">
          <span className="tipo-cuerpo-destacado-medio">{COPYS.cierre.totalDe(nombreMes)}</span>
          <span className="tipo-monto-destacado">{fmt(c.totalMes)}</span>
        </div>
      </div>

      <BotonAvanzar onClick={avanzar} bloqueadoPor={bloqueo} cargando={guardando}>
        {COPYS.cierre.todoCorrecto}
      </BotonAvanzar>
    </div>
  )
}
