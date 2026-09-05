'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { COPYS } from '@/lib/copys'

/**
 * El aviso de que el teléfono está sin conexión, y el registro del service
 * worker. Fase 6, punto 2.
 *
 * Va junto porque son la misma promesa: la app abre sin señal **y lo dice**. Sin
 * el aviso, el service worker sería peor que no tenerlo — enseñaría números de
 * la semana pasada con toda la apariencia de ser los de hoy.
 *
 * El estado sale de `navigator.onLine` y de los eventos `online`/`offline`, que
 * es lo que el sistema operativo sabe de verdad. No se adivina desde un fetch
 * fallido: un 500 del servidor no es estar sin conexión, y confundirlos manda al
 * usuario a mirar su wifi cuando el problema es otro.
 */
export function SinConexion() {
  // Arranca en `null` —"todavía no se sabe"— y no en "conectado": en el
  // servidor no hay `navigator`, y pintar el aviso o no pintarlo antes de
  // saberlo daría un desajuste de hidratación.
  const [conectado, setConectado] = useState<boolean | null>(null)
  const ruta = usePathname()

  useEffect(() => {
    setConectado(navigator.onLine)
    const arriba = () => setConectado(true)
    const abajo = () => setConectado(false)
    window.addEventListener('online', arriba)
    window.addEventListener('offline', abajo)
    return () => {
      window.removeEventListener('online', arriba)
      window.removeEventListener('offline', abajo)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    // Sin `catch` esto revienta en un `iframe` con almacenamiento bloqueado y se
    // lleva por delante el resto de efectos del árbol.
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  if (conectado !== false) return null

  const enAdmin = ruta?.startsWith('/admin') ?? false
  return (
    <div className="sin-conexion" role="status" aria-live="polite">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="sin-conexion-icono"
      >
        <path d="M2 2l20 20M8.5 16.4a5 5 0 017 0M5 12.9a10 10 0 013.5-2.3M19 12.9a10 10 0 00-7.6-2.9M1.4 9.4A15 15 0 015 7M22.6 9.4A15 15 0 0013 5.2M12 20h.01" />
      </svg>
      <span className="tipo-contexto sin-conexion-texto">
        {enAdmin ? COPYS.desconectado.avisoAdmin : COPYS.desconectado.aviso}
      </span>
    </div>
  )
}
