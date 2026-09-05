import type { Metadata, Viewport } from 'next'
import { DM_Sans, JetBrains_Mono, Syne } from 'next/font/google'
import { COPYS } from '@/lib/copys'
import { Marco } from '@/components/Marco'
import { ProveedoresCliente } from './layout-cliente'
import { Hojas } from '@/components/hojas'
import { NavSiCorresponde } from '@/components/NavSiCorresponde'
import { SinConexion } from '@/components/SinConexion'
import { dptoElegido } from '@/lib/sesion'
import { COLOR_TEMA } from '@/lib/tema'
import './globals.css'

/**
 * Fuentes autoalojadas por Next. Sin `<link>` a Google Fonts: eso añade un
 * salto de red en el arranque, y esta app se abre desde el móvil en la calle.
 */
const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--fuente-syne',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
  variable: '--fuente-dm-sans',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--fuente-jetbrains-mono',
})

export const metadata: Metadata = {
  title: COPYS.app.nombre,
  description: COPYS.app.descripcion,
  applicationName: COPYS.app.nombreCorto,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: COPYS.app.nombreCorto,
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: COLOR_TEMA,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const dpto = await dptoElegido()
  return (
    <html lang="es-PE" className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body>
        <ProveedoresCliente>
          <Marco>
            <SinConexion />
            {children}
            <NavSiCorresponde hayDpto={dpto !== null} />
            <Hojas />
          </Marco>
        </ProveedoresCliente>
      </body>
    </html>
  )
}
