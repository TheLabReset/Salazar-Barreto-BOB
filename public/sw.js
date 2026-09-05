/*
 * El service worker. Fase 6, punto 2.
 *
 * Regla que gobierna todo lo de aquí: **no inventar datos**. Sin conexión la app
 * abre y enseña lo último que se guardó en este teléfono, y lo dice. Lo que no
 * hace nunca es rellenar un hueco con datos de ejemplo, con ceros o con la
 * respuesta de otro mes. Si no hay nada guardado, la pantalla se queda vacía con
 * su mensaje, que es la respuesta correcta.
 *
 * Tres cachés, con vidas distintas:
 *  - `shell`   · el armazón: las seis pantallas y los iconos. Se llena al instalar.
 *  - `datos`   · la última respuesta GET de cada consulta de la API.
 *  - `estatico`· los ficheros con huella de Next (`/_next/static/...`), inmutables.
 *
 * Y una cosa que **no** hace: guardar escrituras. Un PUT o un POST sin conexión
 * falla, y falla a la vista. Encolar en silencio el cierre de un mes para
 * mandarlo "cuando vuelva la señal" es la clase de magia que acaba publicando
 * dos veces o publicando datos viejos encima de los nuevos.
 */

const VERSION = 'v1'
const SHELL = `shell-${VERSION}`
const DATOS = `datos-${VERSION}`
const ESTATICO = `estatico-${VERSION}`
const NUESTRAS = [SHELL, DATOS, ESTATICO]

/** Las seis pantallas de vecino más la de administración. */
const PANTALLAS = ['/', '/mes', '/mi-departamento', '/historial', '/avisos', '/admin']
const ICONOS = [
  '/iconos/icono-192.png',
  '/iconos/icono-512.png',
  '/iconos/apple-touch-icon.png',
  '/manifest.webmanifest',
]

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL)
      // `addAll` es todo o nada: si una sola pantalla falla, no se instala nada
      // y el usuario se queda sin caché **sin enterarse**. Una a una, y las que
      // entren, entran.
      await Promise.all(
        [...PANTALLAS, ...ICONOS].map(async (ruta) => {
          try {
            const r = await fetch(ruta, { cache: 'reload' })
            if (r.ok) await cache.put(ruta, r)
          } catch {
            // Sin red durante la instalación. Se llenará en la primera visita.
          }
        }),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    (async () => {
      const nombres = await caches.keys()
      await Promise.all(nombres.filter((n) => !NUESTRAS.includes(n)).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  )
})

/** Marca una respuesta que sale de la caché, con la fecha en que se guardó. */
function marcarComoGuardada(respuesta) {
  const cabeceras = new Headers(respuesta.headers)
  cabeceras.set('x-sb-desde-cache', 'si')
  return new Response(respuesta.body, {
    status: respuesta.status,
    statusText: respuesta.statusText,
    headers: cabeceras,
  })
}

self.addEventListener('fetch', (ev) => {
  const peticion = ev.request
  const url = new URL(peticion.url)

  // Solo lo nuestro y solo GET. Todo lo demás va a la red tal cual: las
  // escrituras no se tocan, ni para guardarlas ni para reintentarlas.
  if (peticion.method !== 'GET' || url.origin !== self.location.origin) return

  // Los ficheros con huella de Next no cambian nunca: caché primero y ya.
  if (url.pathname.startsWith('/_next/static/')) {
    ev.respondWith(
      (async () => {
        const guardado = await caches.match(peticion)
        if (guardado) return guardado
        const r = await fetch(peticion)
        if (r.ok) (await caches.open(ESTATICO)).put(peticion, r.clone())
        return r
      })(),
    )
    return
  }

  // La API: red primero, y si falla, lo último que se guardó, marcado.
  if (url.pathname.startsWith('/api/')) {
    // El PIN y el resembrado no se guardan jamás.
    if (url.pathname.startsWith('/api/admin/') || url.pathname.startsWith('/api/pruebas/')) return
    ev.respondWith(
      (async () => {
        try {
          const r = await fetch(peticion)
          if (r.ok) (await caches.open(DATOS)).put(peticion, r.clone())
          return r
        } catch (error) {
          const guardado = await caches.match(peticion)
          if (guardado) return marcarComoGuardada(guardado)
          throw error
        }
      })(),
    )
    return
  }

  // Navegaciones: red primero, y si falla, la pantalla guardada. Si tampoco hay
  // pantalla guardada, se deja que falle: el navegador enseña su error, que es
  // más honesto que una página nuestra fingiendo que la app funciona.
  if (peticion.mode === 'navigate') {
    ev.respondWith(
      (async () => {
        try {
          const r = await fetch(peticion)
          if (r.ok) (await caches.open(SHELL)).put(peticion, r.clone())
          return r
        } catch (error) {
          const guardado = (await caches.match(peticion)) ?? (await caches.match('/'))
          if (guardado) return marcarComoGuardada(guardado)
          throw error
        }
      })(),
    )
  }
})
