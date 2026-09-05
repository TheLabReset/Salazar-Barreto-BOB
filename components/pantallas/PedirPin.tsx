'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { COPYS } from '@/lib/copys'

/**
 * La puerta de administración. `README` §7 y `06` §5.
 *
 * El PIN se valida **en el servidor**, con límite de intentos por IP. Un PIN
 * incorrecto **sacude el campo y lo limpia**: no hay mensaje de "no tienes
 * permiso", porque quien no tiene el PIN simplemente no entra y no hace falta
 * decírselo con un cartel.
 */
export function PedirPin() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [sacude, setSacude] = useState(false)
  const [bloqueado, setBloqueado] = useState<string | null>(null)

  const pulsar = async (tecla: string) => {
    if (bloqueado) return
    if (tecla === '←') return setPin(pin.slice(0, -1))
    const nuevo = (pin + tecla).slice(0, 4)
    setPin(nuevo)
    if (nuevo.length < 4) return

    const r = await fetch('/api/admin/pin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pin: nuevo }),
    })
    if (r.ok) {
      router.refresh()
      return
    }
    // 429: hay que decirlo, porque si no el usuario teclea a ciegas sin saber
    // por qué su PIN correcto no entra.
    if (r.status === 429) {
      const cuerpo = await r.json().catch(() => ({ error: 'Demasiados intentos.' }))
      setBloqueado(cuerpo.error as string)
      setPin('')
      return
    }
    setSacude(true)
    setTimeout(() => {
      setSacude(false)
      setPin('')
    }, 400)
  }

  return (
    <div className="pantalla scroll-limpio pin-pantalla">
      <div className="pin-barra">
        <Link href="/avisos" className="circulo-atras" aria-label="Volver">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
        </Link>
      </div>

      <div className="pin-cabecera">
        <h1 className="tipo-titulo-hoja pin-titulo">{COPYS.admin.pinTitulo}</h1>
        <p className="tipo-cuerpo-chico text-gris pin-texto">{COPYS.admin.pinTexto}</p>
      </div>

      <div className={`pin-puntos ${sacude ? 'pin-sacude' : ''}`} aria-live="polite" aria-label={`${pin.length} de 4 dígitos`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-punto ${i < pin.length ? 'pin-punto-lleno' : ''}`} />
        ))}
      </div>

      {bloqueado && <p className="tipo-cuerpo-menor text-ambar pin-bloqueado">{bloqueado}</p>}

      <div className="pin-rejilla">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'].map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => pulsar(k)}
              className={k === '←' ? 'pin-tecla pin-borrar' : 'pin-tecla'}
              aria-label={k === '←' ? 'Borrar' : k}
            >
              {k === '←' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <path d="M21 5H9L3 12l6 7h12z" />
                  <path d="M17 9l-5 6" />
                  <path d="M12 9l5 6" />
                </svg>
              ) : (
                k
              )}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
