import { Analytics } from '@vercel/analytics/next'
import { Cormorant_Garamond } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import AntiDevtools from '@/components/AntiDevtools'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000'),
)

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: 'Invitación de Boda | Javier Andrés & Maria Zolis',
    template: '%s | Javier & Maria',
  },
  description:
    'Invitación de boda de Javier Andrés & Maria Zolis. Sábado, 12 de septiembre de 2026.',
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Javier & Maria',
    locale: 'es_VE',
    title: 'Javier Andrés & Maria Zolis · Nos casamos',
    description:
      'Sábado, 12 de septiembre de 2026. Abre tu invitación y confirma tu asistencia.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Carta de invitación de Javier & Maria',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Javier Andrés & Maria Zolis · Nos casamos',
    description:
      'Sábado, 12 de septiembre de 2026. Abre tu invitación y confirma tu asistencia.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: [
      {
        url: '/favicon-96x96.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: 'favicon-96x96.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${cormorant.variable} antialiased bg-white`}
        suppressHydrationWarning={true}
      >
        <AntiDevtools />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
